"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { showToast } from '@/components/Toast';

type Item = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string | null;
  lostDate?: Date;
  foundDate?: Date;
  status: string;
  imageUrl: string | null;
  contactInfo: string;
  createdAt: Date;
};

export default function DonatePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [donatingId, setDonatingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/donate');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      loadItems();
    }
  }, [session]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/items/lost');
      if (res.ok) {
        const data = await res.json();
        const userItems: Item[] = data.data?.items || [];
        setItems(userItems);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDonate = async (itemId: string) => {
    const target = items.find(i => i.id === itemId);
    if (!target || (target.status !== 'MATCHED' && target.status !== 'CLAIMED')) {
      showToast('You can only donate items that are Matched or Claimed.', 'warning');
      return;
    }

    if (!confirm('Donate this item? This will mark your lost item as DONATED.')) {
      return;
    }

    setDonatingId(itemId);
    try {
      const res = await fetch(`/api/items/lost/${itemId}/donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to donate item');
      }

      showToast('Thank you! Item donated.', 'success');

      // Update local state
      setItems(prev => prev.map(i => (i.id === itemId ? { ...i, status: 'DONATED' } : i)));
    } catch (error) {
      console.error('Error donating item:', error);
      showToast(error instanceof Error ? error.message : 'Failed to donate item', 'error');
    } finally {
      setDonatingId(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your items...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const eligible = items.filter(i => i.status === 'MATCHED' || i.status === 'CLAIMED');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Donate an Item</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Donate matched or claimed items to help others.</p>
        </div>

        {eligible.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-12 text-center">
            <div className="text-6xl mb-4">🎁</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No items available for donation</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Items become eligible once they are matched or claimed.</p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium transition-all shadow-lg"
            >
              Back to My Items
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eligible.map(item => (
              <div key={item.id} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.title} className="w-full h-48 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-teal-100 text-teal-800">{item.status}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{item.description}</p>
                  <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <div className="flex items-center"><span className="font-medium mr-2">Category:</span><span className="capitalize">{item.category}</span></div>
                    {item.location && (
                      <div className="flex items-center"><span className="font-medium mr-2">Location:</span><span>{item.location}</span></div>
                    )}
                    <div className="flex items-center"><span className="font-medium mr-2">Date:</span><span>{format(new Date(item.lostDate || item.foundDate || item.createdAt), 'MMM dd, yyyy')}</span></div>
                  </div>

                  <button
                    onClick={() => handleDonate(item.id)}
                    disabled={donatingId === item.id}
                    className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      donatingId === item.id
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-sm hover:shadow-md'
                    } flex items-center justify-center gap-2`}
                  >
                    {donatingId === item.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Donating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10a2 2 0 002 2h12M15 7V5a3 3 0 00-6 0v2M3 7h18" />
                        </svg>
                        <span>Donate this Item</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
