import { prisma } from '@/lib/prisma';
import { $Enums } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';
import { inferRole, isExpired } from '@/lib/handoff';

type RouteContext = { params: Promise<{ lostItemId: string }> };

// GET handoff session by lost item ID
export async function GET(_req: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse('Unauthorized', 401);

    const { lostItemId } = await context.params;
    
    const anyPrisma: any = prisma;
    const hs = await anyPrisma.handoffSession.findFirst({
      where: { lostItemId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
    
    if (!hs) {
      console.log('No active handoff session found for lost item:', lostItemId);
      return successResponse({ session: null });
    }

    const role = inferRole(hs, session.user.id);
    if (!role) {
      console.log('User not a participant:', session.user.id);
      return errorResponse('Not a participant of this session', 403);
    }

  const expired = isExpired(hs.expiresAt) || hs.status !== 'ACTIVE';

    const payload: any = {
      id: hs.id,
      role,
  status: expired ? (hs.status === 'ACTIVE' ? 'EXPIRED' : hs.status) : hs.status,
      expiresAt: hs.expiresAt,
      locked: !!hs.locked,
      ownerVerifiedAdmin: !!hs.ownerVerifiedAdmin,
      adminVerifiedOwner: !!hs.adminVerifiedOwner,
    };

    if (role === 'OWNER') {
      payload.ownerCode = hs.ownerCode;
    } else if (role === 'FINDER') {
      // Finder doesn't participate in verification, but we show them status
      payload.message = 'The item has been handed to admin. Only the owner needs to verify.';
    }

    console.log('Returning handoff session payload:', payload);
    return successResponse(payload);
  } catch (error) {
    console.error('Error in handoff by-item API:', error);
    return handleApiError(error);
  }
}
