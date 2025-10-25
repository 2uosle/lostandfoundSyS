import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';
import { HANDOFF_MAX_ATTEMPTS, inferRole, isExpired, isHandoffComplete } from '@/lib/handoff';
import { $Enums } from '@prisma/client';

// Helper activity log
async function logActivity(
  action: $Enums.AdminAction | any,
  itemType: 'LOST' | 'FOUND',
  itemId: string,
  itemTitle: string,
  userId: string,
  details?: any
) {
  await prisma.activityLog.create({
    data: {
      action,
      itemType,
      itemId,
      itemTitle,
      userId,
      details: details ? JSON.stringify(details) : null,
    },
  });
}

type RouteContext = { params: Promise<{ id: string }> };

// Owner submits admin's code for verification
export async function POST(req: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse('Unauthorized', 401);

    const { code } = await req.json();
    if (!code || typeof code !== 'string') return errorResponse('Code is required', 400);

    const anyPrisma: any = prisma;
    const { id } = await context.params;
    const hs = await anyPrisma.handoffSession.findUnique({ where: { id } });
    if (!hs) return errorResponse('Session not found', 404);

    const role = inferRole(hs, session.user.id);
    if (role !== 'OWNER') return errorResponse('Only the owner can verify in this handoff', 403);

    if (hs.locked) return errorResponse('Session is locked', 423);
    if (isExpired(hs.expiresAt) || hs.status !== 'ACTIVE') return errorResponse('Session expired', 410);

    // Owner verifies admin's code
    const attemptsField = 'ownerAttempts';
    const expectedCode = hs.adminCode;

    if (hs[attemptsField] >= HANDOFF_MAX_ATTEMPTS) {
      await anyPrisma.handoffSession.update({
        where: { id: hs.id },
        data: { locked: true, status: 'LOCKED' },
      });
      return errorResponse('Attempt limit exceeded; session locked', 423);
    }

    const correct = code === expectedCode;

    // Update attempts and verification
    const updateData: any = { [attemptsField]: hs[attemptsField] + 1 };
    if (correct) updateData.ownerVerifiedAdmin = true;

    const updated = await anyPrisma.handoffSession.update({
      where: { id: hs.id },
      data: updateData,
    });

    if (!correct) {
      return errorResponse('Incorrect code', 400);
    }

    // Check if handoff is complete (both owner and admin must verify each other)
    if (isHandoffComplete(updated)) {
      const lost = await prisma.lostItem.findUnique({ where: { id: hs.lostItemId }, select: { id: true, title: true } });
      if (lost) {
        await prisma.lostItem.update({ where: { id: lost.id }, data: { status: 'CLAIMED' as any } });
        await logActivity($Enums.AdminAction.CLAIM, 'LOST', lost.id, lost.title, session.user.id, { handoffSessionId: hs.id, handoff: 'COMPLETE' });
      }
      await anyPrisma.handoffSession.update({ where: { id: hs.id }, data: { status: 'COMPLETED' } });
      return successResponse({ message: 'Admin code verified! Handoff complete - item marked as claimed.' });
    }

    return successResponse({ message: 'Admin code verified! Waiting for admin to verify your code.' });
  } catch (error) {
    return handleApiError(error);
  }
}
