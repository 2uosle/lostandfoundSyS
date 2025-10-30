"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { showToast } from '@/components/Toast';
import { formatDistanceToNowStrict } from 'date-fns';

export default function HandoffPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const handoffId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string);
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionData, setSessionData] = useState<any | null>(null);
  const [otherCode, setOtherCode] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?redirect=/handoff/${handoffId ?? ''}`);
    }
  }, [status, router, handoffId]);

  const load = useCallback(async (opts?: { initial?: boolean }) => {
    const showInitial = !!opts?.initial;
    if (showInitial) setInitialLoading(true);
    try {
      const res = await fetch(`/api/handoff/${handoffId}`);
      const data = await res.json();
      if (data.success) {
        setSessionData(data.data);
      } else {
        showToast(data.error || 'Failed to load handoff session', 'error');
      }
    } catch (e) {
      showToast('Failed to load handoff session', 'error');
    } finally {
      if (showInitial) setInitialLoading(false);
    }
  }, [handoffId]);

  useEffect(() => {
    if (session?.user && handoffId) {
      load({ initial: true });
    }
  }, [session, handoffId, load]);

  // Subscribe to SSE for near-instant updates
  useEffect(() => {
    if (!handoffId) return;
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/handoff/${handoffId}/events`);
      es.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg?.data) setSessionData(msg.data);
        } catch {}
      };
      es.onerror = () => { /* silently fall back to poll on errors */ };
    } catch {}
    return () => { try { es?.close(); } catch {} };
  }, [handoffId]);

  async function submitCode() {
    if (otherCode.trim().length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/handoff/${handoffId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otherCode.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.data.message, 'success');
        await load();
      } else {
        showToast(data.error || 'Incorrect code', 'error');
        await load();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading' || initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading handoff session...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;
  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">No session data.</p>
      </div>
    );
  }

  const { role, myCode, status: hsStatus, locked, expiresAt, ownerVerifiedAdmin, adminVerifiedOwner, message } = sessionData;
  const expiresLabel = expiresAt ? formatDistanceToNowStrict(new Date(expiresAt), { addSuffix: true }) : '';

  const isDone = hsStatus === 'COMPLETED';
  const isExpired = hsStatus === 'EXPIRED';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm p-6">
  <h1 className="text-2xl font-bold text-gray-900 mb-1">Owner-Admin Handoff</h1>
  <p className="text-gray-600 mb-6">Exchange codes with the admin to complete the handoff.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
            <div className="text-sm text-blue-700 font-medium mb-1">Your Role</div>
            <div className="text-lg font-semibold text-blue-900">{role}</div>
          </div>
          <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
            <div className="text-sm text-gray-700 font-medium mb-1">Expires</div>
            <div className="text-lg font-semibold text-gray-900">{expiresLabel}</div>
          </div>
        </div>

        {message ? (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm text-center">{message}</div>
        ) : (
          <div className="mb-6">
            <div className="text-sm text-gray-600 mb-2">Show this code to the admin</div>
            <div className="text-3xl font-mono tracking-widest bg-gray-100 rounded-lg p-4 text-center select-all">
              {myCode}
            </div>
          </div>
        )}

        {!message && !isDone && !isExpired && !locked && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter the admin's code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={otherCode}
              onChange={(e) => setOtherCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono tracking-widest"
              placeholder="6-digit code"
            />
            <button
              onClick={submitCode}
              disabled={submitting || otherCode.length !== 6}
              className={`mt-3 w-full px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                submitting || otherCode.length !== 6
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-sm hover:shadow-md'
              }`}
            >
              {submitting ? 'Submitting...' : 'Verify Code'}
            </button>
          </div>
        )}

        {locked && (
          <div className="w-full px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-center mb-3">
            <div className="text-red-700 text-sm">Session locked due to too many incorrect attempts. Contact admin to reset.</div>
          </div>
        )}
        {isExpired && (
          <div className="w-full px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-center mb-3">
            <div className="text-yellow-800 text-sm">Session expired. Contact admin to regenerate codes.</div>
          </div>
        )}
        {isDone && (
          <div className="w-full px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-center mb-3">
            <div className="text-green-800 text-sm">Success! Handoff complete and item marked as claimed.</div>
          </div>
        )}

        {!message && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className={`p-3 rounded-lg border ${ownerVerifiedAdmin ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="font-medium text-gray-700">Owner Entered Admin Code</div>
              <div className="text-gray-600">{ownerVerifiedAdmin ? 'Verified' : 'Pending'}</div>
            </div>
            <div className={`p-3 rounded-lg border ${adminVerifiedOwner ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="font-medium text-gray-700">Admin Entered Owner Code</div>
              <div className="text-gray-600">{adminVerifiedOwner ? 'Verified' : 'Pending'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
