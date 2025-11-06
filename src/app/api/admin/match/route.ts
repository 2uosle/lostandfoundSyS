import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';
import { sendMatchNotification } from '@/lib/email';
import { calculateMatchScore } from '@/lib/matching';
import { $Enums } from '@prisma/client';

/**
 * POST /api/admin/match
 * Admin-only endpoint to create a match between lost and found items
 * Body: { lostItemId: string, foundItemId: string }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only admins can create matches
    if (!session?.user || session.user.role !== 'ADMIN') {
      return errorResponse('Unauthorized - Admin access required', 403);
    }

    const body = await req.json();
    const { lostItemId, foundItemId } = body;

    if (!lostItemId || !foundItemId) {
      return errorResponse('Both lostItemId and foundItemId are required', 400);
    }

    // Get both items' details
    const [lostItem, foundItem] = await Promise.all([
      prisma.lostItem.findUnique({
        where: { id: lostItemId },
        select: { 
          id: true,
          title: true, 
          description: true,
          category: true, 
          userId: true,
          location: true,
          lostDate: true,
          status: true,
        },
      }),
      prisma.foundItem.findUnique({
        where: { id: foundItemId },
        select: { 
          id: true,
          title: true, 
          description: true,
          category: true,
          location: true,
          foundDate: true,
          userId: true,
          status: true,
        },
      }),
    ]);

    if (!lostItem) {
      return errorResponse('Lost item not found', 404);
    }

    if (!foundItem) {
      return errorResponse('Found item not found', 404);
    }

    // Check if items are already matched
    if (lostItem.status === 'MATCHED') {
      return errorResponse('Lost item is already matched', 400);
    }

    if (foundItem.status === 'MATCHED') {
      return errorResponse('Found item is already matched', 400);
    }

    // Calculate match score for logging
    const matchScore = calculateMatchScore(
      {
        id: lostItem.id,
        title: lostItem.title,
        description: lostItem.description,
        category: lostItem.category,
        location: lostItem.location,
        lostDate: lostItem.lostDate,
      },
      {
        id: foundItem.id,
        title: foundItem.title,
        description: foundItem.description,
        category: foundItem.category,
        location: foundItem.location || '',
        foundDate: foundItem.foundDate,
      }
    );

    // Link both items using relation
    await prisma.$transaction([
      prisma.lostItem.update({
        where: { id: lostItemId },
        data: {
          matchedWith: { connect: { id: foundItemId } },
          status: $Enums.ItemStatus.MATCHED
        }
      }),
      prisma.foundItem.update({
        where: { id: foundItemId },
        data: { status: $Enums.ItemStatus.MATCHED }
      })
    ]);

    // Log the match activity for both items
    const logActivity = async (userId: string, action: any, itemType: 'LOST' | 'FOUND', itemId: string, itemTitle: string, details: any) => {
      await prisma.activityLog.create({
        data: {
          userId,
          action,
          itemType,
          itemId,
          itemTitle,
          details: JSON.stringify(details),
        },
      });
    };

    await Promise.all([
      logActivity(
        session.user.id,
        $Enums.AdminAction.MATCH,
        'LOST',
        lostItemId,
        lostItem.title,
        { matchedWith: foundItem.id, matchedTitle: foundItem.title, matchScore: Math.round(matchScore.score) }
      ),
      logActivity(
        session.user.id,
        $Enums.AdminAction.MATCH,
        'FOUND',
        foundItemId,
        foundItem.title,
        { matchedWith: lostItem.id, matchedTitle: lostItem.title, matchScore: Math.round(matchScore.score) }
      ),
    ]);

    // Create notifications for users
    const notifications = [];
    
    // Notify the lost item owner
    if (lostItem.userId) {
      notifications.push(
        prisma.notification.create({
          data: {
            userId: lostItem.userId,
            type: 'ITEM_MATCHED',
            title: 'Match Found!',
            message: `Your lost item "${lostItem.title}" has been matched with a found item "${foundItem.title}". Check your dashboard for details.`,
            itemId: lostItemId,
            itemType: 'LOST',
          },
        })
      );
    }
    
    // Notify the found item owner
    if (foundItem.userId) {
      notifications.push(
        prisma.notification.create({
          data: {
            userId: foundItem.userId,
            type: 'ITEM_MATCHED',
            title: 'Match Found!',
            message: `The found item "${foundItem.title}" you reported has been matched with a lost item "${lostItem.title}".`,
            itemId: foundItemId,
            itemType: 'FOUND',
          },
        })
      );
    }

    if (notifications.length > 0) {
      await Promise.all(notifications);
    }

    // Send email notifications
    if (lostItem.userId) {
      try {
        const user = await prisma.user.findUnique({ 
          where: { id: lostItem.userId },
          select: { email: true, name: true }
        });
        
        if (user?.email) {
          await sendMatchNotification({
            userEmail: user.email,
            userName: user.name || 'User',
            lostItemTitle: lostItem.title,
            lostItemDescription: lostItem.description,
            foundItemTitle: foundItem.title,
            foundItemDescription: foundItem.description,
            matchScore: Math.round(matchScore.score),
            dashboardUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`,
          });
        }
      } catch (emailError) {
        console.error('Failed to send match notification email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return successResponse({ 
      message: 'Items matched successfully',
      lostItem: { id: lostItem.id, title: lostItem.title },
      foundItem: { id: foundItem.id, title: foundItem.title },
      matchScore: Math.round(matchScore.score)
    });
  } catch (error) {
    console.error('Match creation error:', error);
    return handleApiError(error);
  }
}
