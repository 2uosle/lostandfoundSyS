"use client";

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { showToast } from '@/components/Toast';
import { formatDistanceToNowStrict } from 'date-fns';

type HandoffInfo = {
  id: string;
  status: string;
  expiresAt: string;
  locked: boolean;
  ownerCode?: string;
  adminCode?: string;
  ownerVerifiedAdmin?: boolean;
  adminVerifiedOwner?: boolean;
  ownerAttempts?: number;
  adminAttempts?: number;
};

export default function AdminHandoffConsole() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string);

  const [initialLoading, setInitialLoading] = useState(true);
  const [info, setInfo] = useState<HandoffInfo | null>(null);
  const [ownerInput, setOwnerInput] = useState('');
  const [submitting, setSubmitting] = useState<'OWNER'|'FINDER'|null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user || session.user.role !== 'ADMIN') {
      router.push('/login?error=unauthorized');
    }
  }, [session, status, router]);

  const load = useCallback(async (opts?: { initial?: boolean }) => {
    const showInitial = !!opts?.initial;
    if (showInitial) setInitialLoading(true);
    try {
      const res = await fetch(`/api/admin/handoff/${id}`);
      const data = await res.json();
      if (data.success) setInfo(data.data);
      else showToast(data.error || 'Failed to load session', 'error');
    } catch {
      showToast('Failed to load session', 'error');
    } finally {
      if (showInitial) setInitialLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (session?.user && id) load({ initial: true });
  }, [session, id, load]);

  // Prefer SSE; fallback polling is no longer necessary for normal flow
  useEffect(() => {
    if (!id) return;
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/admin/handoff/${id}/events`);
      es.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg?.data) setInfo(msg.data);
        } catch {}
      };
      es.onerror = () => { /* ignore transient errors */ };
    } catch {}
    return () => { try { es?.close(); } catch {} };
  }, [id]);

  async function submit(code: string) {
    if (!code || code.length !== 6) return;
    setSubmitting('OWNER'); // For loading state
    try {
      const res = await fetch(`/api/admin/handoff/${id}/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
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
      setSubmitting(null);
    }
  }

  if (status === 'loading' || initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading handoff console...</p>
        </div>
      </div>
    );
  }

  if (!info) return null;

  const expiresLabel = info.expiresAt ? formatDistanceToNowStrict(new Date(info.expiresAt), { addSuffix: true }) : '';
  const done = info.status === 'COMPLETED';
  const expired = info.status === 'EXPIRED';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Handoff Console</h1>
        <p className="text-gray-600 mb-6">Exchange codes with the owner to complete verification.</p>

        {/* Admin's Code Display */}
        <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
          <h3 className="text-sm font-semibold text-purple-900 mb-2">🔐 Your Admin Code</h3>
          <div className="text-3xl font-mono tracking-widest bg-white rounded-lg p-4 text-center select-all border-2 border-purple-300 text-gray-900">
            {info.adminCode}
          </div>
          <p className="text-xs text-purple-700 mt-2">Share this code with the owner to verify their identity.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className={`p-4 rounded-lg border ${info.ownerVerifiedAdmin && info.adminVerifiedOwner ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="text-sm text-gray-700 font-medium mb-1">Owner</div>
            <div className="text-lg font-semibold text-gray-900">
              {info.ownerVerifiedAdmin && info.adminVerifiedOwner ? 'Verified' : 'Pending'}
            </div>
            {info.ownerVerifiedAdmin && !info.adminVerifiedOwner && (
              <div className="text-xs text-blue-600 mt-1">✓ Entered your code</div>
            )}
            {!info.ownerVerifiedAdmin && info.adminVerifiedOwner && (
              <div className="text-xs text-blue-600 mt-1">✓ You verified them</div>
            )}
          </div>
          <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
            <div className="text-sm text-gray-700 font-medium mb-1">Expires</div>
            <div className="text-lg font-semibold text-gray-900">{expiresLabel}</div>
          </div>
        </div>

        {!done && !expired && !info.locked && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Enter Owner&apos;s presented code</label>
            <input
              type="text" inputMode="numeric" pattern="[0-9]*" value={ownerInput}
              onChange={(e) => setOwnerInput(e.target.value.replace(/\D/g, '').slice(0,6))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono tracking-widest"
              placeholder="6-digit code"
            />
            <button
              onClick={() => submit(ownerInput)}
              disabled={submitting !== null || ownerInput.length !== 6}
              className={`mt-3 w-full px-4 py-2 rounded-lg font-medium text-sm transition-all ${submitting || ownerInput.length !== 6 ? 'bg-gray-300 text-gray-500' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
            >
              {submitting === 'OWNER' ? 'Verifying…' : 'Verify Owner'}
            </button>
          </div>
        )}

        {info.locked && (
          <div className="w-full px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-center mb-3">
            <div className="text-red-700 text-sm">Session locked: too many attempts. Use Reset.</div>
          </div>
        )}

        {done && (
          <div className="w-full px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-center mb-3">
            <div className="text-green-700 font-semibold">✓ Handoff Complete! Both parties verified.</div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={async () => {
              const res = await fetch(`/api/admin/handoff/${id}/reset`, { method: 'POST' });
              const data = await res.json();
              if (res.ok && data.success) { showToast('Session reset', 'success'); load(); }
              else showToast(data.error || 'Failed to reset', 'error');
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            Reset Codes
          </button>
          <button
            onClick={() => router.push('/admin/items')}
            className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Back to Items
          </button>
        </div>
      </div>
    </div>
  );
}
