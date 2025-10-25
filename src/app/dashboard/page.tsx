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

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [lostItems, setLostItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/dashboard');
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
       const lostRes = await fetch('/api/items/lost');

      if (lostRes.ok) {
        const lostData = await lostRes.json();
        setLostItems(lostData.data?.items || []);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (itemId: string) => {
    // Only allow resolve when item is MATCHED or CLAIMED
    const target = lostItems.find(i => i.id === itemId);
    if (!target || (target.status !== 'MATCHED' && target.status !== 'CLAIMED')) {
      showToast('You can only mark items as resolved when they are Matched or Claimed.', 'warning');
      return;
    }

    if (!confirm('Mark this item as resolved? This confirms you have received your lost item.')) {
      return;
    }

    setResolvingId(itemId);
    try {
      const res = await fetch(`/api/items/lost/${itemId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to resolve item');
      }

      showToast('Item marked as resolved!', 'success');
      
      // Update local state
      setLostItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, status: 'RESOLVED' } : item
        )
      );
    } catch (error) {
      console.error('Error resolving item:', error);
      showToast(error instanceof Error ? error.message : 'Failed to resolve item', 'error');
    } finally {
      setResolvingId(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your items...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
           <p className="text-gray-600 mt-2">View and manage your lost item reports</p>
        </div>

        {/* Items Grid */}
         {lostItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
               No lost items yet
            </h3>
            <p className="text-gray-600 mb-6">
               Haven't lost anything? Lucky you!
            </p>
            <Link
               href="/lost"
               className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all shadow-lg"
            >
               Report Lost Item
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {lostItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {item.title}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
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
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {item.description}
                  </p>
                  <div className="space-y-1 text-xs text-gray-500 mb-3">
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Category:</span>
                      <span className="capitalize">{item.category}</span>
                    </div>
                    {item.location && (
                      <div className="flex items-center">
                        <span className="font-medium mr-2">Location:</span>
                        <span>{item.location}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Date:</span>
                      <span>
                        {format(
                          new Date(item.lostDate || item.foundDate || item.createdAt),
                          'MMM dd, yyyy'
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Action Button - Only when user can resolve (MATCHED or CLAIMED) */}
                 {(item.status === 'MATCHED' || item.status === 'CLAIMED') && (
                    <button
                      onClick={() => handleResolve(item.id)}
                      disabled={resolvingId === item.id}
                      className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        resolvingId === item.id
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm hover:shadow-md'
                      } flex items-center justify-center gap-2`}
                    >
                      {resolvingId === item.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Resolving...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Mark as Resolved</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Final Status Displays */}
                  {item.status === 'RESOLVED' && (
                    <div className="w-full px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-2 text-purple-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium">
                           Item Recovered
                        </span>
                      </div>
                    </div>
                  )}
                  {item.status === 'DONATED' && (
                    <div className="w-full px-4 py-2 bg-teal-50 border border-teal-200 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-2 text-teal-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3 0 2.25 3 5 3 5s3-2.75 3-5c0-1.657-1.343-3-3-3z" />
                        </svg>
                        <span className="text-sm font-medium">Item Donated</span>
                      </div>
                    </div>
                  )}
                  {item.status === 'DISPOSED' && (
                    <div className="w-full px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-2 text-red-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10" />
                        </svg>
                        <span className="text-sm font-medium">Item Disposed</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

