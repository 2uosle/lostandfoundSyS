"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { showToast } from '@/components/Toast';
import Image from 'next/image';
import { playCompleteSound, playMatchSound } from '@/lib/sounds';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

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
  matchedItemId?: string | null;
};

type HandoffSession = {
  id: string;
  role: 'OWNER' | 'FINDER';
  ownerCode?: string;
  ownerVerifiedAdmin: boolean;
  adminVerifiedOwner: boolean;
  expiresAt: string;
  status: string;
  locked: boolean;
  message?: string; // For finders who don't participate
};

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lostItems, setLostItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true); // only used for initial load spinner
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const loadedOnceRef = useRef(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [handoffSessions, setHandoffSessions] = useState<Record<string, HandoffSession>>({});
  const [verifyingHandoff, setVerifyingHandoff] = useState<string | null>(null);
  const [handoffInput, setHandoffInput] = useState<Record<string, string>>({});
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/dashboard');
    }
  }, [status, router]);

  

  // Handle URL parameter to auto-open item modal (moved below after callbacks)

  // Auto-refresh handoff sessions with a stable interval, pause when tab is hidden
  const pollRef = useRef<number | null>(null);
  const lostItemsRef = useRef(lostItems);

  useEffect(() => {
    lostItemsRef.current = lostItems;
  }, [lostItems]);

  // Polling effect moved below after callbacks

  const loadHandoffSession = useCallback(async (lostItemId: string) => {
    try {
      const res = await fetch(`/api/handoff/by-item/${lostItemId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setHandoffSessions(prev => ({ ...prev, [lostItemId]: data.data }));
      } else {
        // No session for this item yet; ignore
      }
    } catch (error) {
      console.error('Error loading handoff session:', error);
    }
  }, []);

  const loadItems = useCallback(async () => {
    if (!loadedOnceRef.current) setLoading(true);
    try {
       const lostRes = await fetch('/api/items/lost');

      if (lostRes.ok) {
        const lostData = await lostRes.json();
        const items = lostData.data?.items || [];
        setLostItems(items);
        
        // Load handoff sessions for matched items
        for (const item of items) {
          if (item.status === 'MATCHED' && item.matchedItemId) {
            loadHandoffSession(item.id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      if (!loadedOnceRef.current) {
        setLoading(false);
        loadedOnceRef.current = true;
      }
    }
  }, [loadHandoffSession]);

  // Trigger initial load when session is available
  useEffect(() => {
    if (session?.user) {
      loadItems();
    }
  }, [session, loadItems]);

  // Handle URL parameter to auto-open item modal (now after callbacks)
  useEffect(() => {
    const openItemId = searchParams.get('openItem');
    if (openItemId && lostItems.length > 0) {
      const item = lostItems.find(i => i.id === openItemId);
      if (item) {
        setSelectedItem(item);
        if (item.status === 'MATCHED') {
          loadHandoffSession(item.id);
        }
        router.replace('/dashboard', { scroll: false });
      }
    }
  }, [searchParams, lostItems, router, loadHandoffSession]);

  // Auto-refresh handoff sessions polling (now after callbacks)
  useEffect(() => {
    function startPolling() {
      if (pollRef.current != null) return;
      pollRef.current = window.setInterval(() => {
        const matched = lostItemsRef.current.filter(i => i.status === 'MATCHED' && i.matchedItemId);
        if (matched.length === 0) return;
        matched.forEach(item => loadHandoffSession(item.id));
      }, 15000); // 15 seconds instead of 5 for less frequent polling
    }

    function stopPolling() {
      if (pollRef.current != null) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    if (!document.hidden) startPolling();

    const onVisibility = () => {
      if (document.hidden) stopPolling();
      else startPolling();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stopPolling();
    };
  }, [loadHandoffSession]);

  const handleVerifyHandoff = async (sessionId: string, code: string) => {
    if (!code || code.length !== 6) return;
    setVerifyingHandoff(sessionId);
    try {
      const res = await fetch(`/api/handoff/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Play completion sound for successful handoff verification
        playCompleteSound();
        showToast(data.data.message, 'success');
        // Reload items and handoff session
        await loadItems();
      } else {
        showToast(data.error || 'Incorrect code', 'error');
      }
    } finally {
      setVerifyingHandoff(null);
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
      
      // Play completion sound for resolving item
      playCompleteSound();
      
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
          <p className="text-gray-600 dark:text-gray-400">Loading your items...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950/20 py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background orb */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl animate-float"></div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Dashboard</h1>
           <p className="text-gray-600 dark:text-gray-400 mt-2">View and manage your lost item reports</p>
        </div>

        {/* Items Grid */}
         {lostItems.length === 0 ? (
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-12 text-center animate-in fade-in zoom-in-95 duration-700 delay-300">
            <div className="text-6xl mb-4 animate-bounce">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
               No lost items yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
               Haven't lost anything? Lucky you!
            </p>
            <Link
               href="/lost"
               className="inline-block px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105 active:scale-95"
            >
               Report Lost Item
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {lostItems.map((item, index) => (
              <div
                key={item.id}
                data-item-id={item.id}
                className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200 dark:border-gray-800 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 transition-all duration-300 overflow-hidden cursor-pointer hover:scale-[1.02] hover:-translate-y-1 group animate-in fade-in slide-in-from-bottom-4 duration-700"
                style={{ animationDelay: `${Math.min(index * 100, 600)}ms` }}
                onClick={() => setSelectedItem(item)}
              >
                {item.imageUrl && (
                  <div className="relative w-full h-48 overflow-hidden">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {item.title}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : item.status === 'MATCHED'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : item.status === 'CLAIMED'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : item.status === 'RESOLVED'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                          : item.status === 'DONATED'
                          ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
                          : item.status === 'DISPOSED'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {item.description}
                  </p>
                  <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
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

                  {/* Expand/Collapse Button for MATCHED items */}
                  {item.status === 'MATCHED' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newExpandedId = expandedId === item.id ? null : item.id;
                        setExpandedId(newExpandedId);
                        // Reload handoff session when expanding
                        if (newExpandedId === item.id && !handoffSessions[item.id]) {
                          loadHandoffSession(item.id);
                        }
                      }}
                      className="w-full mb-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={expandedId === item.id ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                      </svg>
                      <span>{expandedId === item.id ? 'Hide' : 'View'} Handoff Details</span>
                    </button>
                  )}

                  {/* Handoff Details (Expanded) */}
                  {expandedId === item.id && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="mb-3 p-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg"
                    >
                      {!handoffSessions[item.id] ? (
                        <div className="text-center py-4">
                          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-sm text-indigo-700 dark:text-indigo-300">Loading handoff details...</p>
                        </div>
                      ) : handoffSessions[item.id].message ? (
                        <div className="text-center py-4 text-sm text-indigo-700 dark:text-indigo-300">
                          {handoffSessions[item.id].message}
                        </div>
                      ) : (
                        <>
                          <h4 className="font-semibold text-indigo-900 dark:text-indigo-200 mb-2">🔐 Your Handoff Code</h4>
                          <div className="text-2xl font-mono tracking-widest bg-white dark:bg-gray-950 rounded-lg p-3 text-center mb-3 select-all border border-indigo-300 dark:border-indigo-800">
                            {handoffSessions[item.id].ownerCode}
                          </div>
                          <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-3">Show this code to the admin during handoff.</p>
                      
                      <div className="text-xs mb-3">
                        <div className={`p-2 rounded ${handoffSessions[item.id].ownerVerifiedAdmin && handoffSessions[item.id].adminVerifiedOwner ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                          Verification: {handoffSessions[item.id].ownerVerifiedAdmin && handoffSessions[item.id].adminVerifiedOwner ? 'Complete ✓' : 'Pending'}
                          {handoffSessions[item.id].ownerVerifiedAdmin && !handoffSessions[item.id].adminVerifiedOwner && (
                            <span className="block text-[10px] text-blue-600 dark:text-blue-300">✓ You verified admin's code</span>
                          )}
                          {!handoffSessions[item.id].ownerVerifiedAdmin && handoffSessions[item.id].adminVerifiedOwner && (
                            <span className="block text-[10px] text-blue-600 dark:text-blue-300">✓ Admin verified your code</span>
                          )}
                        </div>
                      </div>

                      {!(handoffSessions[item.id].ownerVerifiedAdmin && handoffSessions[item.id].adminVerifiedOwner) ? (
                        <>
                          <label className="block text-sm font-medium text-indigo-900 dark:text-indigo-200 mb-2">
                            Enter the admin's code to verify
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={handoffInput[item.id] || ''}
                            onChange={(e) => setHandoffInput({ ...handoffInput, [item.id]: e.target.value.replace(/\D/g, '').slice(0,6) })}
                            className="w-full px-4 py-2 border border-indigo-300 dark:border-indigo-800 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono tracking-widest mb-2"
                            placeholder="6-digit code"
                          />
                          <button
                            onClick={() => handleVerifyHandoff(handoffSessions[item.id].id, handoffInput[item.id] || '')}
                            disabled={verifyingHandoff !== null || (handoffInput[item.id] || '').length !== 6}
                            className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                              verifyingHandoff || (handoffInput[item.id] || '').length !== 6
                                ? 'bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                          >
                            {verifyingHandoff === handoffSessions[item.id].id ? 'Verifying...' : 'Verify Code'}
                          </button>
                        </>
                      ) : (
                        <div className="text-center text-green-700 dark:text-green-300 font-medium">
                          ✓ Both parties verified!
                        </div>
                      )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Action Button - Only when user can resolve (MATCHED or CLAIMED) */}
                 {(item.status === 'MATCHED' || item.status === 'CLAIMED') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResolve(item.id);
                      }}
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
                    <div className="w-full px-4 py-2 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-2 text-purple-700 dark:text-purple-300">
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
                    <div className="w-full px-4 py-2 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-2 text-teal-700 dark:text-teal-300">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3 0 2.25 3 5 3 5s3-2.75 3-5c0-1.657-1.343-3-3-3z" />
                        </svg>
                        <span className="text-sm font-medium">Item Donated</span>
                      </div>
                    </div>
                  )}
                  {item.status === 'DISPOSED' && (
                    <div className="w-full px-4 py-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-2 text-red-700 dark:text-red-300">
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

      {/* Item Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 z-50 animate-in fade-in duration-300" onClick={() => setSelectedItem(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Item Details</h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {selectedItem.imageUrl && (
                <div className="relative w-full h-64 rounded-lg mb-6 overflow-hidden">
                  <Image
                    src={selectedItem.imageUrl}
                    alt={selectedItem.title}
                    fill
                    sizes="(min-width: 1024px) 800px, 100vw"
                    className="object-cover"
                  />
                </div>
              )}
              
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedItem.title}</h3>
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${
                      selectedItem.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : selectedItem.status === 'MATCHED'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : selectedItem.status === 'CLAIMED'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : selectedItem.status === 'RESOLVED'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                        : selectedItem.status === 'DONATED'
                        ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
                        : selectedItem.status === 'DISPOSED'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {selectedItem.status}
                  </span>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{selectedItem.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <p className="text-gray-900 dark:text-gray-100 capitalize">{selectedItem.category}</p>
                  </div>
                  {selectedItem.location && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Location</label>
                      <p className="text-gray-900 dark:text-gray-100">{selectedItem.location}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Date Lost</label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {format(new Date(selectedItem.lostDate || selectedItem.createdAt), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Reported by</label>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-900 dark:text-gray-100 font-medium">{selectedItem.contactInfo}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Reported On</label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {format(new Date(selectedItem.createdAt), 'MMMM dd, yyyy h:mm a')}
                    </p>
                  </div>
                </div>

                {/* Handoff Details in Modal */}
                {selectedItem.status === 'MATCHED' && (
                  <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                    {!handoffSessions[selectedItem.id] ? (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm text-indigo-700 dark:text-indigo-300">Loading handoff details...</p>
                      </div>
                    ) : handoffSessions[selectedItem.id].message ? (
                      <div className="text-center py-8 text-indigo-700 dark:text-indigo-300">
                        {handoffSessions[selectedItem.id].message}
                      </div>
                    ) : (
                      <>
                        <h4 className="font-semibold text-indigo-900 dark:text-indigo-200 mb-3 text-lg">🔐 Handoff Verification</h4>
                        <div className="text-2xl font-mono tracking-widest bg-white dark:bg-gray-950 rounded-lg p-4 text-center mb-3 select-all border border-indigo-300 dark:border-indigo-800">
                          {handoffSessions[selectedItem.id].ownerCode}
                        </div>
                        <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-4">Show this code to the admin during handoff.</p>
                    
                    <div className="mb-4">
                      <div className={`p-3 rounded-lg text-center ${handoffSessions[selectedItem.id].ownerVerifiedAdmin && handoffSessions[selectedItem.id].adminVerifiedOwner ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                        <div className="font-semibold">Verification Status</div>
                        <div className="text-sm">{handoffSessions[selectedItem.id].ownerVerifiedAdmin && handoffSessions[selectedItem.id].adminVerifiedOwner ? '✓ Complete' : 'Pending'}</div>
                        {handoffSessions[selectedItem.id].ownerVerifiedAdmin && !handoffSessions[selectedItem.id].adminVerifiedOwner && (
                          <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">✓ You verified admin's code</div>
                        )}
                        {!handoffSessions[selectedItem.id].ownerVerifiedAdmin && handoffSessions[selectedItem.id].adminVerifiedOwner && (
                          <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">✓ Admin verified your code</div>
                        )}
                      </div>
                    </div>

                    {!(handoffSessions[selectedItem.id].ownerVerifiedAdmin && handoffSessions[selectedItem.id].adminVerifiedOwner) ? (
                      <>
                        <label className="block text-sm font-medium text-indigo-900 dark:text-indigo-200 mb-2">
                          Enter the admin's code to verify
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={handoffInput[selectedItem.id] || ''}
                          onChange={(e) => setHandoffInput({ ...handoffInput, [selectedItem.id]: e.target.value.replace(/\D/g, '').slice(0,6) })}
                          className="w-full px-4 py-3 border border-indigo-300 dark:border-indigo-800 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono tracking-widest text-lg mb-3"
                          placeholder="6-digit code"
                        />
                        <button
                          onClick={() => handleVerifyHandoff(handoffSessions[selectedItem.id].id, handoffInput[selectedItem.id] || '')}
                          disabled={verifyingHandoff !== null || (handoffInput[selectedItem.id] || '').length !== 6}
                          className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
                            verifyingHandoff || (handoffInput[selectedItem.id] || '').length !== 6
                              ? 'bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
                          }`}
                        >
                          {verifyingHandoff === handoffSessions[selectedItem.id].id ? 'Verifying...' : 'Verify Code'}
                        </button>
                      </>
                    ) : (
                      <div className="text-center py-4 text-green-700 dark:text-green-300 font-semibold text-lg">
                        ✓ Verification complete!
                      </div>
                    )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-900 shadow-lg">
              {(selectedItem.status === 'MATCHED' || selectedItem.status === 'CLAIMED') && (
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    handleResolve(selectedItem.id);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105 active:scale-95"
                >
                  Mark as Resolved
                </button>
              )}
              <button
                onClick={() => setSelectedItem(null)}
                className="px-6 py-3 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-300 font-medium hover:scale-105 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
