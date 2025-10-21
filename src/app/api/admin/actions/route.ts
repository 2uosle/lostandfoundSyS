import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const body = await req.json();
  const { action, itemId, matchWithId } = body;

  if (!action || !itemId) return NextResponse.json({ error: 'Missing' }, { status: 400 });

  if (action === 'archive') {
    await prisma.lostItem.update({ where: { id: itemId }, data: { status: 'ARCHIVED' } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'claim') {
    await prisma.lostItem.update({ where: { id: itemId }, data: { status: 'CLAIMED' } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'match') {
    if (!matchWithId) return NextResponse.json({ error: 'Missing matchWithId' }, { status: 400 });
    // link both items using relation connect
    await prisma.lostItem.update({ where: { id: itemId }, data: { matchedWith: { connect: { id: matchWithId } }, status: 'MATCHED' } });
    await prisma.foundItem.update({ where: { id: matchWithId }, data: { matchedItem: { connect: { id: itemId } }, status: 'MATCHED' } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
