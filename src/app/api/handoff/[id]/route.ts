import { prisma } from '@/lib/prisma';
import { $Enums } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';
import { inferRole, isExpired } from '@/lib/handoff';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/handoff/[id] - fetch session for current user, hide the other party's code
export async function GET(_req: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse('Unauthorized', 401);

    const { id } = await context.params;

    const anyPrisma: any = prisma;
    const hs = await anyPrisma.handoffSession.findUnique({
      where: { id },
    });
    if (!hs) return errorResponse('Session not found', 404);

    const role = inferRole(hs, session.user.id);
    if (!role) return errorResponse('Not a participant of this session', 403);

    const expired = isExpired(hs.expiresAt) || hs.status !== 'ACTIVE';

    // 2-party model: Only the owner participates directly; finders see an informational message
    if (role === 'FINDER') {
      return successResponse({
        id: hs.id,
        role,
        status: expired ? (hs.status === 'ACTIVE' ? 'EXPIRED' : hs.status) : hs.status,
        expiresAt: hs.expiresAt,
        locked: !!hs.locked,
        message: 'The item is with the admin. Only the owner needs to verify with the admin.'
      });
    }

    // OWNER perspective payload
    return successResponse({
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
    });
  } catch (error) {
    return handleApiError(error);
  }
}
