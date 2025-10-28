import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { errorResponse } from '@/lib/api-utils';
import { onHandoffUpdate } from '@/lib/handoff-events';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') {
    return errorResponse('Unauthorized - Admin access required', 403);
  }

  const { id } = await context.params;
  const encoder = new TextEncoder();

  async function loadPayload() {
    const anyPrisma: any = prisma;
    const hs = await anyPrisma.handoffSession.findUnique({ where: { id } });
    if (!hs) return null;
    return {
      id: hs.id,
      lostItemId: hs.lostItemId,
      foundItemId: hs.foundItemId,
      ownerUserId: hs.ownerUserId,
      finderUserId: hs.finderUserId,
      adminCode: hs.adminCode,
      ownerVerifiedAdmin: !!hs.ownerVerifiedAdmin,
      adminVerifiedOwner: !!hs.adminVerifiedOwner,
      ownerAttempts: hs.ownerAttempts,
      adminAttempts: hs.adminAttempts,
      expiresAt: hs.expiresAt,
      locked: !!hs.locked,
      status: hs.status,
    };
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      const initial = await loadPayload();
      if (initial) send({ type: 'init', data: initial });

      const keep = setInterval(() => controller.enqueue(encoder.encode(`: ping\n\n`)), 25000);

      const off = onHandoffUpdate(id, async () => {
        const payload = await loadPayload();
        if (payload) send({ type: 'update', data: payload });
      });

      const abort = () => { try { clearInterval(keep); off(); controller.close(); } catch {} };
      // @ts-ignore
      req.signal?.addEventListener('abort', abort);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
