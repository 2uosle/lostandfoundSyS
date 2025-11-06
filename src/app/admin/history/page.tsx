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

type GroupedItem = {
  itemId: string;
  itemTitle: string;
  itemType: string;
  actions: ActivityLog[];
  firstAction: Date;
  lastAction: Date;
  currentStatus: string;
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
  // For found items
  turnedInByName?: string | null;
  turnedInByStudentNumber?: string | null;
  turnedInByContact?: string | null;
  turnedInByDepartment?: string | null;
};

export default function AdminHistoryPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [filterItemType, setFilterItemType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
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

  // Group logs by match pairs or individual items
  const groupedItems: GroupedItem[] = (() => {
    const grouped: Record<string, GroupedItem> = {};
    const processedItemIds = new Set<string>();
    
    // First pass: identify all items that are part of matches
    const matchedItemIds = new Set<string>();
    logs.forEach(log => {
      if (log.action === 'MATCH') {
        const details = parseDetails(log.details);
        const matchedWith = details?.matchedWith;
        if (matchedWith) {
          matchedItemIds.add(log.itemId);
          matchedItemIds.add(matchedWith);
        }
      }
    });

    // Second pass: create groups
    logs.forEach(log => {
      // Skip if this item has already been processed
      if (processedItemIds.has(log.itemId)) return;

      // If this item is part of a match, create a matched pair group
      if (matchedItemIds.has(log.itemId)) {
        // Find the MATCH action for this item
        const matchLog = logs.find(l => 
          l.itemId === log.itemId && 
          l.action === 'MATCH'
        );
        
        if (matchLog) {
          const details = parseDetails(matchLog.details);
          const matchedWith = details?.matchedWith;
          
          if (matchedWith) {
            // Create a unique key for this match pair (sorted to ensure consistency)
            const matchKey = [log.itemId, matchedWith].sort().join('_MATCH_');
            
            // Only create the group once (check if it already exists)
            if (!grouped[matchKey]) {
              // Mark both items as processed
              processedItemIds.add(log.itemId);
              processedItemIds.add(matchedWith);
              
              // Find both match logs
              const log1 = logs.find(l => l.itemId === log.itemId && l.action === 'MATCH');
              const log2 = logs.find(l => l.itemId === matchedWith && l.action === 'MATCH');
              
              // Determine which is lost and which is found
              const lostLog = log1?.itemType === 'LOST' ? log1 : log2;
              const foundLog = log1?.itemType === 'FOUND' ? log1 : log2;
              
              if (lostLog && foundLog) {
                const allActions: ActivityLog[] = [];
                
                // Collect all actions for both items
                logs.forEach(l => {
                  if (l.itemId === log.itemId || l.itemId === matchedWith) {
                    allActions.push(l);
                  }
                });
                
                // Sort by date to find first and last
                const sortedByDate = [...allActions].sort((a, b) => 
                  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
                
                grouped[matchKey] = {
                  itemId: matchKey,
                  itemTitle: `${lostLog.itemTitle} ↔ ${foundLog.itemTitle}`,
                  itemType: 'MATCH',
                  actions: allActions,
                  firstAction: new Date(sortedByDate[0].createdAt),
                  lastAction: new Date(sortedByDate[sortedByDate.length - 1].createdAt),
                  currentStatus: sortedByDate[sortedByDate.length - 1].action,
                };
              }
            }
          }
        }
        return;
      }
      
      // For non-matched items, group individually
      const key = log.itemId;
      
      if (!grouped[key]) {
        grouped[key] = {
          itemId: log.itemId,
          itemTitle: log.itemTitle,
          itemType: log.itemType,
          actions: [],
          firstAction: new Date(log.createdAt),
          lastAction: new Date(log.createdAt),
          currentStatus: log.action,
        };
      }
      
      grouped[key].actions.push(log);
      const logDate = new Date(log.createdAt);
      if (logDate < grouped[key].firstAction) grouped[key].firstAction = logDate;
      if (logDate > grouped[key].lastAction) {
        grouped[key].lastAction = logDate;
        grouped[key].currentStatus = log.action;
      }
    });
    
    return Object.values(grouped).sort((a, b) => b.lastAction.getTime() - a.lastAction.getTime());
  })();

  // Filter grouped items
  const filteredItems = groupedItems.filter(item => {
    const matchesType = filterItemType === 'all' || item.itemType === filterItemType;
    const matchesAction = filterAction === 'all' || item.actions.some(a => a.action === filterAction);
    const matchesSearch = 
      item.itemTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.actions.some(a => 
        a.performedBy.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.performedBy.email.toLowerCase().includes(searchTerm.toLowerCase())
      );

    return matchesType && matchesAction && matchesSearch;
  });

  function toggleExpand(itemId: string) {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }

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
      DECLINE_MATCH: { bg: 'bg-red-100', text: 'text-red-800', icon: '✕' },
      ITEM_CREATED: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '➕' },
      LOST: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '🔍' },
      HANDOFF_START: { bg: 'bg-purple-100', text: 'text-purple-800', icon: '🤝' },
      HANDOFF_COMPLETE: { bg: 'bg-green-100', text: 'text-green-800', icon: '✅' },
      HANDOFF_RESET: { bg: 'bg-orange-100', text: 'text-orange-800', icon: '🔄' },
    };

    const badge = badges[action] || badges.ARCHIVE;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <span>{badge.icon}</span>
        {action}
      </span>
    );
  }

  // Get human-readable action description
  function getActionDescription(action: string, details: any, itemType?: string) {
    const descriptions: Record<string, string> = {
      MATCH: details?.matchedWith 
        ? itemType === 'LOST'
          ? `Matched with found item: ${details.matchedTitle || 'Unknown'}`
          : `Matched with lost item: ${details.matchedTitle || 'Unknown'}`
        : 'Items matched together',
      CLAIM: 'Item claimed by owner',
      ARCHIVE: 'Item archived',
      DELETE: 'Item deleted from system',
      RESTORE: 'Item restored from archive',
      RESOLVE: details?.matchedWith ? `Match resolved successfully` : 'Item marked as resolved',
      DONATED: 'Item donated',
      DISPOSED: 'Item disposed',
      IN_STORAGE: 'Item moved to storage',
      DECLINE_MATCH: details?.matchedWithTitle 
        ? `Match declined with: ${details.matchedWithTitle}`
        : 'Match declined',
      ITEM_CREATED: 'Item reported to system',
      LOST: 'Lost item reported',
      HANDOFF_START: 'Handoff process started',
      HANDOFF_COMPLETE: 'Handoff completed successfully',
      HANDOFF_RESET: 'Handoff codes reset',
    };

    return descriptions[action] || action;
  }

  // Load matched items for viewing
  async function loadMatchedItems(log: ActivityLog) {
    const details = parseDetails(log.details);
    console.log('Loading matched items for log:', log);
    console.log('Parsed details:', details);
    
    if (!details || !details.matchedWith) {
      showToast('No match information available', 'info');
      console.error('Missing match details. Log details:', log.details, 'Parsed:', details);
      return;
    }

    setLoadingMatch(true);
    try {
      // Determine which item is lost and which is found based on log.itemType
      const lostItemId = log.itemType === 'LOST' ? log.itemId : details.matchedWith;
      const foundItemId = log.itemType === 'FOUND' ? log.itemId : details.matchedWith;

      console.log('Fetching items:', { lostItemId, foundItemId, logItemType: log.itemType });

      // Fetch items using admin endpoints with maximum limit and all statuses
      // Note: The API has a max limit of 100, so we'll fetch and hope the items are in there
      const [lostRes, foundRes] = await Promise.all([
        fetch(`/api/admin/items/lost?limit=100&status=all`),
        fetch(`/api/admin/items/found?limit=100&status=all`),
      ]);

      if (!lostRes.ok || !foundRes.ok) {
        showToast('Failed to load item details', 'error');
        console.error('API error:', { lostStatus: lostRes.status, foundStatus: foundRes.status });
        return;
      }

      const [lostData, foundData] = await Promise.all([
        lostRes.json(),
        foundRes.json(),
      ]);

      if (!lostData.success || !foundData.success) {
        showToast('Failed to load item details', 'error');
        console.error('API error:', { lostData, foundData });
        return;
      }

      // Find the specific items by exact ID match
      const lostItem = lostData.data.items.find((item: any) => item.id === lostItemId);
      const foundItem = foundData.data.items.find((item: any) => item.id === foundItemId);

      console.log('Search results:', { 
        lostItem: lostItem?.id, 
        foundItem: foundItem?.id,
        lostCount: lostData.data.items.length,
        foundCount: foundData.data.items.length,
        searchingFor: { lostItemId, foundItemId }
      });

      if (!lostItem || !foundItem) {
        // If items not found in first 100, they might be older - try fetching more pages
        showToast('Searching for items...', 'info');
        
        // Try a few more pages
        const [lostRes2, foundRes2] = await Promise.all([
          fetch(`/api/admin/items/lost?limit=100&status=all&page=2`),
          fetch(`/api/admin/items/found?limit=100&status=all&page=2`),
        ]);
        
        const [lostData2, foundData2] = await Promise.all([
          lostRes2.json(),
          foundRes2.json(),
        ]);
        
        const lostItem2 = lostData2.success ? lostData2.data.items.find((item: any) => item.id === lostItemId) : null;
        const foundItem2 = foundData2.success ? foundData2.data.items.find((item: any) => item.id === foundItemId) : null;
        
        const finalLostItem = lostItem || lostItem2;
        const finalFoundItem = foundItem || foundItem2;
        
        if (!finalLostItem || !finalFoundItem) {
          showToast('Could not find matched items - they may have been deleted', 'error');
          console.error('Items not found after searching 200 records:', { lostItemId, foundItemId });
          return;
        }
        
        // Use the found items
        Object.assign({ lostItem: finalLostItem, foundItem: finalFoundItem });
        
        // Continue with the mapping below using finalLostItem and finalFoundItem
        const lostDetails: ItemDetails = {
          id: finalLostItem.id,
          title: finalLostItem.title,
          description: finalLostItem.description,
          category: finalLostItem.category,
          location: finalLostItem.location,
          date: finalLostItem.lostDate,
          imageUrl: finalLostItem.imageUrl,
          contactInfo: finalLostItem.contactInfo,
          status: finalLostItem.status,
          reportedBy: finalLostItem.reportedBy,
        };

        const foundDetails: ItemDetails = {
          id: finalFoundItem.id,
          title: finalFoundItem.title,
          description: finalFoundItem.description,
          category: finalFoundItem.category,
          location: finalFoundItem.location,
          date: finalFoundItem.foundDate,
          imageUrl: finalFoundItem.imageUrl,
          contactInfo: finalFoundItem.contactInfo,
          status: finalFoundItem.status,
          reportedBy: finalFoundItem.reportedBy,
          turnedInByName: finalFoundItem.turnedInByName,
          turnedInByStudentNumber: finalFoundItem.turnedInByStudentNumber,
          turnedInByContact: finalFoundItem.turnedInByContact,
          turnedInByDepartment: finalFoundItem.turnedInByDepartment,
        };

        setViewingMatch({ lost: lostDetails, found: foundDetails });
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
        turnedInByName: foundItem.turnedInByName,
        turnedInByStudentNumber: foundItem.turnedInByStudentNumber,
        turnedInByContact: foundItem.turnedInByContact,
        turnedInByDepartment: foundItem.turnedInByDepartment,
      };

      setViewingMatch({ lost: lostDetails, found: foundDetails });
    } catch (error) {
      console.error('Error loading matched items:', error);
      showToast('Failed to load item details', 'error');
    } finally {
      setLoadingMatch(false);
    }
  }

  // Load single item details for viewing
  async function loadItemDetails(log: ActivityLog) {
    setLoadingItem(true);
    try {
      // Fetch the appropriate item type using admin endpoints (status=all to include all items)
      const endpoint = log.itemType === 'LOST' 
        ? `/api/admin/items/lost?limit=100&status=all` 
        : `/api/admin/items/found?limit=100&status=all`;
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
        // Include turned-in fields for found items
        ...(log.itemType === 'FOUND' && {
          turnedInByName: item.turnedInByName,
          turnedInByStudentNumber: item.turnedInByStudentNumber,
          turnedInByContact: item.turnedInByContact,
          turnedInByDepartment: item.turnedInByDepartment,
        }),
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

  // Restore an archived or deleted item
  async function handleRestore(itemId: string, itemType: string) {
    if (!confirm('Are you sure you want to restore this item?')) {
      return;
    }

    try {
      const endpoint = itemType === 'LOST' ? '/api/items/lost' : '/api/items/found';
      const res = await fetch(`${endpoint}/${itemId}/restore`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to restore item');
      }

      showToast('Item restored successfully', 'success');
      // Reload activity history to reflect the change
      loadLogs();
    } catch (error) {
      console.error('Error restoring item:', error);
      showToast(error instanceof Error ? error.message : 'Failed to restore item', 'error');
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
                <option value="ITEM_CREATED">Item Created</option>
                <option value="IN_STORAGE">In Storage</option>
                <option value="MATCH">Match</option>
                <option value="DECLINE_MATCH">Decline Match</option>
                <option value="CLAIM">Claim</option>
                <option value="ARCHIVE">Archive</option>
                <option value="DELETE">Delete</option>
                <option value="RESTORE">Restore</option>
                <option value="RESOLVE">Resolve</option>
                <option value="DONATE">Donate</option>
                <option value="DISPOSE">Dispose</option>
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
          {['ITEM_CREATED', 'IN_STORAGE', 'MATCH', 'CLAIM', 'DELETE', 'RESTORE'].map(action => {
            let count = 0;
            
            if (action === 'MATCH') {
              // Count matched pairs (grouped items with type MATCH)
              count = groupedItems.filter(item => item.itemType === 'MATCH').length;
            } else {
              // Count individual actions for other types
              count = logs.filter(log => log.action === action).length;
            }
            
            return (
              <div key={action} className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{count}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                  {action === 'MATCH' ? 'Matched Pairs' : action.toLowerCase().replace('_', ' ')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Activity Log - Grouped by Item */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading history...</p>
          </div>
        ) : filteredItems.length === 0 ? (
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
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const isExpanded = expandedItems.has(item.itemId);
              const sortedActions = [...item.actions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              
              return (
                <div key={item.itemId} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
                  {/* Main Row */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => toggleExpand(item.itemId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {/* Expand Icon */}
                        <div className="text-gray-400">
                          <svg 
                            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        
                        {/* Item Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.itemTitle}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.itemType === 'LOST' 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
                                : item.itemType === 'FOUND'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                            }`}>
                              {item.itemType === 'MATCH' ? '🔗 MATCHED PAIR' : item.itemType}
                            </span>
                            {getActionBadge(item.currentStatus)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Last: {format(item.lastAction, 'MMM dd, yyyy HH:mm')}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              {item.actions.length} action{item.actions.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        
                        {/* ID */}
                        <div className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                          {item.itemId.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Timeline */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <div className="p-6">
                        {/* View Item Button - Moved to top */}
                        {sortedActions.some(a => a.action === 'MATCH') ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // For matched pairs, find a MATCH action that has matchedWith details
                              console.log('All sorted actions:', sortedActions.map(a => ({ action: a.action, id: a.id, itemId: a.itemId, itemType: a.itemType })));
                              
                              const matchAction = sortedActions.find(a => {
                                if (a.action !== 'MATCH') return false;
                                const details = parseDetails(a.details);
                                console.log('Checking MATCH action:', a.id, 'Details:', details);
                                return details && details.matchedWith;
                              });
                              
                              console.log('Found MATCH action with matchedWith:', matchAction);
                              
                              if (matchAction) {
                                loadMatchedItems(matchAction);
                              } else {
                                showToast('Could not find valid MATCH action with pair information', 'error');
                              }
                            }}
                            className="w-full mb-4 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Side-by-Side Comparison
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              loadItemDetails(sortedActions[0]);
                            }}
                            className="w-full mb-4 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Item Details
                          </button>
                        )}

                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Activity Timeline
                        </h4>
                        <div className="space-y-3">
                          {sortedActions.map((action, index) => {
                            const details = parseDetails(action.details);
                            const isLast = index === sortedActions.length - 1;
                            
                            return (
                              <div key={action.id} className="flex gap-3">
                                {/* Timeline Line */}
                                <div className="flex flex-col items-center">
                                  <div className="w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-400 border-2 border-white dark:border-gray-900"></div>
                                  {!isLast && <div className="w-0.5 h-full bg-gray-300 dark:bg-gray-700 mt-1"></div>}
                                </div>
                                
                                {/* Action Details */}
                                <div className="flex-1 pb-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        {getActionBadge(action.action)}
                                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                          {getActionDescription(action.action, details, action.itemType)}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                        <div>
                                          By {action.performedBy.name || 'Admin'} ({action.performedBy.email})
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          {format(new Date(action.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                                        </div>
                                        {details && (
                                          <div className="mt-2 text-xs bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                                            {details.matchedWith && <div>Matched with: <span className="font-medium">{details.matchedTitle}</span></div>}
                                            {details.category && <div>Category: {details.category}</div>}
                                            {details.location && <div>Location: {details.location}</div>}
                                            {details.reason && <div>Reason: {details.reason}</div>}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Restore Button - appears for archived/deleted items */}
                                    {(action.action === 'ARCHIVE' || action.action === 'DELETE') && item.currentStatus === action.action && index === 0 && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRestore(item.itemId, item.itemType);
                                        }}
                                        className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5 font-medium shadow-sm"
                                        title="Restore this item"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Restore
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
                      {/* Show Turned In By for found items or Reported By for admin-reported items */}
                      {(viewingMatch.found.turnedInByName || viewingMatch.found.reportedBy) && (
                        <div className="pt-3 mt-3 border-t border-green-200 dark:border-green-800">
                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {viewingMatch.found.turnedInByName ? 'Turned In By:' : 'Reported By:'}
                          </label>
                          {viewingMatch.found.turnedInByName ? (
                            <>
                              <p className="text-gray-900 dark:text-gray-100">{viewingMatch.found.turnedInByName}</p>
                              {viewingMatch.found.turnedInByStudentNumber && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">Student #: {viewingMatch.found.turnedInByStudentNumber}</p>
                              )}
                              {viewingMatch.found.turnedInByContact && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">Contact: {viewingMatch.found.turnedInByContact}</p>
                              )}
                              {viewingMatch.found.turnedInByDepartment && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">Department: {viewingMatch.found.turnedInByDepartment}</p>
                              )}
                            </>
                          ) : (
                            <>
                              <p className="text-gray-900 dark:text-gray-100">
                                {viewingMatch.found.reportedBy?.name || 'Anonymous'}
                              </p>
                              {viewingMatch.found.reportedBy?.email && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">{viewingMatch.found.reportedBy.email}</p>
                              )}
                            </>
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

                    {/* Show Turned In By for found items or Reported By for other items */}
                    {(viewingItem.turnedInByName || viewingItem.reportedBy) && (
                      <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {viewingItem.turnedInByName ? 'Turned In By:' : 'Reported By:'}
                        </label>
                        {viewingItem.turnedInByName ? (
                          <>
                            <p className="text-gray-900 dark:text-gray-100 mt-1">{viewingItem.turnedInByName}</p>
                            {viewingItem.turnedInByStudentNumber && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">Student #: {viewingItem.turnedInByStudentNumber}</p>
                            )}
                            {viewingItem.turnedInByContact && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">Contact: {viewingItem.turnedInByContact}</p>
                            )}
                            {viewingItem.turnedInByDepartment && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">Department: {viewingItem.turnedInByDepartment}</p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-gray-900 dark:text-gray-100 mt-1">
                              {viewingItem.reportedBy?.name || 'Anonymous'}
                            </p>
                            {viewingItem.reportedBy?.email && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">{viewingItem.reportedBy.email}</p>
                            )}
                          </>
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

