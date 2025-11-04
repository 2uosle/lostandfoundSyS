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
};

export default function AdminFoundItemsPage() {
  const [items, setItems] = useState<FoundItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  async function loadItems() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/items/found');
      const data = await res.json();
      if (data.success) {
        setItems(data.data.items || data.data);
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
    loadItems();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  async function openMatchModal(id: string) {
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'found', id }),
      });
      const data = await res.json();
      if (data.success) {
        const matches = Array.isArray(data.data) ? data.data : data.data.matches || [];
        // Navigate to admin items page and show compare? For now open a simple toast with candidate info
        if (matches.length === 0) {
          const candidateCount = Array.isArray(data.data) ? matches.length : data.data.candidateCount ?? matches.length;
          showToast(candidateCount === 0 ? 'No pending lost-item candidates to check' : 'No matching lost items found', 'info');
        } else {
          // Open admin manage lost items and focus? For now show summary
          showToast(`Found ${matches.length} potential matches — open Manage Lost Items to review`, 'success');
          // Optionally we could open the Compare modal by sharing state, but that's more involved
        }
      } else {
        showToast(data.error || 'Failed to find matches', 'error');
      }
    } catch (e) {
      showToast('Failed to find matches', 'error');
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
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
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
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
                <option value="all">All Categories</option>
                <option value="electronics">Electronics</option>
                <option value="clothing">Clothing</option>
                <option value="accessories">Accessories</option>
                <option value="documents">Documents</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={loadItems} className="w-full md:w-auto px-4 py-2 bg-gray-800 text-white rounded-lg">Refresh</button>
            </div>
          </div>
        </div>

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
                : 'No found items have been reported yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="flex gap-6">
                  {item.imageUrl && (
                    <div className="relative w-32 h-32 flex-shrink-0">
                      <Image src={item.imageUrl} alt={item.title} fill sizes="128px" className="object-cover rounded-lg" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full flex-shrink-0 ml-4 ${
                        item.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        item.status === 'MATCHED' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'CLAIMED' ? 'bg-green-100 text-green-800' :
                        item.status === 'RESOLVED' ? 'bg-purple-100 text-purple-800' :
                        item.status === 'DONATED' ? 'bg-teal-100 text-teal-800' :
                        item.status === 'DISPOSED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>{item.status}</span>
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
                        <span className="ml-2">{format(new Date(item.foundDate), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">Reported by:</span>
                        <div className="flex items-center gap-1">
                          <span className="ml-1 font-medium text-blue-700">{item.contactInfo}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => openMatchModal(item.id)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Find Matches</button>
                      <Link href={`/admin/handoff/${item.id}`} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Start Handoff</Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
