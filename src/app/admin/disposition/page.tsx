"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

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
};

export default function DispositionDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'DONATED' | 'DISPOSED'>('DONATED');
  const [items, setItems] = useState<DispositionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  const counts = useMemo(() => {
    const donated = items.filter((i) => i.status === 'DONATED').length;
    const disposed = items.filter((i) => i.status === 'DISPOSED').length;
    return { donated, disposed };
  }, [items]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Disposition Dashboard</h1>
          <p className="text-gray-600 mt-1">View items marked as donated or disposed</p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex">
          <button
            onClick={() => setActiveTab('DONATED')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'DONATED' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Donated
          </button>
          <button
            onClick={() => setActiveTab('DISPOSED')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'DISPOSED' ? 'bg-red-600 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Disposed
          </button>
          </div>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium"
          >
            Export CSV
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading items...</p>
          </div>
        ) : error ? (
          <div className="bg-white border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No {activeTab.toLowerCase()} items</h3>
            <p className="text-gray-600">Items will appear here after they are marked as {activeTab.toLowerCase()}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div key={`${item.itemType}-${item.id}`} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.title} className="w-full h-48 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.status === 'DONATED'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                  <div className="space-y-1 text-xs text-gray-500 mb-3">
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
                      onClick={async () => {
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
                        } catch (e) {
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
    </div>
  );
}
