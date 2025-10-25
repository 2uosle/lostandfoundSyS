import { prisma } from '@/lib/prisma';
import { Prisma, $Enums } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { adminActionSchema } from '@/lib/validations';
import { sendEmail } from '@/lib/email';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';

/**
 * Helper function to log admin activity
 */
async function logActivity(
  userId: string,
  action: $Enums.AdminAction,
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
  const { action, itemId, matchWithId, itemType } = adminActionSchema.parse(body);

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
          data: { status: $Enums.ItemStatus.ARCHIVED }
        });

        // Log the activity
        await logActivity(
          session.user.id,
          $Enums.AdminAction.ARCHIVE,
          'LOST',
          itemId,
          item.title,
          { category: item.category, location: item.location }
        );

        return successResponse({ message: 'Item archived successfully' });
      }

      case 'handoff': {
        // Start a handoff session for a matched lost item
        const lost = await prisma.lostItem.findUnique({
          where: { id: itemId },
          select: { id: true, title: true, userId: true, matchedItemId: true, status: true },
        });
        if (!lost) return errorResponse('Lost item not found', 404);
        if (lost.status !== 'MATCHED') return errorResponse('Item must be MATCHED to start handoff', 400);
        if (!lost.matchedItemId) return errorResponse('No matched found item to handoff with', 400);

        const found = await prisma.foundItem.findUnique({
          where: { id: lost.matchedItemId },
          select: { id: true, userId: true, title: true },
        });
        if (!found) return errorResponse('Matched found item not found', 404);
        if (!lost.userId || !found.userId) return errorResponse('Both parties must be registered users', 400);

        // Generate 2 codes: owner and admin (finder already gave item to admin)
        const anyPrisma: any = prisma;
        const ownerCode = Math.floor(100000 + Math.random() * 900000).toString();
        const adminCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const hs = await anyPrisma.handoffSession.create({
          data: {
            lostItemId: lost.id,
            foundItemId: found.id,
            ownerUserId: lost.userId,
            finderUserId: found.userId,
            ownerCode,
            adminCode,
            expiresAt,
            status: 'ACTIVE',
          },
        });

        // Notify owner with their code (finder is not involved in verification)
        const notifications = [];
        if (lost.userId) {
          notifications.push(
            prisma.notification.create({
              data: {
                userId: lost.userId,
                type: 'ITEM_MATCHED',
                title: 'Handoff Ready: Your Code',
                message: `Your lost item "${lost.title}" is ready for pickup. Your verification code is: ${ownerCode}. Go to the admin desk and exchange codes to claim your item.`,
                itemId: lost.id,
                itemType: 'LOST',
              },
            })
          );
        }
        if (notifications.length > 0) {
          await Promise.all(notifications);
        }

        // Log using an existing AdminAction to avoid enum mismatch if Prisma Client wasn't regenerated
        await logActivity(session.user.id, $Enums.AdminAction.MATCH, 'LOST', lost.id, lost.title, { handoffSessionId: hs.id, expiresAt, handoff: 'START' });

        return successResponse({ message: 'Handoff session created', handoffSessionId: hs.id, expiresAt });
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
          data: { status: $Enums.ItemStatus.CLAIMED }
        });

        // Log the activity
        await logActivity(
          session.user.id,
          $Enums.AdminAction.CLAIM,
          'LOST',
          itemId,
          item.title,
          { contactInfo: item.contactInfo }
        );

        return successResponse({ message: 'Item marked as claimed' });
      }

      case 'match': {
        // Get both items' details including user IDs
        const [lostItem, foundItem] = await Promise.all([
          prisma.lostItem.findUnique({
            where: { id: itemId },
            select: { title: true, category: true, userId: true },
          }),
          prisma.foundItem.findUnique({
            where: { id: matchWithId },
            select: { title: true, id: true, userId: true },
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
              status: $Enums.ItemStatus.MATCHED
            }
          }),
          prisma.foundItem.update({
            where: { id: matchWithId },
            data: { status: $Enums.ItemStatus.MATCHED }
          })
        ]);

        // Log the match activity for both items
        await Promise.all([
          logActivity(
            session.user.id,
            $Enums.AdminAction.MATCH,
            'LOST',
            itemId,
            lostItem.title,
            { matchedWith: foundItem.id, matchedTitle: foundItem.title }
          ),
          logActivity(
            session.user.id,
            $Enums.AdminAction.MATCH,
            'FOUND',
            matchWithId!,
            foundItem.title,
            { matchedWith: itemId, matchedTitle: lostItem.title }
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
                itemId: itemId,
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
                type: 'MATCH_FOUND',
                title: 'Item Matched!',
                message: `The item you found "${foundItem.title}" has been matched with a lost item "${lostItem.title}".`,
                itemId: matchWithId,
                itemType: 'FOUND',
              },
            })
          );
        }

        if (notifications.length > 0) {
          await Promise.all(notifications);
        }

        // Send email to lost item owner (if available)
        if (lostItem.userId) {
          const user = await prisma.user.findUnique({ where: { id: lostItem.userId }, select: { email: true, name: true } });
          if (user?.email) {
            const subject = 'Lost & Found: We found a match for your item';
            const text = `Hi${user.name ? ' ' + user.name : ''},\n\nGood news! Your lost item "${lostItem.title}" has been matched with a found item "${foundItem.title}". Please sign in to your dashboard to review and proceed.\n\nThank you,\nLost & Found Team`;
            const html = `<p>Hi${user.name ? ' ' + user.name : ''},</p><p><strong>Good news!</strong> Your lost item "${lostItem.title}" has been matched with a found item "${foundItem.title}".</p><p>Please <a href="${process.env.NEXTAUTH_URL || ''}/dashboard">sign in</a> to review and proceed.</p><p>Thank you,<br/>Lost & Found Team</p>`;
            await sendEmail({ to: user.email, subject, text, html });
          }
        }

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
          $Enums.AdminAction.DELETE,
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

      case 'restore': {
        // Restore logic varies by itemType and current status
        if (itemType === 'LOST') {
          const item = await prisma.lostItem.findUnique({ where: { id: itemId }, select: { title: true, status: true } });
          if (!item) return errorResponse('Item not found', 404);

          let target: any = null;
          const current = item.status as any;
          if (current === 'ARCHIVED') target = 'PENDING';
          else if (current === 'DONATED' || current === 'DISPOSED') target = 'ARCHIVED';
          else return errorResponse('Cannot restore from current status', 400);

          await prisma.lostItem.update({ where: { id: itemId }, data: { status: target as any } });
          await logActivity(session.user.id, 'RESTORE' as any, 'LOST', itemId, item.title, { from: item.status, to: target });
          return successResponse({ message: `Item restored to ${target}` });
        } else {
          const item = await prisma.foundItem.findUnique({ where: { id: itemId }, select: { title: true, status: true } });
          if (!item) return errorResponse('Item not found', 404);

          let target: any = null;
          const current = item.status as any;
          if (current === 'ARCHIVED') target = 'PENDING';
          else if (current === 'DONATED' || current === 'DISPOSED') target = 'ARCHIVED';
          else return errorResponse('Cannot restore from current status', 400);

          await prisma.foundItem.update({ where: { id: itemId }, data: { status: target as any } });
          await logActivity(session.user.id, 'RESTORE' as any, 'FOUND', itemId, item.title, { from: item.status, to: target });
          return successResponse({ message: `Item restored to ${target}` });
        }
      }

      case 'donate': {
        const item = await prisma.lostItem.findUnique({ where: { id: itemId }, select: { title: true, userId: true } });
        if (!item) return errorResponse('Item not found', 404);

  await prisma.lostItem.update({ where: { id: itemId }, data: { status: 'DONATED' as any } });
  await logActivity(session.user.id, 'DONATE' as any, 'LOST', itemId, item.title);

        if (item.userId) {
          await prisma.notification.create({
            data: {
              userId: item.userId,
              type: 'ITEM_RESOLVED',
              title: 'Item Donated',
              message: `Your lost item "${item.title}" has been marked as donated by the admin.`,
              itemId,
              itemType: 'LOST',
            },
          });
        }

        return successResponse({ message: 'Item marked as donated' });
      }

      case 'dispose': {
        const item = await prisma.lostItem.findUnique({ where: { id: itemId }, select: { title: true, userId: true } });
        if (!item) return errorResponse('Item not found', 404);

  await prisma.lostItem.update({ where: { id: itemId }, data: { status: 'DISPOSED' as any } });
  await logActivity(session.user.id, 'DISPOSE' as any, 'LOST', itemId, item.title);

        if (item.userId) {
          await prisma.notification.create({
            data: {
              userId: item.userId,
              type: 'ITEM_RESOLVED',
              title: 'Item Disposed',
              message: `Your lost item "${item.title}" has been marked as disposed by the admin.`,
              itemId,
              itemType: 'LOST',
            },
          });
        }

        return successResponse({ message: 'Item marked as disposed' });
      }

      default:
        return errorResponse('Unknown action', 400);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
