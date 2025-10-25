import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';
import { HANDOFF_MAX_ATTEMPTS, isExpired, isHandoffComplete } from '@/lib/handoff';
import { $Enums } from '@prisma/client';

type RouteContext = { params: Promise<{ id: string }> };

// Admin verifies owner's code (admin enters the code they see on owner's device)
export async function POST(req: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return errorResponse('Unauthorized - Admin access required', 403);
    }

    const { id } = await context.params;
    const { code } = await req.json();
    if (!code) return errorResponse('Invalid request', 400);

    const anyPrisma: any = prisma;
    const hs = await anyPrisma.handoffSession.findUnique({ where: { id } });
    if (!hs) return errorResponse('Session not found', 404);

    if (hs.locked) return errorResponse('Session is locked', 423);
    if (isExpired(hs.expiresAt) || hs.status !== 'ACTIVE') return errorResponse('Session expired', 410);

    const attemptsField = 'adminAttempts'; // Admin's attempts
    const expectedCode = hs.ownerCode; // Check the owner's code

    if (hs[attemptsField] >= HANDOFF_MAX_ATTEMPTS) {
      await anyPrisma.handoffSession.update({ where: { id: hs.id }, data: { locked: true, status: 'LOCKED' } });
      return errorResponse('Attempt limit exceeded; session locked', 423);
    }

    const correct = code === expectedCode;
    const updateData: any = { [attemptsField]: hs[attemptsField] + 1 };
    if (correct) updateData.adminVerifiedOwner = true;

    const updated = await anyPrisma.handoffSession.update({ where: { id: hs.id }, data: updateData });

    if (!correct) return errorResponse('Incorrect code', 400);

    // Check if handoff is complete (both owner and admin must verify each other)
    if (isHandoffComplete(updated)) {
      const lost = await prisma.lostItem.findUnique({ where: { id: hs.lostItemId }, select: { id: true, title: true } });
      if (lost) {
        await prisma.lostItem.update({ where: { id: lost.id }, data: { status: 'CLAIMED' as any } });
        await prisma.activityLog.create({
          data: {
            action: $Enums.AdminAction.CLAIM,
            itemType: 'LOST',
            itemId: lost.id,
            itemTitle: lost.title,
            userId: session.user.id,
            details: JSON.stringify({ handoffSessionId: hs.id, handoff: 'COMPLETE' }),
          },
        });
      }
      await anyPrisma.handoffSession.update({ where: { id: hs.id }, data: { status: 'COMPLETED' } });
      return successResponse({ message: 'Owner verified! Handoff complete - item marked as claimed.' });
    }

    return successResponse({ message: 'Owner verified by admin. Waiting for owner to verify admin code.' });
  } catch (error) {
    return handleApiError(error);
  }
}
