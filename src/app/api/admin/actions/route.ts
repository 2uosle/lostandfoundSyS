import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { adminActionSchema } from '@/lib/validations';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';

/**
 * Helper function to log admin activity
 */
async function logActivity(
  userId: string,
  action: 'MATCH' | 'CLAIM' | 'ARCHIVE' | 'DELETE',
  itemType: 'LOST' | 'FOUND',
  itemId: string,
  itemTitle: string,
  details?: Record<string, any>
): Promise<void> {
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

export async function POST(req: Request) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return errorResponse('Unauthorized - Admin access required', 403);
    }

    const body = await req.json();
    
    // Validate request
    const { action, itemId, matchWithId } = adminActionSchema.parse(body);

    switch (action) {
      case 'archive': {
        // Get item details before archiving
        const item = await prisma.lostItem.findUnique({
          where: { id: itemId },
          select: { title: true, category: true, location: true },
        });

        if (!item) {
          return errorResponse('Item not found', 404);
        }

        // Archive the item
        await prisma.lostItem.update({
          where: { id: itemId },
          data: { status: 'ARCHIVED' }
        });

        // Log the activity
        await logActivity(
          session.user.id,
          'ARCHIVE',
          'LOST',
          itemId,
          item.title,
          { category: item.category, location: item.location }
        );

        return successResponse({ message: 'Item archived successfully' });
      }

      case 'claim': {
        // Get item details before claiming
        const item = await prisma.lostItem.findUnique({
          where: { id: itemId },
          select: { title: true, contactInfo: true },
        });

        if (!item) {
          return errorResponse('Item not found', 404);
        }

        // Mark as claimed
        await prisma.lostItem.update({
          where: { id: itemId },
          data: { status: 'CLAIMED' }
        });

        // Log the activity
        await logActivity(
          session.user.id,
          'CLAIM',
          'LOST',
          itemId,
          item.title,
          { contactInfo: item.contactInfo }
        );

        return successResponse({ message: 'Item marked as claimed' });
      }

      case 'match': {
        // Get both items' details
        const [lostItem, foundItem] = await Promise.all([
          prisma.lostItem.findUnique({
            where: { id: itemId },
            select: { title: true, category: true },
          }),
          prisma.foundItem.findUnique({
            where: { id: matchWithId },
            select: { title: true, id: true },
          }),
        ]);

        if (!lostItem || !foundItem) {
          return errorResponse('One or both items not found', 404);
        }

        // Link both items using relation
        await prisma.$transaction([
          prisma.lostItem.update({
            where: { id: itemId },
            data: {
              matchedWith: { connect: { id: matchWithId } },
              status: 'MATCHED'
            }
          }),
          prisma.foundItem.update({
            where: { id: matchWithId },
            data: { status: 'MATCHED' }
          })
        ]);

        // Log the match activity for both items
        await Promise.all([
          logActivity(
            session.user.id,
            'MATCH',
            'LOST',
            itemId,
            lostItem.title,
            { matchedWith: foundItem.id, matchedTitle: foundItem.title }
          ),
          logActivity(
            session.user.id,
            'MATCH',
            'FOUND',
            matchWithId!,
            foundItem.title,
            { matchedWith: itemId, matchedTitle: lostItem.title }
          ),
        ]);

        return successResponse({ message: 'Items matched successfully' });
      }

      case 'delete': {
        // Get item details before deletion
        const item = await prisma.lostItem.findUnique({
          where: { id: itemId },
          select: { 
            title: true, 
            category: true, 
            description: true,
            location: true,
            lostDate: true,
          },
        });

        if (!item) {
          return errorResponse('Item not found', 404);
        }

        // Delete the item
        await prisma.lostItem.delete({ where: { id: itemId } });

        // Log the deletion
        await logActivity(
          session.user.id,
          'DELETE',
          'LOST',
          itemId,
          item.title,
          { 
            category: item.category,
            description: item.description,
            location: item.location,
            lostDate: item.lostDate.toISOString(),
          }
        );

        return successResponse({ message: 'Item deleted successfully' });
      }

      default:
        return errorResponse('Unknown action', 400);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
