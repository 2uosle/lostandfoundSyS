import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { errorResponse } from '@/lib/api-utils';
import { inferRole, isExpired } from '@/lib/handoff';
import { onHandoffUpdate } from '@/lib/handoff-events';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return errorResponse('Unauthorized', 401);
  }

  const { id } = await context.params;
  const encoder = new TextEncoder();

  // Helper to load payload tailored to requester role (like GET /api/handoff/[id])
  async function loadPayload() {
    const hs = await prisma.handoffSession.findUnique({ where: { id } });
    if (!hs) return null;
  const role = inferRole(hs, session!.user.id);
    if (!role) return null;
    const expired = isExpired(hs.expiresAt) || hs.status !== 'ACTIVE';
    if (role === 'FINDER') {
      return {
        id: hs.id,
        role,
        status: expired ? (hs.status === 'ACTIVE' ? 'EXPIRED' : hs.status) : hs.status,
        expiresAt: hs.expiresAt,
        locked: !!hs.locked,
        message: 'The item is with the admin. Only the owner needs to verify with the admin.'
      };
    }
    return {
      id: hs.id,
      role,
      status: expired ? (hs.status === 'ACTIVE' ? 'EXPIRED' : hs.status) : hs.status,
      expiresAt: hs.expiresAt,
      locked: !!hs.locked,
      ownerVerifiedAdmin: !!hs.ownerVerifiedAdmin,
      adminVerifiedOwner: !!hs.adminVerifiedOwner,
      ownerAttempts: hs.ownerAttempts,
      adminAttempts: hs.adminAttempts,
      myCode: hs.ownerCode,
      otherCodeKnown: !!hs.adminCode,
    };
  }

  const stream = new ReadableStream<Uint8Array>({
  async start(controller) {
      // Write headers in body as SSE lines
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Initial payload
      const initial = await loadPayload();
      if (initial) send({ type: 'init', data: initial });

      // Keepalive pings
      const keep = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 25000);

      // Subscribe to updates
      const off = onHandoffUpdate(id, async () => {
        const payload = await loadPayload();
        if (payload) send({ type: 'update', data: payload });
      });

      // Cleanup on client disconnect
      const abort = () => {
        try { clearInterval(keep); off(); } catch {}
        try { controller.close(); } catch {}
      };
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
