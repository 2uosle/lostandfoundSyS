"use client";

import { useEffect, useState } from 'react';
import { showToast } from '@/components/Toast';
import { format } from 'date-fns';
import Image from 'next/image';

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
    imageUrl: string | null;
    contactInfo: string;
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
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [matchCandidates, setMatchCandidates] = useState<MatchCandidate[]>([]);
  const [matchingFor, setMatchingFor] = useState<string | null>(null);
  const [compareView, setCompareView] = useState<{ lost: Item; found: MatchCandidate } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  async function loadItems() {
    setLoading(true);
    try {
      const res = await fetch('/api/items/lost');
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
        if (action === 'match') {
          setMatchingFor(null);
          setCompareView(null);
        }
        loadItems();
      } else {
        showToast(data.error || 'Action failed', 'error');
      }
    } catch {
      showToast('Action failed', 'error');
    }
  }

  async function openMatchModal(id: string) {
    setMatchingFor(id);
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'lost', id }),
      });

      const data = await res.json();

      if (data.success) {
        setMatchCandidates(data.data);
        if (data.data.length === 0) {
          showToast('No potential matches found', 'info');
        }
      } else {
        showToast(data.error || 'Failed to find matches', 'error');
        setMatchingFor(null);
      }
    } catch {
      showToast('Failed to find matches', 'error');
      setMatchingFor(null);
    }
  }

  function openCompareView(candidate: MatchCandidate) {
    const lostItem = items.find(i => i.id === matchingFor);
    if (lostItem) {
      setCompareView({ lost: lostItem, found: candidate });
    }
  }

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Lost Items</h1>
          <p className="text-gray-600 mt-2">Review and manage all reported lost items</p>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title or description..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="MATCHED">Matched</option>
                <option value="CLAIMED">Claimed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

        {/* Items List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No lost items have been reported yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
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
                        <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full flex-shrink-0 ml-4 ${
                          item.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : item.status === 'MATCHED'
                            ? 'bg-blue-100 text-blue-800'
                            : item.status === 'CLAIMED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                      <div>
                        <span className="font-medium text-gray-700">Category:</span>
                        <span className="ml-2 capitalize">{item.category}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Location:</span>
                        <span className="ml-2">{item.location || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Date:</span>
                        <span className="ml-2">{format(new Date(item.lostDate), 'MMM dd, yyyy')}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Contact:</span>
                        <span className="ml-2">{item.contactInfo}</span>
                      </div>
                    </div>
                    {item.reportedBy && (
                      <p className="text-xs text-gray-500 mb-4">
                        Reported by: {item.reportedBy.name || item.reportedBy.email || 'Anonymous'}
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
            <div className="bg-white border border-gray-200 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Potential Matches</h2>
                <p className="text-gray-600 mt-1">Showing best matching found items</p>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {matchCandidates.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <p className="text-gray-600">No matching items found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matchCandidates.map((candidate) => (
                      <div key={candidate.item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
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
                                <h3 className="font-semibold text-gray-900">{candidate.item.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">{candidate.item.description}</p>
                              </div>
                              <div className="text-right ml-4">
                                <div className="text-2xl font-bold text-blue-600">{candidate.score}%</div>
                                <div className="text-xs text-gray-500">Match Score</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                              <div>Category: <span className="capitalize">{candidate.item.category}</span></div>
                              <div>Location: {candidate.item.location}</div>
                              <div>Contact: {candidate.item.contactInfo}</div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs mb-3">
                              {Object.entries(candidate.breakdown).map(([key, value]) => (
                                <span key={key} className="px-2 py-1 bg-gray-100 rounded">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}: {value.toFixed(1)}
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => openCompareView(candidate)}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                              >
                                Compare Side-by-Side
                              </button>
                              <button
                                onClick={() => handleAction('match', matchingFor, candidate.item.id)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                              >
                                Confirm Match
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200">
                <button
                  onClick={() => setMatchingFor(null)}
                  className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
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
                        <label className="text-sm font-semibold text-gray-700">Contact:</label>
                        <p className="text-gray-900">{compareView.lost.contactInfo}</p>
                      </div>
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
                        <label className="text-sm font-semibold text-gray-700">Contact:</label>
                        <p className="text-gray-900">{compareView.found.item.contactInfo}</p>
                      </div>
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
              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => setCompareView(null)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Back to Matches
                </button>
                <button
                  onClick={() => handleAction('match', matchingFor!, compareView.found.item.id)}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Confirm Match
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

