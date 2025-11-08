"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import Image from 'next/image';

type DispositionItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string | null;
  date?: string | Date | null;
  status: 'DONATED' | 'DISPOSED';
  imageUrl?: string | null;
  contactInfo?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  itemType: 'LOST' | 'FOUND';
  reportedBy?: { name: string | null; email: string | null } | null;
  // Disposition metadata (only for FOUND items)
  dispositionLocation?: string | null;
  dispositionRecipient?: string | null;
  dispositionDetails?: string | null;
};

export default function DispositionDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'DONATED' | 'DISPOSED'>('DONATED');
  const [items, setItems] = useState<DispositionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DispositionItem | null>(null);

  function exportToCSV() {
    const headers = ['Type','ID','Title','Description','Category','Location','Date','Status','ReporterName','ReporterEmail','UpdatedAt'];
    const rows = items
      .filter((i) => i.status === activeTab)
      .map((i) => [
        i.itemType,
        i.id,
        i.title,
        (i.description || '').replace(/\n/g,' '),
        i.category,
        i.location || '',
        i.date ? new Date(i.date).toISOString() : '',
        i.status,
        i.reportedBy?.name || '',
        i.reportedBy?.email || '',
        new Date(i.updatedAt).toISOString(),
      ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g,'""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disposition-${activeTab.toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user || session.user.role !== 'ADMIN') {
      router.push('/login?error=unauthorized');
    }
  }, [session, status, router]);

  async function load(statusFilter: 'DONATED' | 'DISPOSED') {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/disposition?status=${statusFilter.toLowerCase()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load items');
      const combined: DispositionItem[] = [...data.data.lost, ...data.data.found];
      // Filter to current tab status (API already filters, but keep safe)
      setItems(combined.filter((i) => i.status === statusFilter));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(activeTab);
  }, [activeTab]);

  // Read ?status= on client mount (avoid useSearchParams during prerender)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const status = (params.get('status') || '').toLowerCase();
      if (status === 'disposed') setActiveTab('DISPOSED');
      else setActiveTab('DONATED');
    } catch (e) {
      // ignore in non-browser environments
    }
  }, []);

  // Keep URL in sync with active tab for deep linking
  useEffect(() => {
    const status = activeTab.toLowerCase();
    router.replace(`/admin/disposition?status=${status}`);
  }, [activeTab, router]);

  // Removed unused counts memo to reduce lint noise

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
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

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Disposition Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View items marked as donated or disposed</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-1 inline-flex w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('DONATED')}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'DONATED' ? 'bg-teal-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Donated
          </button>
          <button
            onClick={() => setActiveTab('DISPOSED')}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'DISPOSED' ? 'bg-red-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Disposed
          </button>
          </div>
          <button
            onClick={exportToCSV}
            className="w-full sm:w-auto px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            Export CSV
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading items...</p>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg p-4">{error}</div>
        ) : items.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No {activeTab.toLowerCase()} items</h3>
            <p className="text-gray-600 dark:text-gray-400">Items will appear here after they are marked as {activeTab.toLowerCase()}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
                key={`${item.itemType}-${item.id}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(item)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(item); } }}
                className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {item.imageUrl && (
                  <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-800">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.status === 'DONATED'
                          ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{item.description}</p>
                  <div className="space-y-1 text-xs text-gray-500 dark:text-gray-500 mb-3">
                    <div className="flex items-center"><span className="font-medium mr-2">Type:</span><span>{item.itemType}</span></div>
                    <div className="flex items-center"><span className="font-medium mr-2">Category:</span><span className="capitalize">{item.category}</span></div>
                    {item.location && (
                      <div className="flex items-center"><span className="font-medium mr-2">Location:</span><span>{item.location}</span></div>
                    )}
                    <div className="flex items-center"><span className="font-medium mr-2">Date:</span><span>{item.date ? format(new Date(item.date), 'MMM dd, yyyy') : 'N/A'}</span></div>
                    {item.reportedBy && (
                      <div className="flex items-center"><span className="font-medium mr-2">Reported by:</span><span>{item.reportedBy.name || item.reportedBy.email || 'Anonymous'}</span></div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async (ev) => {
                        ev.stopPropagation();
                        try {
                          const res = await fetch('/api/admin/actions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'restore', itemId: item.id, itemType: item.itemType }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            await load(activeTab); // reload
                          } else {
                            alert(data.error || 'Failed to restore');
                          }
                        } catch {
                          alert('Failed to restore');
                        }
                      }}
                      className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-2xl mx-auto my-8">
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Item Overview</h3>
              <button onClick={() => setSelected(null)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                <svg className="w-5 h-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
              </button>
            </div>
            <div className="px-4 sm:px-5 py-4 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
              <div className="flex flex-col sm:flex-row gap-4">
                {selected.imageUrl && (
                  <div className="relative w-full sm:w-32 h-48 sm:h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    <Image src={selected.imageUrl} alt={selected.title} fill sizes="(max-width: 640px) 100vw, 128px" className="object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                    <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 break-words">{selected.title}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${selected.status === 'DONATED' ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}>{selected.status}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap break-words">{selected.description}</p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <div className="truncate"><span className="font-medium text-gray-800 dark:text-gray-200">Type:</span> {selected.itemType}</div>
                    <div className="truncate"><span className="font-medium text-gray-800 dark:text-gray-200">Category:</span> <span className="capitalize">{selected.category}</span></div>
                    <div className="truncate"><span className="font-medium text-gray-800 dark:text-gray-200">Location:</span> {selected.location || 'N/A'}</div>
                    <div className="truncate"><span className="font-medium text-gray-800 dark:text-gray-200">Date:</span> {selected.date ? format(new Date(selected.date), 'MMM dd, yyyy') : 'N/A'}</div>
                    <div className="col-span-1 sm:col-span-2 truncate"><span className="font-medium text-gray-800 dark:text-gray-200">Reporter:</span> {selected.reportedBy?.name || selected.reportedBy?.email || 'Anonymous'}</div>
                    <div className="col-span-1 sm:col-span-2 truncate"><span className="font-medium text-gray-800 dark:text-gray-200">Last Updated:</span> {format(new Date(selected.updatedAt), 'MMM dd, yyyy HH:mm')}</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Disposition Details</h5>
                {selected.itemType === 'FOUND' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Method</div>
                      <div className="font-medium break-words">{selected.status === 'DONATED' ? 'Donated' : 'Disposed'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Location</div>
                      <div className="font-medium break-words">{selected.dispositionLocation || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Recipient</div>
                      <div className="font-medium break-words">{selected.dispositionRecipient || '—'}</div>
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <div className="text-gray-500 dark:text-gray-400">Details / Notes</div>
                      <div className="font-medium whitespace-pre-wrap break-words">{selected.dispositionDetails || '—'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 dark:text-gray-400">No disposition metadata available for lost items.</div>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 px-4 sm:px-5 py-4 border-t border-gray-200 dark:border-gray-800">
              <button onClick={() => setSelected(null)} className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">Close</button>
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  if (!selected) return;
                  try {
                    const res = await fetch('/api/admin/actions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'restore', itemId: selected.id, itemType: selected.itemType }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      setSelected(null);
                      await load(activeTab);
                    } else {
                      alert(data.error || 'Failed to restore');
                    }
                  } catch {
                    alert('Failed to restore');
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Restore to Pending
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
