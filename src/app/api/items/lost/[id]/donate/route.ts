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
        status: true,
        title: true,
        category: true,
        location: true,
      },
    });

    if (!lostItem) {
      return errorResponse('Item not found', 404);
    }

    // Users can only donate their own items
    if (lostItem.userId !== session.user.id) {
      return errorResponse('You can only donate your own items', 403);
    }

    // Only allow donate from MATCHED or CLAIMED
    if (lostItem.status !== 'MATCHED' && lostItem.status !== 'CLAIMED') {
      return errorResponse('Item must be matched or claimed before it can be donated', 400);
    }

    // Update the lost item to DONATED
    await prisma.lostItem.update({
      where: { id },
      data: { status: 'DONATED' as any },
    });

    // Log the donation activity
    await logActivity(
      'DONATE' as $Enums.AdminAction,
      'LOST',
      id,
      lostItem.title,
      session.user.id,
      {
        category: lostItem.category,
        location: lostItem.location,
      }
    );

    return successResponse({ message: 'Item marked as donated' });
  } catch (error) {
    return handleApiError(error);
  }
}
