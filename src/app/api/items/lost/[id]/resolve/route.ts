import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';
import { $Enums } from '@prisma/client';

// Helper function to log activity
async function logActivity(
  action: $Enums.AdminAction,
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

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  req: Request,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = await context.params;

    // Check if the lost item belongs to the user
    const lostItem = await prisma.lostItem.findUnique({
      where: { id },
      select: { 
        userId: true, 
        matchedItemId: true,
        status: true,
        title: true,
        category: true,
        location: true,
      },
    });

    if (!lostItem) {
      return errorResponse('Item not found', 404);
    }

    // Users can only resolve their own items
    if (lostItem.userId !== session.user.id) {
      return errorResponse('You can only resolve your own items', 403);
    }

    // Check if item is matched or claimed (can't resolve pending items)
    if (lostItem.status !== 'MATCHED' && lostItem.status !== 'CLAIMED') {
      return errorResponse('Item must be matched or claimed before it can be resolved', 400);
    }

    // Fetch matched found item details if exists
    let matchedFoundItem = null;
    if (lostItem.matchedItemId) {
      matchedFoundItem = await prisma.foundItem.findUnique({
        where: { id: lostItem.matchedItemId },
        select: { title: true },
      });
    }

    // Update both the lost item and its matched found item
    const updates = [];
    
    // Update the lost item to RESOLVED
    updates.push(
      prisma.lostItem.update({
        where: { id },
        data: { status: 'RESOLVED' },
      })
    );

    // If there's a matched found item, also mark it as RESOLVED
    if (lostItem.matchedItemId) {
      updates.push(
        prisma.foundItem.update({
          where: { id: lostItem.matchedItemId },
          data: { status: 'RESOLVED' },
        })
      );
    }

    // Execute all updates in a transaction
    await prisma.$transaction(updates);

    // Log the resolution activity
    await logActivity(
      'RESOLVE' as $Enums.AdminAction,
      'LOST',
      id,
      lostItem.title,
      session.user.id,
      {
        matchedWith: lostItem.matchedItemId,
        matchedTitle: matchedFoundItem?.title,
        category: lostItem.category,
        location: lostItem.location,
      }
    );

    return successResponse({ 
      message: 'Item marked as resolved',
      matchedItemAlsoResolved: !!lostItem.matchedItemId 
    });
  } catch (error) {
    return handleApiError(error);
  }
}

