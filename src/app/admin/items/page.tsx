"use client";
import React from 'react';
import { useEffect, useState } from 'react';

type Item = {
  id: string;
  title: string;
  description: string;
  status: string;
  reportedBy?: { email?: string | null };
}

export default function AdminItemsPage(){
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [matchCandidates, setMatchCandidates] = useState<any[]>([]);
  const [matchingFor, setMatchingFor] = useState<string | null>(null);

  async function load(){
    setLoading(true);
    const res = await fetch('/api/items');
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }

  useEffect(()=>{ load(); }, []);

  async function doDelete(id: string){
    // optimistic
    const before = items;
    setItems(items.filter(i=>i.id !== id));
    await fetch(`/api/items/${id}`, { method: 'DELETE' });
  }

  async function doAction(action: string, id: string, matchWithId?: string){
    const before = items;
    // optimistic update for claim/archive
    if (action === 'claim' || action === 'archive') {
      setItems(items.map(i => i.id === id ? { ...i, status: action === 'claim' ? 'CLAIMED' : 'ARCHIVED' } : i));
    }
    await fetch('/api/admin/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, itemId: id, matchWithId }) });
    if (action === 'match') {
      setMatchingFor(null);
    }
    // reload to ensure consistency
    load();
  }

  async function openMatch(id: string){
    setMatchingFor(id);
    const res = await fetch('/api/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'lost', id }) });
    const data = await res.json();
    setMatchCandidates(data);
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Manage Lost Items</h1>
      {loading && <div>Loading...</div>}
      <div className="space-y-4">
        {items.map(it => (
          <div key={it.id} className="p-4 border flex justify-between items-center">
            <div>
              <div className="font-bold">{it.title} <span className="text-xs">[{it.status}]</span></div>
              <div className="text-sm">{it.description}</div>
              <div className="text-xs text-gray-500">Reported by: {it.reportedBy?.email}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>openMatch(it.id)} className="px-3 py-1 border">Match</button>
              <button onClick={()=>doAction('claim', it.id)} className="px-3 py-1 bg-green-600 text-white rounded">Claim</button>
              <button onClick={()=>doAction('archive', it.id)} className="px-3 py-1 bg-yellow-600 text-white rounded">Archive</button>
              <button onClick={()=>doDelete(it.id)} className="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {matchingFor && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white p-4 max-w-2xl w-full">
            <h2 className="text-xl mb-2">Match candidates</h2>
            <div className="space-y-2 max-h-96 overflow-auto">
              {matchCandidates.map((c:any)=> (
                <div key={c.item.id} className="p-2 border flex justify-between">
                  <div>
                    <div className="font-bold">{c.item.title}</div>
                    <div className="text-sm">{c.item.description}</div>
                    <div className="text-xs text-gray-500">score: {c.score}</div>
                  </div>
                  <div>
                    <button onClick={()=>doAction('match', matchingFor, c.item.id)} className="px-3 py-1 bg-blue-600 text-white rounded">Match</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-right"><button onClick={()=>setMatchingFor(null)} className="px-3 py-1 border">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
