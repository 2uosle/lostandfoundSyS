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

  function exportToCSV() {
    const headers = ['ID','Title','Description','Category','Location','LostDate','Status','Contact','CreatedAt','ReporterName','ReporterEmail'];
    const rows = filteredItems.map((i) => [
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
      const res = await fetch('/api/admin/items/lost');
      const data = await res.json();
      
      if (data.success) {
        setItems(data.data.items);
      } else {
        showToast(data.error || 'Failed to load items', 'error');
      }
    } catch {
      showToast('Failed to load items', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
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
    setMatchingFor(id);
    setLoadingMatches(true);
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
        }
      } else {
        showToast(data.error || 'Failed to find matches', 'error');
        setMatchingFor(null);
      }
    } catch {
      showToast('Failed to find matches', 'error');
      setMatchingFor(null);
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

  // Filter items - exclude RESOLVED and (by default) DONATED/DISPOSED from Manage Lost Items
  const filteredItems = items.filter(item => {
    // Don't show RESOLVED items in Manage Lost Items (they go to Activity History)
    if (item.status === 'RESOLVED') return false;
    // Hide DONATED/DISPOSED by default; they belong to Disposition dashboard
    if ((item.status === 'DONATED' || item.status === 'DISPOSED') && statusFilter === 'all') return false;
    
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

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

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm mb-6 border border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title or description..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="LOST">Lost</option>
                <option value="IN_STORAGE">In Storage</option>
                <option value="PENDING">Pending</option>
                <option value="MATCHED">Matched</option>
                <option value="CLAIMED">Claimed</option>
                <option value="DONATED">Donated</option>
                <option value="DISPOSED">Disposed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="electronics">Electronics</option>
                <option value="clothing">Clothing</option>
                <option value="accessories">Accessories</option>
                <option value="documents">Documents</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={exportToCSV}
                className="w-full md:w-auto px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium"
                title="Export current list to CSV"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Items List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No items found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No lost items have been reported yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="flex gap-6">
                  {item.imageUrl && (
                    <div className="relative w-32 h-32 flex-shrink-0">
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        sizes="128px"
                        className="object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full flex-shrink-0 ml-4 ${
                          item.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : item.status === 'MATCHED'
                            ? 'bg-blue-100 text-blue-800'
                            : item.status === 'CLAIMED'
                            ? 'bg-green-100 text-green-800'
                            : item.status === 'RESOLVED'
                            ? 'bg-purple-100 text-purple-800'
                             : item.status === 'DONATED'
                             ? 'bg-teal-100 text-teal-800'
                             : item.status === 'DISPOSED'
                             ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Category:</span>
                        <span className="ml-2 capitalize">{item.category}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Location:</span>
                        <span className="ml-2">{item.location || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Date:</span>
                        <span className="ml-2">{format(new Date(item.lostDate), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">Reported by:</span>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="ml-1 font-medium text-blue-700">{item.contactInfo}</span>
                        </div>
                      </div>
                    </div>
                    {item.reportedBy && (
                      <p className="text-xs text-gray-500 mb-4">
                        User: {item.reportedBy.name || item.reportedBy.email || 'Anonymous'}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openMatchModal(item.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Find Matches
                      </button>
                      <button
                        onClick={() => handleAction('claim', item.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Mark as Claimed
                      </button>
                      <button
                        onClick={() => handleAction('archive', item.id)}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                      >
                        Archive
                      </button>
                       <button
                         onClick={() => handleAction('donate', item.id)}
                         className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                       >
                         Mark as Donated
                       </button>
                       <button
                         onClick={() => handleAction('dispose', item.id)}
                         className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                       >
                         Mark as Disposed
                       </button>
                      {item.status === 'MATCHED' && (
                        <button
                          onClick={() => handleAction('handoff', item.id)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                          title="Approve for handoff and generate mutual PINs"
                        >
                          Start Handoff
                        </button>
                      )}
                      {item.status === 'ARCHIVED' && (
                        <button
                          onClick={() => handleAction('restore', item.id)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                        >
                          Restore
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
                        if (confirm('Are you sure you want to decline this match? It will be removed from the suggestions.')) {
                          // Remove this candidate from the match list
                          setMatchCandidates(prev => prev.filter(c => c.item.id !== compareView.found.item.id));
                          setCompareView(null);
                          showToast('Match declined and removed from suggestions', 'info');
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
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        if (confirm('Archive this lost item? You can still restore it later.')) {
                          handleAction('archive', matchingFor!);
                        }
                      }}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      Archive Lost Item
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this lost item? This action cannot be undone.')) {
                          handleDelete(matchingFor!);
                          setCompareView(null);
                        }
                      }}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Lost Item
                    </button>
                    <button
                      onClick={() => setCompareView(null)}
                      className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back to Matches
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

