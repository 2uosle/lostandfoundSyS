import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';

type RouteContext = { params: Promise<{ id: string }> };

// GET admin handoff session details (includes admin code for admin console)
export async function GET(_req: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return errorResponse('Unauthorized - Admin access required', 403);
    }

    const { id } = await context.params;
    const anyPrisma: any = prisma;
    const hs = await anyPrisma.handoffSession.findUnique({ where: { id } });
    if (!hs) return errorResponse('Session not found', 404);

    return successResponse({
      id: hs.id,
      lostItemId: hs.lostItemId,
      foundItemId: hs.foundItemId,
      ownerUserId: hs.ownerUserId,
      finderUserId: hs.finderUserId,
      adminCode: hs.adminCode, // Admin can see their own code
      ownerVerifiedAdmin: !!hs.ownerVerifiedAdmin,
      adminVerifiedOwner: !!hs.adminVerifiedOwner,
      ownerAttempts: hs.ownerAttempts,
      adminAttempts: hs.adminAttempts,
      expiresAt: hs.expiresAt,
      locked: !!hs.locked,
      status: hs.status,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
