import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, context: any) {
  const { id } = context.params;
  const item = await prisma.lostItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: Request, context: any) {
  const { id } = context.params;
  const body = await req.json();
  const item = await prisma.lostItem.update({ where: { id }, data: body });
  return NextResponse.json(item);
}

export async function DELETE(req: Request, context: any) {
  const { id } = context.params;
  await prisma.lostItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, context: any) {
  const { id } = context.params;
  const bodyText = await req.text();
  // simple form method override
  if (bodyText.includes('_method=DELETE')) {
    await prisma.lostItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unsupported' }, { status: 400 });
}
