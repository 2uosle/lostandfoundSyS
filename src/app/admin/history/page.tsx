"use client";

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { showToast } from '@/components/Toast';

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

export default function AdminHistoryPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [filterItemType, setFilterItemType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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
    } catch (error) {
      showToast('Failed to load history', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Filter logs
  const filteredLogs = logs.filter(log => {
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
    };

    const badge = badges[action] || badges.ARCHIVE;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <span>{badge.icon}</span>
        {action}
      </span>
    );
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Activity History</h1>
          <p className="text-gray-600 mt-2">Track all admin actions and changes to items</p>
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
                placeholder="Search by item title or admin..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Actions</option>
                <option value="MATCH">Match</option>
                <option value="CLAIM">Claim</option>
                <option value="ARCHIVE">Archive</option>
                <option value="DELETE">Delete</option>
                <option value="RESTORE">Restore</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Item Type</label>
              <select
                value={filterItemType}
                onChange={(e) => setFilterItemType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="LOST">Lost Items</option>
                <option value="FOUND">Found Items</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {['MATCH', 'CLAIM', 'ARCHIVE', 'DELETE', 'RESTORE'].map(action => {
            const count = logs.filter(log => log.action === action).length;
            return (
              <div key={action} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-600 capitalize">{action.toLowerCase()}</div>
              </div>
            );
          })}
        </div>

        {/* Activity Log Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading history...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No activity found</h3>
            <p className="text-gray-600">
              {searchTerm || filterAction !== 'all' || filterItemType !== 'all'
                ? 'Try adjusting your filters'
                : 'No admin actions have been logged yet'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performed By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map((log) => {
                    const details = parseDetails(log.details);
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getActionBadge(log.action)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="font-medium">{log.itemTitle}</div>
                          <div className="text-xs text-gray-500">ID: {log.itemId.slice(0, 8)}...</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            log.itemType === 'LOST' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {log.itemType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="font-medium">{log.performedBy.name || 'Admin'}</div>
                          <div className="text-xs text-gray-500">{log.performedBy.email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
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
                            <span className="text-gray-400">-</span>
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
      </div>
    </div>
  );
}

