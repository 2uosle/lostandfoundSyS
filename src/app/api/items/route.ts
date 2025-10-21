import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const items = await prisma.lostItem.findMany({ include: { reportedBy: { select: { name: true, email: true } } } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = await req.json();
  const item = await prisma.lostItem.create({ data: body });
  return NextResponse.json(item);
}
