"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { showToast } from '@/components/Toast';
import { format } from 'date-fns';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Item = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string | null;
  lostDate: Date;
  status: string;
  imageUrl: string | null;
  contactInfo: string;
  createdAt: Date;
  reportedBy?: {
    name: string | null;
    email: string | null;
  };
};

type MatchCandidate = {
  item: {
    id: string;
    title: string;
    description: string;
    category: string;
    location: string;
    foundDate: Date;
    imageUrl: string | null;
    contactInfo: string;
    reportedBy?: {
      name: string | null;
      email: string | null;
    };
    // Student who turned in the item
    turnedInByName?: string | null;
    turnedInByStudentNumber?: string | null;
    turnedInByContact?: string | null;
    turnedInByDepartment?: string | null;
  };
  score: number;
  breakdown: {
    categoryMatch: number;
    titleSimilarity: number;
    descriptionSimilarity: number;
    dateProximity: number;
    locationMatch: number;
  };
};

export default function AdminItemsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user || session.user.role !== 'ADMIN') {
      router.push('/login?error=unauthorized');
    }
  }, [session, status, router]);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [matchCandidates, setMatchCandidates] = useState<MatchCandidate[]>([]);
  const [matchingFor, setMatchingFor] = useState<string | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [compareView, setCompareView] = useState<{ lost: Item; found: MatchCandidate } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 5;
  const [activeHandoffs, setActiveHandoffs] = useState<any[]>([]);
  
  // Match modal state (like found items page)
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedLostItem, setSelectedLostItem] = useState<Item | null>(null);
  const [modalCompareView, setModalCompareView] = useState<MatchCandidate | null>(null);

  function exportToCSV() {
    const headers = ['ID','Title','Description','Category','Location','LostDate','Status','Contact','CreatedAt','ReporterName','ReporterEmail'];
    const rows = items.map((i) => [
      i.id,
      i.title,
      (i.description || '').replace(/\n/g,' '),
      i.category,
      i.location || '',
      i.lostDate ? new Date(i.lostDate).toISOString() : '',
      i.status,
      i.contactInfo || '',
      new Date(i.createdAt).toISOString(),
      i.reportedBy?.name || '',
      i.reportedBy?.email || '',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g,'""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lost-items-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function loadItems() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      
      const res = await fetch(`/api/admin/items/lost?${params.toString()}`);
      const data = await res.json();
      
      if (data.success) {
        setItems(data.data.items);
        if (data.data.pagination) {
          setTotalPages(data.data.pagination.totalPages);
          setTotalItems(data.data.pagination.total);
        }
      } else {
        showToast(data.error || 'Failed to load items', 'error');
      }
    } catch {
      showToast('Failed to load items', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadActiveHandoffs() {
    try {
      const res = await fetch('/api/admin/handoff/active');
      const data = await res.json();
      if (data.success) {
        setActiveHandoffs(data.data);
      }
    } catch {
      // Silently fail - this is not critical
    }
  }

  useEffect(() => {
    // Reset to page 1 when filters change
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      loadItems();
    }
    loadActiveHandoffs();
  }, [searchTerm, statusFilter, categoryFilter]);

  useEffect(() => {
    loadItems();
  }, [currentPage]);

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      // Use admin actions API to ensure activity logging
      const res = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', itemId: id, itemType: 'LOST' }),
      });
      const data = await res.json();

      if (data.success) {
        setItems(items.filter(i => i.id !== id));
        showToast('Item deleted successfully', 'success');
      } else {
        showToast(data.error || 'Failed to delete item', 'error');
      }
    } catch {
      showToast('Failed to delete item', 'error');
    }
  }

  async function handleAction(action: string, id: string, matchWithId?: string) {
    try {
      const res = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, itemId: id, matchWithId }),
      });

      const data = await res.json();

      if (data.success) {
        showToast(data.data.message, 'success');
        if (action === 'handoff' && data.data?.handoffSessionId) {
          const shareUrl = `${location.origin}/handoff/${data.data.handoffSessionId}`;
          const adminUrl = `${location.origin}/admin/handoff/${data.data.handoffSessionId}`;
          try {
            await navigator.clipboard.writeText(shareUrl);
            showToast('Shareable handoff link copied to clipboard', 'success');
          } catch {}
          if (confirm('Open the Admin Handoff Console?')) {
            window.open(adminUrl, '_blank');
          }
        }
        if (action === 'match') {
          setMatchingFor(null);
          setCompareView(null);
        }
        // Optimistic local update to avoid list flash and meet UX: hide donated/disposed from Manage list
        if (action === 'donate') {
          setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'DONATED' } : i)));
          // No reload needed; disposition dashboard will show via its own API
        } else if (action === 'dispose') {
          setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'DISPOSED' } : i)));
        } else {
          // For other actions, refresh from server to keep data in sync
          loadItems();
        }
      } else {
        showToast(data.error || 'Action failed', 'error');
      }
    } catch {
      showToast('Action failed', 'error');
    }
  }

  async function openMatchModal(id: string) {
    const lostItem = items.find(item => item.id === id);
    if (!lostItem) return;

    setSelectedLostItem(lostItem);
    setLoadingMatches(true);
    setShowMatchModal(true);
    setMatchCandidates([]); // Clear previous matches
    
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'lost', id }),
      });

      const data = await res.json();

      if (data.success) {
        // API may return { matches, candidateCount } for debugging or raw array for legacy.
        const matches = Array.isArray(data.data) ? data.data : data.data.matches || [];
        const candidateCount = Array.isArray(data.data) ? matches.length : data.data.candidateCount ?? matches.length;
        setMatchCandidates(matches);
        if (matches.length === 0) {
          showToast(candidateCount === 0 ? 'No pending candidates available to check' : 'No potential matches found', 'info');
        } else {
          showToast(`Found ${matches.length} potential match${matches.length > 1 ? 'es' : ''}`, 'success');
        }
      } else {
        showToast(data.error || 'Failed to find matches', 'error');
        setMatchCandidates([]);
      }
    } catch {
      showToast('Failed to find matches', 'error');
      setMatchCandidates([]);
    } finally {
      setLoadingMatches(false);
    }
  }

  async function refreshMatches() {
    if (!matchingFor) return;
    setLoadingMatches(true);
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'lost', id: matchingFor }),
      });

      const data = await res.json();

      if (data.success) {
        const matches = Array.isArray(data.data) ? data.data : data.data.matches || [];
        const candidateCount = Array.isArray(data.data) ? matches.length : data.data.candidateCount ?? matches.length;
        setMatchCandidates(matches);
        showToast('Matches refreshed', 'success');
        if (matches.length === 0) {
          showToast(candidateCount === 0 ? 'No pending candidates available to check' : 'No potential matches found', 'info');
        }
      } else {
        showToast(data.error || 'Failed to refresh matches', 'error');
      }
    } catch {
      showToast('Failed to refresh matches', 'error');
    } finally {
      setLoadingMatches(false);
    }
  }

  function openCompareView(candidate: MatchCandidate) {
    const lostItem = items.find(i => i.id === matchingFor);
    if (lostItem) {
      setCompareView({ lost: lostItem, found: candidate });
    }
  }

  async function handleDeclineMatch(lostItemId: string, foundItemId: string) {
    try {
      const res = await fetch('/api/admin/match/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lostItemId, foundItemId }),
      });
      const data = await res.json();
      if (data.success) {
        // Remove this candidate from the match list
        setMatchCandidates(prev => prev.filter(c => c.item.id !== foundItemId));
        showToast('Match declined successfully', 'success');
      } else {
        showToast(data.error || 'Failed to decline match', 'error');
      }
    } catch {
      showToast('Failed to decline match', 'error');
    }
  }

  async function handleCreateMatchFromModal(foundItemId: string) {
    if (!selectedLostItem) return;

    try {
      const res = await fetch('/api/admin/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lostItemId: selectedLostItem.id,
          foundItemId,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showToast('Items matched successfully!', 'success');
        setShowMatchModal(false);
        loadItems(); // Refresh the list
      } else {
        showToast(data.error || 'Failed to match items', 'error');
      }
    } catch {
      showToast('Failed to match items', 'error');
    }
  }

  function openCompareViewFromModal(candidate: MatchCandidate) {
    // Show comparison view within the same modal
    setModalCompareView(candidate);
  }

  // Note: Filters are for display only and don't affect pagination
  // For proper filtering with pagination, filters should be passed to the API
  // Currently showing items as returned by the API

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <Link 
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Manage Lost Items</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Review and manage all reported lost items</p>
        </div>

        {/* Active Handoffs Banner */}
        {activeHandoffs.length > 0 && (
          <div className="mb-6 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                  Active Handoffs ({activeHandoffs.length})
                </h3>
              </div>
              <button
                onClick={loadActiveHandoffs}
                className="text-sm text-purple-700 dark:text-purple-300 hover:underline"
              >
                Refresh
              </button>
            </div>
            <div className="space-y-2">
              {activeHandoffs.map((handoff: any) => (
                <div key={handoff.id} className="bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {handoff.lostItem?.title} ↔ {handoff.foundItem?.title}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {handoff.ownerVerifiedAdmin && !handoff.adminVerifiedOwner && '⏳ Waiting for you to verify owner code'}
                      {!handoff.ownerVerifiedAdmin && handoff.adminVerifiedOwner && '⏳ Waiting for owner to verify your code'}
                      {!handoff.ownerVerifiedAdmin && !handoff.adminVerifiedOwner && '⏳ Waiting for both parties'}
                    </div>
                  </div>
                  <Link
                    href={`/admin/handoff/${handoff.id}`}
                    className="ml-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Resume Handoff
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters - Compact Design */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm mb-6 border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</h2>
              <button
                onClick={exportToCSV}
                className="px-3 py-1.5 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors text-xs font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Search items..."
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="MATCHED">Matched</option>
                <option value="CLAIMED">Claimed</option>
                <option value="ARCHIVED">Archived</option>
                <option value="RESOLVED">Resolved</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Categories</option>
                <option value="electronics">Electronics</option>
                <option value="clothing">Clothing</option>
                <option value="accessories">Accessories</option>
                <option value="documents">Documents</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items List - Modern Card Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-16 text-center">
            <div className="text-7xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No items found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No lost items have been reported yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group">
                <div className="flex flex-col md:flex-row">
                  {/* Image Section */}
                  {item.imageUrl && (
                    <div className="relative w-full md:w-48 h-48 flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 192px"
                        className="object-cover"
                      />
                      <div className="absolute top-3 right-3">
                        <span
                          className={`px-3 py-1.5 text-xs font-semibold rounded-full shadow-lg backdrop-blur-sm ${
                            item.status === 'PENDING'
                              ? 'bg-yellow-500/90 text-white'
                              : item.status === 'MATCHED'
                              ? 'bg-blue-500/90 text-white'
                              : item.status === 'CLAIMED'
                              ? 'bg-green-500/90 text-white'
                              : item.status === 'RESOLVED'
                              ? 'bg-purple-500/90 text-white'
                              : item.status === 'DONATED'
                              ? 'bg-teal-500/90 text-white'
                              : item.status === 'DISPOSED'
                              ? 'bg-red-500/90 text-white'
                              : 'bg-gray-500/90 text-white'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Content Section */}
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{item.description}</p>
                      </div>
                      {!item.imageUrl && (
                        <span
                          className={`px-3 py-1.5 text-xs font-semibold rounded-full ml-4 flex-shrink-0 ${
                            item.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : item.status === 'MATCHED'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : item.status === 'CLAIMED'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : item.status === 'RESOLVED'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                              : item.status === 'DONATED'
                              ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
                              : item.status === 'DISPOSED'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>
                    
                    {/* Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span className="text-gray-900 dark:text-gray-100 font-medium capitalize">{item.category}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300">{item.location || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300">{format(new Date(item.lostDate), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300 truncate">{item.reportedBy?.name || item.reportedBy?.email || 'Anonymous'}</span>
                      </div>
                    </div>

                    {/* Reporter Contact Information */}
                    {(item.reportedBy?.email || item.contactInfo) && (
                      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">Reporter Contact Information</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          {item.reportedBy?.name && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Name:</span>
                              <span className="text-gray-900 dark:text-gray-100">{item.reportedBy.name}</span>
                            </div>
                          )}
                          {item.reportedBy?.email && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Email:</span>
                              <span className="text-gray-900 dark:text-gray-100">{item.reportedBy.email}</span>
                            </div>
                          )}
                          {item.contactInfo && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Phone:</span>
                              <span className="text-gray-900 dark:text-gray-100">{item.contactInfo}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openMatchModal(item.id)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-sm font-medium shadow-sm hover:shadow flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Find Matches
                      </button>
                      <button
                        onClick={() => handleAction('claim', item.id)}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Claimed
                      </button>
                      {item.status === 'MATCHED' && (
                        <button
                          onClick={() => handleAction('handoff', item.id)}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          Start Handoff
                        </button>
                      )}
                      
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && items.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing page {currentPage} of {totalPages} ({totalItems} total items)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              {/* Page Numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                const showPage = page === 1 || 
                                page === totalPages || 
                                Math.abs(page - currentPage) <= 1;
                
                // Show ellipsis for skipped pages
                if (!showPage) {
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="px-2 text-gray-400">...</span>;
                  }
                  return null;
                }
                
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Last
              </button>
            </div>
          </div>
        )}

        {/* Match Modal */}
        {matchingFor && !compareView && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Potential Matches</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Showing best matching found items</p>
                  </div>
                  <button
                    onClick={refreshMatches}
                    disabled={loadingMatches}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                    title="Refresh matches"
                  >
                    <svg className={`w-4 h-4 ${loadingMatches ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {loadingMatches ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Searching for matches...</p>
                  </div>
                ) : matchCandidates.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <p className="text-gray-600 dark:text-gray-400">No matching items found</p>
                    <button
                      onClick={refreshMatches}
                      className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matchCandidates.map((candidate) => (
                      <div key={candidate.item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex gap-4">
                          {candidate.item.imageUrl && (
                            <div className="relative w-24 h-24 flex-shrink-0">
                              <Image
                                src={candidate.item.imageUrl}
                                alt={candidate.item.title}
                                fill
                                sizes="96px"
                                className="object-cover rounded-lg"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{candidate.item.title}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{candidate.item.description}</p>
                              </div>
                              <div className="text-right ml-4 flex-shrink-0">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{candidate.score.toFixed(1)}%</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Match Score</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3">
                              <div>Category: <span className="capitalize">{candidate.item.category}</span></div>
                              <div>Location: {candidate.item.location}</div>
                              <div>Contact: {candidate.item.contactInfo}</div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs mb-3">
                              {Object.entries(candidate.breakdown).map(([key, value]) => (
                                <span key={key} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}: {value.toFixed(1)}
                                </span>
                              ))}
                            </div>
                            <button
                              onClick={() => openCompareView(candidate)}
                              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              View Comparison
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setMatchingFor(null)}
                  className="w-full px-6 py-3 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Side-by-Side Comparison Modal */}
        {compareView && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
            <div className="bg-white border border-gray-200 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Side-by-Side Comparison</h2>
                    <p className="text-gray-600 mt-1">Match Score: <span className="font-bold text-blue-600">{compareView.found.score}%</span></p>
                  </div>
                  <button
                    onClick={() => setCompareView(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lost Item */}
                  <div className="border-2 border-blue-500 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <span className="text-2xl mr-2">📢</span>
                      <h3 className="text-xl font-bold text-blue-600">Lost Item</h3>
                    </div>
                    {compareView.lost.imageUrl && (
                      <div className="relative w-full h-48 rounded-lg mb-4 overflow-hidden">
                        <Image
                          src={compareView.lost.imageUrl}
                          alt={compareView.lost.title}
                          fill
                          sizes="(min-width: 768px) 50vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Title:</label>
                        <p className="text-gray-900">{compareView.lost.title}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Description:</label>
                        <p className="text-gray-900">{compareView.lost.description}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Category:</label>
                        <p className="text-gray-900 capitalize">{compareView.lost.category}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Location:</label>
                        <p className="text-gray-900">{compareView.lost.location || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Date:</label>
                        <p className="text-gray-900">{format(new Date(compareView.lost.lostDate), 'MMM dd, yyyy')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Reported by:</label>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <p className="text-gray-900 font-medium">{compareView.lost.contactInfo}</p>
                        </div>
                      </div>
                      {compareView.lost.reportedBy && (
                        <div className="pt-3 mt-3 border-t border-blue-200">
                          <label className="text-sm font-semibold text-gray-700">User Account:</label>
                          <p className="text-gray-900">
                            {compareView.lost.reportedBy.name || 'Anonymous'}
                          </p>
                          {compareView.lost.reportedBy.email && (
                            <p className="text-sm text-gray-600">{compareView.lost.reportedBy.email}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Found Item */}
                  <div className="border-2 border-green-500 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <span className="text-2xl mr-2">✨</span>
                      <h3 className="text-xl font-bold text-green-600">Found Item</h3>
                    </div>
                    {compareView.found.item.imageUrl && (
                      <div className="relative w-full h-48 rounded-lg mb-4 overflow-hidden">
                        <Image
                          src={compareView.found.item.imageUrl}
                          alt={compareView.found.item.title}
                          fill
                          sizes="(min-width: 768px) 50vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Title:</label>
                        <p className="text-gray-900">{compareView.found.item.title}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Description:</label>
                        <p className="text-gray-900">{compareView.found.item.description}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Category:</label>
                        <p className="text-gray-900 capitalize">{compareView.found.item.category}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Location:</label>
                        <p className="text-gray-900">{compareView.found.item.location}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Date Found:</label>
                        <p className="text-gray-900">{format(new Date(compareView.found.item.foundDate), 'MMM dd, yyyy')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Reported by:</label>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <p className="text-gray-900 font-medium">{compareView.found.item.contactInfo}</p>
                        </div>
                      </div>
                      {compareView.found.item.reportedBy && (
                        <div className="pt-3 mt-3 border-t border-green-200">
                          <label className="text-sm font-semibold text-gray-700">User Account:</label>
                          <p className="text-gray-900">
                            {compareView.found.item.reportedBy.name || 'Anonymous'}
                          </p>
                          {compareView.found.item.reportedBy.email && (
                            <p className="text-sm text-gray-600">{compareView.found.item.reportedBy.email}</p>
                          )}
                        </div>
                      )}
                      {/* Student Turnin Information */}
                      {(compareView.found.item.turnedInByName || compareView.found.item.turnedInByStudentNumber || compareView.found.item.turnedInByContact || compareView.found.item.turnedInByDepartment) && (
                        <div className="pt-3 mt-3 border-t border-purple-200">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <label className="text-sm font-semibold text-purple-900">Student Who Turned In:</label>
                          </div>
                          <div className="space-y-1 text-sm">
                            {compareView.found.item.turnedInByName && (
                              <p className="text-gray-900">
                                <span className="font-medium">Name:</span> {compareView.found.item.turnedInByName}
                              </p>
                            )}
                            {compareView.found.item.turnedInByStudentNumber && (
                              <p className="text-gray-900">
                                <span className="font-medium">Student #:</span> {compareView.found.item.turnedInByStudentNumber}
                              </p>
                            )}
                            {compareView.found.item.turnedInByContact && (
                              <p className="text-gray-900">
                                <span className="font-medium">Contact:</span> {compareView.found.item.turnedInByContact}
                              </p>
                            )}
                            {compareView.found.item.turnedInByDepartment && (
                              <p className="text-gray-900">
                                <span className="font-medium">Dept/Course:</span> {compareView.found.item.turnedInByDepartment}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Match Breakdown */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Match Score Breakdown</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Object.entries(compareView.found.breakdown).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{value.toFixed(1)}</div>
                        <div className="text-xs text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200">
                <div className="flex flex-col gap-3">
                  {/* Primary Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleAction('match', matchingFor!, compareView.found.item.id)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Confirm Match
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to decline this match? It will be permanently removed from future suggestions.')) {
                          handleDeclineMatch(matchingFor!, compareView.found.item.id);
                        }
                      }}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Decline Match
                    </button>
                  </div>

                  {/* Secondary Actions */}
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => setCompareView(null)}
                      className="px-4 py-2 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Match Modal - Beautiful UI like Found Items */}
        {showMatchModal && selectedLostItem && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {modalCompareView && (
                    <button
                      onClick={() => setModalCompareView(null)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors mr-2"
                      title="Back to matches"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </button>
                  )}
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {modalCompareView ? 'Side-by-Side Comparison' : 'Find Matches for Lost Item'}
                    </h2>
                    <p className="text-blue-100 text-sm mt-0.5">
                      {modalCompareView ? `Match Score: ${modalCompareView.score.toFixed(1)}%` : 'Showing potential found items that match'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowMatchModal(false);
                    setModalCompareView(null);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                {/* Comparison View */}
                {modalCompareView ? (
                  <div className="p-6">
                    {/* Match Score Summary */}
                    <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Overall Match Score</h3>
                          <div className="flex items-center gap-4">
                            <div className={`text-5xl font-bold ${
                              modalCompareView.score >= 70 ? 'text-green-600' :
                              modalCompareView.score >= 50 ? 'text-yellow-600' :
                              'text-orange-600'
                            }`}>
                              {modalCompareView.score.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Category</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{modalCompareView.breakdown.categoryMatch}%</div>
                          </div>
                          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Title</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{modalCompareView.breakdown.titleSimilarity}%</div>
                          </div>
                          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Description</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{modalCompareView.breakdown.descriptionSimilarity}%</div>
                          </div>
                          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Location</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{modalCompareView.breakdown.locationMatch}%</div>
                          </div>
                          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center col-span-2">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Date Proximity</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{modalCompareView.breakdown.dateProximity}%</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Side-by-Side Comparison */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Lost Item */}
                      <div className="bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-800 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 bg-red-600 rounded-lg">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-bold text-red-900 dark:text-red-100">Lost Item</h3>
                        </div>
                        {selectedLostItem && (
                          <div className="space-y-4">
                            {/* Lost Item Image */}
                            {selectedLostItem.imageUrl && (
                              <div>
                                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Image</p>
                                <div className="relative w-full h-48 bg-white dark:bg-gray-800 rounded-lg overflow-hidden border-2 border-red-200 dark:border-red-700">
                                  <img
                                    src={selectedLostItem.imageUrl}
                                    alt={selectedLostItem.title}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Title</p>
                              <p className="text-base text-red-900 dark:text-red-100 font-semibold">{selectedLostItem.title}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Category</p>
                              <p className="text-base text-red-900 dark:text-red-100 capitalize">{selectedLostItem.category}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Description</p>
                              <p className="text-sm text-red-900 dark:text-red-100">{selectedLostItem.description}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Location</p>
                              <p className="text-base text-red-900 dark:text-red-100">{selectedLostItem.location || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Date Lost</p>
                              <p className="text-base text-red-900 dark:text-red-100">{format(new Date(selectedLostItem.lostDate), 'MMM dd, yyyy')}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Reported By</p>
                              <p className="text-base text-red-900 dark:text-red-100">{selectedLostItem.reportedBy?.name || 'N/A'}</p>
                              <p className="text-sm text-red-800 dark:text-red-200">{selectedLostItem.reportedBy?.email || ''}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Found Item */}
                      <div className="bg-green-50 dark:bg-green-900/10 border-2 border-green-200 dark:border-green-800 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 bg-green-600 rounded-lg">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-bold text-green-900 dark:text-green-100">Found Item</h3>
                        </div>
                        <div className="space-y-4">
                          {/* Found Item Image */}
                          {modalCompareView.item.imageUrl && (
                            <div>
                              <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">Image</p>
                              <div className="relative w-full h-48 bg-white dark:bg-gray-800 rounded-lg overflow-hidden border-2 border-green-200 dark:border-green-700">
                                <img
                                  src={modalCompareView.item.imageUrl}
                                  alt={modalCompareView.item.title}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">Title</p>
                            <p className="text-base text-green-900 dark:text-green-100 font-semibold">{modalCompareView.item.title}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">Category</p>
                            <p className="text-base text-green-900 dark:text-green-100 capitalize">{modalCompareView.item.category}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">Description</p>
                            <p className="text-sm text-green-900 dark:text-green-100">{modalCompareView.item.description}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">Location</p>
                            <p className="text-base text-green-900 dark:text-green-100">{modalCompareView.item.location || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">Date Found</p>
                            <p className="text-base text-green-900 dark:text-green-100">{format(new Date(modalCompareView.item.foundDate), 'MMM dd, yyyy')}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">Turned In By</p>
                            <p className="text-base text-green-900 dark:text-green-100">{modalCompareView.item.turnedInByName || 'N/A'}</p>
                            {modalCompareView.item.turnedInByStudentNumber && (
                              <p className="text-sm text-green-800 dark:text-green-200">Student #: {modalCompareView.item.turnedInByStudentNumber}</p>
                            )}
                            {modalCompareView.item.turnedInByContact && (
                              <p className="text-sm text-green-800 dark:text-green-200">Contact: {modalCompareView.item.turnedInByContact}</p>
                            )}
                            {modalCompareView.item.turnedInByDepartment && (
                              <p className="text-sm text-green-800 dark:text-green-200">Department: {modalCompareView.item.turnedInByDepartment}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 flex justify-center gap-3">
                      <button
                        onClick={() => handleCreateMatchFromModal(modalCompareView.item.id)}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Create Match
                      </button>
                      <button
                        onClick={() => {
                          if (selectedLostItem) {
                            handleDeclineMatch(selectedLostItem.id, modalCompareView.item.id);
                          }
                        }}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Decline Match
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                {/* Current Lost Item */}
                <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 border-b-2 border-red-200 dark:border-red-800 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-red-600 rounded-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-red-900 dark:text-red-100">Lost Item</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-1">Title</p>
                      <p className="text-base font-semibold text-red-900 dark:text-red-100">{selectedLostItem.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-1">Category</p>
                      <p className="text-base font-semibold text-red-900 dark:text-red-100 capitalize">{selectedLostItem.category}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-1">Description</p>
                      <p className="text-sm text-red-900 dark:text-red-100">{selectedLostItem.description}</p>
                    </div>
                    {selectedLostItem.location && (
                      <div>
                        <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-1">Last Seen Location</p>
                        <p className="text-base font-semibold text-red-900 dark:text-red-100">{selectedLostItem.location}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-1">Date Lost</p>
                      <p className="text-base font-semibold text-red-900 dark:text-red-100">{format(new Date(selectedLostItem.lostDate), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                </div>

                {/* Loading State */}
                {loadingMatches && (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Searching for matching found items...</p>
                  </div>
                )}

                {/* No Matches */}
                {!loadingMatches && matchCandidates.length === 0 && (
                  <div className="p-12 text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Matches Found</h3>
                    <p className="text-gray-600 dark:text-gray-400">No potential found items match this lost item yet.</p>
                  </div>
                )}

                {/* Match Results */}
                {!loadingMatches && matchCandidates.length > 0 && (
                  <div className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        Found {matchCandidates.length} Potential Match{matchCandidates.length > 1 ? 'es' : ''}
                      </h3>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Sorted by match score
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {matchCandidates.map((candidate) => (
                        <div
                          key={candidate.item.id}
                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-lg transition-shadow"
                        >
                          <div className="flex items-start gap-4">
                            {/* Match Score Badge */}
                            <div className="flex-shrink-0">
                              <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center font-bold text-white ${
                                candidate.score >= 70 ? 'bg-green-600' :
                                candidate.score >= 50 ? 'bg-yellow-600' :
                                'bg-orange-600'
                              }`}>
                                <div className="text-2xl">{candidate.score.toFixed(0)}%</div>
                                <div className="text-xs opacity-90">Match</div>
                              </div>
                            </div>

                            {/* Item Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div>
                                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    {candidate.item.title}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                    {candidate.item.description}
                                  </p>
                                </div>
                              </div>

                              {/* Match Breakdown */}
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
                                  <div className="text-xs text-gray-600 dark:text-gray-400">Category</div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{candidate.breakdown.categoryMatch}%</div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
                                  <div className="text-xs text-gray-600 dark:text-gray-400">Title</div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{candidate.breakdown.titleSimilarity}%</div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
                                  <div className="text-xs text-gray-600 dark:text-gray-400">Description</div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{candidate.breakdown.descriptionSimilarity}%</div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
                                  <div className="text-xs text-gray-600 dark:text-gray-400">Location</div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{candidate.breakdown.locationMatch}%</div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
                                  <div className="text-xs text-gray-600 dark:text-gray-400">Date</div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{candidate.breakdown.dateProximity}%</div>
                                </div>
                              </div>

                              {/* Item Metadata */}
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                  </svg>
                                  <span className="text-gray-600 dark:text-gray-400 capitalize">{candidate.item.category}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <span className="text-gray-600 dark:text-gray-400">{candidate.item.location}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="text-gray-600 dark:text-gray-400">{format(new Date(candidate.item.foundDate), 'MMM dd, yyyy')}</span>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleCreateMatchFromModal(candidate.item.id)}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Create Match
                                </button>
                                <button
                                  onClick={() => {
                                    if (selectedLostItem) {
                                      handleDeclineMatch(selectedLostItem.id, candidate.item.id);
                                    }
                                  }}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Decline
                                </button>
                                <button
                                  onClick={() => openCompareViewFromModal(candidate)}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View Comparison
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                </>
              )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

