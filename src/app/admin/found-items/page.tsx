"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { showToast } from '@/components/Toast';
import { format } from 'date-fns';

type FoundItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string | null;
  foundDate: Date;
  status: string;
  imageUrl: string | null;
  contactInfo: string;
  createdAt: Date;
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

type LostItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string | null;
  lostDate: Date;
  status: string;
  imageUrl: string | null;
  score: number;
  reportedBy?: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
};

export default function AdminFoundItemsPage() {
  const [items, setItems] = useState<FoundItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 5;

  // Match modal state
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchingLostItems, setMatchingLostItems] = useState<LostItem[]>([]);
  const [selectedFoundItem, setSelectedFoundItem] = useState<FoundItem | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(false);

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
      
      const res = await fetch(`/api/admin/items/found?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data.items || data.data);
        if (data.data.pagination) {
          setTotalPages(data.data.pagination.totalPages);
          setTotalItems(data.data.pagination.total);
        }
      } else {
        showToast(data.error || 'Failed to load found items', 'error');
      }
    } catch (e) {
      showToast('Failed to load found items', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Reset to page 1 when filters change
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      loadItems();
    }
  }, [searchTerm, statusFilter, categoryFilter]);

  useEffect(() => {
    loadItems();
  }, [currentPage]);

  async function openMatchModal(id: string) {
    const foundItem = items.find(item => item.id === id);
    if (!foundItem) return;

    setSelectedFoundItem(foundItem);
    setLoadingMatches(true);
    setShowMatchModal(true);

    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'found', id }),
      });
      const data = await res.json();
      console.log('Match API response:', data); // Debug log
      if (data.success) {
        const rawMatches = Array.isArray(data.data) ? data.data : data.data.matches || [];
        console.log('Parsed matches:', rawMatches); // Debug log
        console.log('First match details:', JSON.stringify(rawMatches[0], null, 2)); // Debug log
        
        // Extract items - the API returns {item, score, breakdown} structure
        const matches = rawMatches.map((match: any) => ({
          ...match.item,
          score: match.score,
          breakdown: match.breakdown
        }));
        
        setMatchingLostItems(matches);
        if (matches.length === 0) {
          showToast('No matching lost items found', 'info');
        } else {
          showToast(`Found ${matches.length} potential match${matches.length > 1 ? 'es' : ''}`, 'success');
        }
      } else {
        showToast(data.error || 'Failed to find matches', 'error');
        setMatchingLostItems([]);
      }
    } catch (e) {
      console.error('Match error:', e); // Debug log
      showToast('Failed to find matches', 'error');
      setMatchingLostItems([]);
    } finally {
      setLoadingMatches(false);
    }
  }

  async function handleCreateMatch(lostItemId: string) {
    if (!selectedFoundItem) return;

    try {
      const res = await fetch('/api/admin/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lostItemId,
          foundItemId: selectedFoundItem.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Items matched successfully!', 'success');
        setShowMatchModal(false);
        loadItems(); // Refresh the list
      } else {
        showToast(data.error || 'Failed to create match', 'error');
      }
    } catch (e) {
      showToast('Failed to create match', 'error');
    }
  }

  async function handleDeclineMatch(lostItemId: string) {
    if (!selectedFoundItem) return;

    try {
      const res = await fetch('/api/admin/match/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lostItemId,
          foundItemId: selectedFoundItem.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Remove this item from the match list
        setMatchingLostItems(prev => prev.filter(item => item.id !== lostItemId));
        showToast('Match declined - won\'t appear in future searches', 'success');
      } else {
        showToast(data.error || 'Failed to decline match', 'error');
      }
    } catch (e) {
      showToast('Failed to decline match', 'error');
    }
  }

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

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Manage Found Items</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Review and manage reported found items</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/items" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Manage Lost Items</Link>
            <Link href="/found" className="px-4 py-2 bg-green-600 text-white rounded-lg">Report Found Item</Link>
          </div>
        </div>

        {/* Compact Filters Card */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mb-6">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h2>
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/admin/found-items/export', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: statusFilter, category: categoryFilter, search: searchTerm }),
                  });
                  if (!response.ok) throw new Error('Export failed');
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `found-items-${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  showToast('Items exported successfully');
                } catch (error) {
                  showToast('Failed to export items', 'error');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Search items..."
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_STORAGE">In Storage</option>
                <option value="MATCHED">Matched</option>
                <option value="CLAIMED">Claimed</option>
                <option value="ARCHIVED">Archived</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DONATED">Donated</option>
                <option value="DISPOSED">Disposed</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-12 text-center">
            <div className="text-7xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No items found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No found items have been reported yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {items.map(item => (
              <div key={item.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300">
                <div className="flex flex-col md:flex-row gap-0">
                  {/* Image Section */}
                  {item.imageUrl && (
                    <div className="relative w-full md:w-48 h-48 flex-shrink-0">
                      <Image src={item.imageUrl} alt={item.title} fill sizes="(max-width: 768px) 100vw, 192px" className="object-cover rounded-t-xl md:rounded-l-xl md:rounded-tr-none" />
                      <div className="absolute top-3 right-3">
                        <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg backdrop-blur-sm ${
                          item.status === 'PENDING' ? 'bg-yellow-500/90 text-white' :
                          item.status === 'MATCHED' ? 'bg-blue-500/90 text-white' :
                          item.status === 'CLAIMED' ? 'bg-green-500/90 text-white' :
                          item.status === 'RESOLVED' ? 'bg-purple-500/90 text-white' :
                          item.status === 'DONATED' ? 'bg-teal-500/90 text-white' :
                          item.status === 'DISPOSED' ? 'bg-red-500/90 text-white' : 'bg-gray-500/90 text-white'
                        }`}>{item.status}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Content Section */}
                  <div className="flex-1 p-6">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{item.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{item.description}</p>
                    </div>

                    {/* Metadata Grid with Icons */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span className="text-gray-900 dark:text-gray-100 font-medium capitalize">{item.category}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">{item.location || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">{format(new Date(item.foundDate), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">{item.contactInfo}</span>
                      </div>
                    </div>

                    {/* Student Turnin Information */}
                    {(item.turnedInByName || item.turnedInByStudentNumber || item.turnedInByContact || item.turnedInByDepartment) && (
                      <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">Student Who Turned In Item</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          {item.turnedInByName && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Name:</span>
                              <span className="text-gray-900 dark:text-gray-100">{item.turnedInByName}</span>
                            </div>
                          )}
                          {item.turnedInByStudentNumber && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Student #:</span>
                              <span className="text-gray-900 dark:text-gray-100">{item.turnedInByStudentNumber}</span>
                            </div>
                          )}
                          {item.turnedInByContact && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Contact:</span>
                              <span className="text-gray-900 dark:text-gray-100">{item.turnedInByContact}</span>
                            </div>
                          )}
                          {item.turnedInByDepartment && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Dept/Course:</span>
                              <span className="text-gray-900 dark:text-gray-100">{item.turnedInByDepartment}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openMatchModal(item.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Find Matches
                      </button>
                      <Link
                        href={`/admin/handoff/${item.id}`}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Start Handoff
                      </Link>
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
      </div>

      {/* Match Modal */}
      {showMatchModal && selectedFoundItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <div>
                  <h2 className="text-xl font-bold text-white">Find Matches for Found Item</h2>
                  <p className="text-blue-100 text-sm mt-0.5">Showing potential lost items that match</p>
                </div>
              </div>
              <button
                onClick={() => setShowMatchModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Current Found Item */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border-b-2 border-green-200 dark:border-green-800 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-green-600 rounded-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-green-900 dark:text-green-100">Found Item</h3>
                </div>
                <div className="flex gap-6">
                  {selectedFoundItem.imageUrl && (
                    <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden border-2 border-green-300 dark:border-green-700">
                      <Image src={selectedFoundItem.imageUrl} alt={selectedFoundItem.title} fill sizes="128px" className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{selectedFoundItem.title}</h4>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">{selectedFoundItem.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span className="capitalize font-medium">{selectedFoundItem.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-medium">{selectedFoundItem.location || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">{format(new Date(selectedFoundItem.foundDate), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Matching Lost Items */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Matching Lost Items {loadingMatches ? '' : `(${matchingLostItems.length})`}
                  </h3>
                </div>

                {loadingMatches ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Searching for matches...</p>
                  </div>
                ) : matchingLostItems.length === 0 ? (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-12 text-center border-2 border-dashed border-gray-300 dark:border-gray-700">
                    <div className="text-6xl mb-4">🔍</div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Matches Found</h4>
                    <p className="text-gray-600 dark:text-gray-400">No lost items match this found item at the moment.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matchingLostItems.map((lostItem) => (
                      <div key={lostItem.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex gap-4">
                          {lostItem.imageUrl && (
                            <div className="relative w-24 h-24 flex-shrink-0">
                              <Image
                                src={lostItem.imageUrl}
                                alt={lostItem.title || 'Lost item'}
                                fill
                                sizes="96px"
                                className="object-cover rounded-lg"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{lostItem.title || 'Untitled'}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{lostItem.description || 'No description'}</p>
                              </div>
                              <div className="text-right ml-4 flex-shrink-0">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{lostItem.score.toFixed(1)}%</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Match Score</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3">
                              <div>Category: <span className="capitalize">{lostItem.category || 'N/A'}</span></div>
                              <div>Location: {lostItem.location || 'N/A'}</div>
                              <div>Date: {lostItem.lostDate ? format(new Date(lostItem.lostDate), 'MMM dd, yyyy') : 'N/A'}</div>
                              <div>Reporter: {lostItem.reportedBy?.name || lostItem.reportedBy?.email || 'Anonymous'}</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleCreateMatch(lostItem.id)}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Create Match
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Decline this match? It won\'t appear in future searches.')) {
                                    handleDeclineMatch(lostItem.id);
                                  }
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Decline
                              </button>
                              <Link
                                href={`/admin/items?highlight=${lostItem.id}`}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                              >
                                View Details
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
