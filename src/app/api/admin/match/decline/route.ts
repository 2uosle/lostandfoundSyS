import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';

/**
 * POST /api/admin/match/decline
 * Decline a potential match between lost and found items
 * Body: { lostItemId: string, foundItemId: string, reason?: string }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return errorResponse('Unauthorized - Admin access required', 401);
    }

    const body = await req.json();
    const { lostItemId, foundItemId, reason } = body;

    if (!lostItemId || !foundItemId) {
      return errorResponse('Lost item ID and found item ID are required', 400);
    }

    // Check if items exist
    const [lostItem, foundItem] = await Promise.all([
      prisma.lostItem.findUnique({ where: { id: lostItemId } }),
      prisma.foundItem.findUnique({ where: { id: foundItemId } }),
    ]);

    if (!lostItem) {
      return errorResponse('Lost item not found', 404);
    }

    if (!foundItem) {
      return errorResponse('Found item not found', 404);
    }

    // Create or update declined match record
    const declinedMatch = await prisma.declinedMatch.upsert({
      where: {
        lostItemId_foundItemId: {
          lostItemId,
          foundItemId,
        },
      },
      create: {
        lostItemId,
        foundItemId,
        declinedBy: session.user.id,
        reason,
      },
      update: {
        declinedBy: session.user.id,
        reason,
      },
    });

    // Log the decline action for both items
    await Promise.all([
      prisma.activityLog.create({
        data: {
          action: 'DECLINE_MATCH',
          itemType: 'LOST',
          itemId: lostItemId,
          itemTitle: lostItem.title,
          userId: session.user.id,
          details: JSON.stringify({
            matchedWithId: foundItemId,
            matchedWithTitle: foundItem.title,
            reason: reason || 'No reason provided',
          }),
        },
      }),
      prisma.activityLog.create({
        data: {
          action: 'DECLINE_MATCH',
          itemType: 'FOUND',
          itemId: foundItemId,
          itemTitle: foundItem.title,
          userId: session.user.id,
          details: JSON.stringify({
            matchedWithId: lostItemId,
            matchedWithTitle: lostItem.title,
            reason: reason || 'No reason provided',
          }),
        },
      }),
    ]);

    return successResponse({
      message: 'Match declined successfully',
      declinedMatch,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
