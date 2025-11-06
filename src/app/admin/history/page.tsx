"use client";

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { showToast } from '@/components/Toast';
import Link from 'next/link';
import Image from 'next/image';

type ActivityLog = {
  id: string;
  action: string;
  itemType: string;
  itemId: string;
  itemTitle: string;
  performedBy: {
    name: string | null;
    email: string;
  };
  details: string | null;
  createdAt: Date;
};

type ItemDetails = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string | null;
  date: Date;
  imageUrl: string | null;
  contactInfo: string;
  status: string;
  reportedBy?: {
    name: string | null;
    email: string | null;
  };
};

export default function AdminHistoryPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [filterItemType, setFilterItemType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingMatch, setViewingMatch] = useState<{ lost: ItemDetails; found: ItemDetails } | null>(null);
  const [viewingItem, setViewingItem] = useState<ItemDetails | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [loadingItem, setLoadingItem] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/history');
      const data = await res.json();
      
      if (data.success) {
        setLogs(data.data);
      } else {
        showToast(data.error || 'Failed to load history', 'error');
      }
    } catch {
      showToast('Failed to load history', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Group matched logs - combine MATCH/RESOLVE logs for the same pair into one entry
  const groupedLogs = logs.reduce((acc: ActivityLog[], log) => {
    const details = parseDetails(log.details);
    
    // Only group MATCH and RESOLVE actions
    if ((log.action === 'MATCH' || log.action === 'RESOLVE') && details?.matchedWith) {
      // Check if we already have a log for this match pair
      const existingIndex = acc.findIndex(existingLog => {
        const existingDetails = parseDetails(existingLog.details);
        if (!existingDetails?.matchedWith) return false;
        
        // Check if these logs refer to the same match pair (in either direction)
        return (
          (existingLog.itemId === log.itemId && existingDetails.matchedWith === details.matchedWith) ||
          (existingLog.itemId === details.matchedWith && existingDetails.matchedWith === log.itemId)
        );
      });

      // If we found a matching pair, skip this duplicate (keep the first one)
      if (existingIndex !== -1) {
        return acc;
      }
    }
    
    // Add log to accumulator
    acc.push(log);
    return acc;
  }, []);

  // Filter logs
  const filteredLogs = groupedLogs.filter(log => {
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesType = filterItemType === 'all' || log.itemType === filterItemType;
    const matchesSearch = 
      log.itemTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performedBy.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performedBy.email.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesAction && matchesType && matchesSearch;
  });

  // Get action badge styling
  function getActionBadge(action: string) {
    const badges: Record<string, { bg: string; text: string; icon: string }> = {
      MATCH: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🔗' },
      CLAIM: { bg: 'bg-green-100', text: 'text-green-800', icon: '✓' },
      ARCHIVE: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '📦' },
      DELETE: { bg: 'bg-red-100', text: 'text-red-800', icon: '🗑️' },
      RESTORE: { bg: 'bg-purple-100', text: 'text-purple-800', icon: '↩️' },
      RESOLVE: { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: '✨' },
      DONATED: { bg: 'bg-teal-100', text: 'text-teal-800', icon: '🎁' },
      DISPOSED: { bg: 'bg-orange-100', text: 'text-orange-800', icon: '♻️' },
      IN_STORAGE: { bg: 'bg-cyan-100', text: 'text-cyan-800', icon: '📦' },
      LOST: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '🔍' },
    };

    const badge = badges[action] || badges.ARCHIVE;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <span>{badge.icon}</span>
        {action}
      </span>
    );
  }

  // Load matched items for viewing
  async function loadMatchedItems(log: ActivityLog) {
    const details = parseDetails(log.details);
    if (!details || !details.matchedWith) {
      showToast('No match information available', 'info');
      return;
    }

    setLoadingMatch(true);
    try {
      // Fetch both lost and found items
      const [lostRes, foundRes] = await Promise.all([
        fetch(`/api/items/lost`),
        fetch(`/api/items/found`),
      ]);

      const [lostData, foundData] = await Promise.all([
        lostRes.json(),
        foundRes.json(),
      ]);

      if (!lostData.success || !foundData.success) {
        showToast('Failed to load item details', 'error');
        return;
      }

      // Determine which item is lost and which is found
      let lostItem, foundItem;
      
      if (log.itemType === 'LOST') {
        // The log is for a lost item, so itemId is the lost item
        lostItem = lostData.data.items.find((item: any) => item.id === log.itemId);
        foundItem = foundData.data.items.find((item: any) => item.id === details.matchedWith);
      } else {
        // The log is for a found item, so itemId is the found item and matchedWith is the lost item
        foundItem = foundData.data.items.find((item: any) => item.id === log.itemId);
        lostItem = lostData.data.items.find((item: any) => item.id === details.matchedWith);
      }

      if (!lostItem || !foundItem) {
        showToast('Could not find matched items', 'error');
        return;
      }

      // Map to ItemDetails format
      const lostDetails: ItemDetails = {
        id: lostItem.id,
        title: lostItem.title,
        description: lostItem.description,
        category: lostItem.category,
        location: lostItem.location,
        date: lostItem.lostDate,
        imageUrl: lostItem.imageUrl,
        contactInfo: lostItem.contactInfo,
        status: lostItem.status,
        reportedBy: lostItem.reportedBy,
      };

      const foundDetails: ItemDetails = {
        id: foundItem.id,
        title: foundItem.title,
        description: foundItem.description,
        category: foundItem.category,
        location: foundItem.location,
        date: foundItem.foundDate,
        imageUrl: foundItem.imageUrl,
        contactInfo: foundItem.contactInfo,
        status: foundItem.status,
        reportedBy: foundItem.reportedBy,
      };

      setViewingMatch({ lost: lostDetails, found: foundDetails });
    } catch {
      showToast('Failed to load item details', 'error');
    } finally {
      setLoadingMatch(false);
    }
  }

  // Load single item details for viewing
  async function loadItemDetails(log: ActivityLog) {
    setLoadingItem(true);
    try {
      // Fetch the appropriate item type
      const endpoint = log.itemType === 'LOST' ? '/api/items/lost' : '/api/items/found';
      const res = await fetch(endpoint);
      const data = await res.json();

      if (!data.success) {
        showToast('Failed to load item details', 'error');
        return;
      }

      // Find the specific item
      const item = data.data.items.find((item: any) => item.id === log.itemId);
      
      if (!item) {
        showToast('Item not found', 'error');
        return;
      }

      // Map to ItemDetails format
      const itemDetails: ItemDetails = {
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        location: item.location,
        date: log.itemType === 'LOST' ? item.lostDate : item.foundDate,
        imageUrl: item.imageUrl,
        contactInfo: item.contactInfo,
        status: item.status,
        reportedBy: item.reportedBy,
      };

      setViewingItem(itemDetails);
    } catch {
      showToast('Failed to load item details', 'error');
    } finally {
      setLoadingItem(false);
    }
  }

  // Parse details JSON
  function parseDetails(detailsStr: string | null) {
    if (!detailsStr) return null;
    try {
      return JSON.parse(detailsStr);
    } catch {
      return null;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <Link 
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Activity History</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Track all admin actions and changes to items</p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm mb-6 border border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by item title or admin..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Action</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Actions</option>
                <option value="LOST">Lost</option>
                <option value="IN_STORAGE">In Storage</option>
                <option value="MATCH">Match</option>
                <option value="CLAIM">Claim</option>
                <option value="DELETE">Delete</option>
                <option value="RESTORE">Restore</option>
                <option value="RESOLVE">Resolve</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Item Type</label>
              <select
                value={filterItemType}
                onChange={(e) => setFilterItemType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="LOST">Lost Items</option>
                <option value="FOUND">Found Items</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          {['LOST', 'IN_STORAGE', 'MATCH', 'CLAIM', 'DELETE', 'RESTORE'].map(action => {
            const count = groupedLogs.filter(log => log.action === action).length;
            return (
              <div key={action} className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{count}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">{action.toLowerCase().replace('_', ' ')}</div>
              </div>
            );
          })}
        </div>

        {/* Activity Log Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading history...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No activity found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || filterAction !== 'all' || filterItemType !== 'all'
                ? 'Try adjusting your filters'
                : 'No admin actions have been logged yet'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Performed By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredLogs.map((log) => {
                    const details = parseDetails(log.details);
                    const hasMatch = details && details.matchedWith;
                    const isMatchAction = log.action === 'MATCH' || log.action === 'RESOLVE';
                    const isClickable = isMatchAction && hasMatch || ['CLAIM', 'DELETE', 'DONATED', 'DISPOSED', 'IN_STORAGE', 'LOST', 'ARCHIVE', 'RESTORE'].includes(log.action);
                    
                    return (
                      <tr 
                        key={log.id} 
                        className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${isClickable ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (hasMatch && isMatchAction) {
                            loadMatchedItems(log);
                          } else if (isClickable) {
                            loadItemDetails(log);
                          }
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getActionBadge(log.action)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          {hasMatch && isMatchAction ? (
                            <div>
                              <div className="font-medium flex items-center gap-2 mb-1">
                                📦 Matched Pair
                                <span className="text-xs text-blue-600 dark:text-blue-400">👁️ Click to view</span>
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                                <div>📢 Lost: <span className="font-medium">{log.itemType === 'LOST' ? log.itemTitle : details.matchedTitle}</span></div>
                                <div>✨ Found: <span className="font-medium">{log.itemType === 'FOUND' ? log.itemTitle : details.matchedTitle}</span></div>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {log.itemTitle}
                                {isClickable && (
                                  <span className="text-xs text-blue-600 dark:text-blue-400">👁️ Click to view</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">ID: {log.itemId.slice(0, 8)}...</div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {hasMatch && isMatchAction ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              PAIR
                            </span>
                          ) : (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              log.itemType === 'LOST' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {log.itemType}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          <div className="font-medium">{log.performedBy.name || 'Admin'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{log.performedBy.email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {details ? (
                            <div className="space-y-1">
                              {details.matchedWith && (
                                <div className="text-xs">
                                  Matched with: <span className="font-medium">{details.matchedTitle}</span>
                                </div>
                              )}
                              {details.category && (
                                <div className="text-xs">Category: {details.category}</div>
                              )}
                              {details.location && (
                                <div className="text-xs">Location: {details.location}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Matched Items Modal */}
        {viewingMatch && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Matched Items - Side by Side</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">View the matched lost and found items</p>
                  </div>
                  <button
                    onClick={() => setViewingMatch(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                  <div className="border-2 border-blue-500 dark:border-blue-600 rounded-lg p-6 bg-white dark:bg-gray-800">
                    <div className="flex items-center mb-4">
                      <span className="text-2xl mr-2">📢</span>
                      <h3 className="text-xl font-bold text-blue-600">Lost Item</h3>
                      <span className={`ml-auto px-2 py-1 text-xs font-medium rounded-full ${
                        viewingMatch.lost.status === 'RESOLVED'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {viewingMatch.lost.status}
                      </span>
                    </div>
                    {viewingMatch.lost.imageUrl && (
                      <div className="relative w-full h-48 rounded-lg mb-4 overflow-hidden">
                        <Image
                          src={viewingMatch.lost.imageUrl}
                          alt={viewingMatch.lost.title}
                          fill
                          sizes="(min-width: 768px) 50vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Title:</label>
                        <p className="text-gray-900 dark:text-gray-100">{viewingMatch.lost.title}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description:</label>
                        <p className="text-gray-900 dark:text-gray-100">{viewingMatch.lost.description}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category:</label>
                        <p className="text-gray-900 dark:text-gray-100 capitalize">{viewingMatch.lost.category}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Location:</label>
                        <p className="text-gray-900 dark:text-gray-100">{viewingMatch.lost.location || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Date Lost:</label>
                        <p className="text-gray-900 dark:text-gray-100">{format(new Date(viewingMatch.lost.date), 'MMM dd, yyyy')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Contact:</label>
                        <p className="text-gray-900 dark:text-gray-100">{viewingMatch.lost.contactInfo}</p>
                      </div>
                      {viewingMatch.lost.reportedBy && (
                        <div className="pt-3 mt-3 border-t border-blue-200 dark:border-blue-800">
                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Reported By:</label>
                          <p className="text-gray-900 dark:text-gray-100">
                            {viewingMatch.lost.reportedBy.name || 'Anonymous'}
                          </p>
                          {viewingMatch.lost.reportedBy.email && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{viewingMatch.lost.reportedBy.email}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Found Item */}
                  <div className="border-2 border-green-500 dark:border-green-600 rounded-lg p-6 bg-white dark:bg-gray-800">
                    <div className="flex items-center mb-4">
                      <span className="text-2xl mr-2">✨</span>
                      <h3 className="text-xl font-bold text-green-600">Found Item</h3>
                      <span className={`ml-auto px-2 py-1 text-xs font-medium rounded-full ${
                        viewingMatch.found.status === 'RESOLVED'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {viewingMatch.found.status}
                      </span>
                    </div>
                    {viewingMatch.found.imageUrl && (
                      <div className="relative w-full h-48 rounded-lg mb-4 overflow-hidden">
                        <Image
                          src={viewingMatch.found.imageUrl}
                          alt={viewingMatch.found.title}
                          fill
                          sizes="(min-width: 768px) 50vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Title:</label>
                        <p className="text-gray-900 dark:text-gray-100">{viewingMatch.found.title}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description:</label>
                        <p className="text-gray-900 dark:text-gray-100">{viewingMatch.found.description}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category:</label>
                        <p className="text-gray-900 dark:text-gray-100 capitalize">{viewingMatch.found.category}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Location:</label>
                        <p className="text-gray-900 dark:text-gray-100">{viewingMatch.found.location || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Date Found:</label>
                        <p className="text-gray-900 dark:text-gray-100">{format(new Date(viewingMatch.found.date), 'MMM dd, yyyy')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Contact:</label>
                        <p className="text-gray-900 dark:text-gray-100">{viewingMatch.found.contactInfo}</p>
                      </div>
                      {viewingMatch.found.reportedBy && (
                        <div className="pt-3 mt-3 border-t border-green-200 dark:border-green-800">
                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Reported By:</label>
                          <p className="text-gray-900 dark:text-gray-100">
                            {viewingMatch.found.reportedBy.name || 'Anonymous'}
                          </p>
                          {viewingMatch.found.reportedBy.email && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{viewingMatch.found.reportedBy.email}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setViewingMatch(null)}
                  className="w-full px-6 py-3 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Single Item Details Modal */}
        {viewingItem && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Item Details</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Full information about this item</p>
                  </div>
                  <button
                    onClick={() => setViewingItem(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-4">
                  {/* Item Image */}
                  {viewingItem.imageUrl && (
                    <div className="relative w-full h-64 rounded-lg overflow-hidden mb-4">
                      <Image
                        src={viewingItem.imageUrl}
                        alt={viewingItem.title}
                        fill
                        sizes="100vw"
                        className="object-cover"
                      />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{viewingItem.title}</h3>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      viewingItem.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      viewingItem.status === 'MATCHED' ? 'bg-blue-100 text-blue-800' :
                      viewingItem.status === 'CLAIMED' ? 'bg-green-100 text-green-800' :
                      viewingItem.status === 'RESOLVED' ? 'bg-purple-100 text-purple-800' :
                      viewingItem.status === 'DONATED' ? 'bg-teal-100 text-teal-800' :
                      viewingItem.status === 'DISPOSED' ? 'bg-orange-100 text-orange-800' :
                      viewingItem.status === 'IN_STORAGE' ? 'bg-cyan-100 text-cyan-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {viewingItem.status}
                    </span>
                  </div>

                  {/* Item Details */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description:</label>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">{viewingItem.description}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category:</label>
                        <p className="text-gray-900 dark:text-gray-100 mt-1 capitalize">{viewingItem.category}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Location:</label>
                        <p className="text-gray-900 dark:text-gray-100 mt-1">{viewingItem.location || 'Not specified'}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Date:</label>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">{format(new Date(viewingItem.date), 'MMMM dd, yyyy')}</p>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Contact Information:</label>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">{viewingItem.contactInfo}</p>
                    </div>

                    {viewingItem.reportedBy && (
                      <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Reported By:</label>
                        <p className="text-gray-900 dark:text-gray-100 mt-1">
                          {viewingItem.reportedBy.name || 'Anonymous'}
                        </p>
                        {viewingItem.reportedBy.email && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{viewingItem.reportedBy.email}</p>
                        )}
                      </div>
                    )}

                    <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Item ID:</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-mono">{viewingItem.id}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setViewingItem(null)}
                  className="w-full px-6 py-3 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {(loadingMatch || loadingItem) && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-900 dark:text-gray-100 font-medium">
                {loadingMatch ? 'Loading match details...' : 'Loading item details...'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

