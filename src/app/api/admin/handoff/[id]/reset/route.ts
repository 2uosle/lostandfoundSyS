import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';
import { generateCode, HANDOFF_TTL_MS } from '@/lib/handoff';
import { $Enums } from '@prisma/client';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return errorResponse('Unauthorized - Admin access required', 403);
    }

    const anyPrisma: any = prisma;
    const { id } = await context.params;
    const hs = await anyPrisma.handoffSession.findUnique({ where: { id } });
    if (!hs) return errorResponse('Session not found', 404);

    const updated = await anyPrisma.handoffSession.update({
      where: { id },
      data: {
        ownerCode: generateCode(),
        adminCode: generateCode(),
        ownerAttempts: 0,
        adminAttempts: 0,
        ownerVerifiedAdmin: false,
        adminVerifiedOwner: false,
        locked: false,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + HANDOFF_TTL_MS),
      },
    });

    await prisma.activityLog.create({
      data: {
        // Use existing AdminAction to avoid enum mismatch until Prisma client regeneration
        action: $Enums.AdminAction.RESTORE,
        itemType: 'LOST',
        itemId: updated.lostItemId,
        itemTitle: 'Handoff Reset',
        userId: session.user.id,
        details: JSON.stringify({ handoffSessionId: updated.id }),
      },
    });

    return successResponse({ message: 'Handoff session reset', expiresAt: updated.expiresAt });
  } catch (error) {
    return handleApiError(error);
  }
}
