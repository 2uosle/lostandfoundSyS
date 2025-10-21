import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { levenshtein } from '@/lib/string-utils';

// POST /api/match with { type: 'lost'|'found', id }
export async function POST(req: Request) {
  const body = await req.json();
  const { type, id } = body;
  if (!type || !id) return NextResponse.json({ error: 'Missing' }, { status: 400 });

  if (type === 'lost') {
    const target = await prisma.lostItem.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const candidates = await prisma.foundItem.findMany();
  type FoundItemType = NonNullable<typeof candidates[number]>;
  type Candidate = { item: FoundItemType; score: number };
  const scored: Candidate[] = candidates.map((c: FoundItemType) => {
      const score = levenshtein((target.title + ' ' + target.description).toLowerCase(), (c.title + ' ' + c.description).toLowerCase());
      return { item: c, score };
    }).sort((a: Candidate, b: Candidate) => a.score - b.score).slice(0, 10);
    return NextResponse.json(scored);
  } else {
    const target = await prisma.foundItem.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const candidates = await prisma.lostItem.findMany();
  type LostItemType = NonNullable<typeof candidates[number]>;
  type Candidate = { item: LostItemType; score: number };
  const scored: Candidate[] = candidates.map((c: LostItemType) => {
      const score = levenshtein((target.title + ' ' + target.description).toLowerCase(), (c.title + ' ' + c.description).toLowerCase());
      return { item: c, score };
    }).sort((a: Candidate, b: Candidate) => a.score - b.score).slice(0, 10);
    return NextResponse.json(scored);
  }
}
