import { prisma } from '@/lib/prisma';
import { matchRequestSchema } from '@/lib/validations';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';
import { findMatchesForLostItem, findMatchesForFoundItem } from '@/lib/matching';

/**
 * POST /api/match
 * Find potential matches for a lost or found item
 * Body: { type: 'lost' | 'found', id: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate request
    const { type, id } = matchRequestSchema.parse(body);

    if (type === 'lost') {
      // Find matches for a lost item
      const lostItem = await prisma.lostItem.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          location: true,
          lostDate: true,
        },
      });

      if (!lostItem) {
        return errorResponse('Lost item not found', 404);
      }

      // Get potential found items (only pending ones)
      const foundItems = await prisma.foundItem.findMany({
        where: { status: 'PENDING' },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          location: true,
          foundDate: true,
          imageUrl: true,
          contactInfo: true,
          reportedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      // Calculate match scores
      const matches = findMatchesForLostItem(lostItem, foundItems, 10, 20);

      return successResponse(matches);
    } else {
      // Find matches for a found item
      const foundItem = await prisma.foundItem.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          location: true,
          foundDate: true,
        },
      });

      if (!foundItem) {
        return errorResponse('Found item not found', 404);
      }

      // Get potential lost items (only pending ones)
      const lostItems = await prisma.lostItem.findMany({
        where: { status: 'PENDING' },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          location: true,
          lostDate: true,
          imageUrl: true,
          contactInfo: true,
          reportedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      // Calculate match scores
      const matches = findMatchesForFoundItem(foundItem, lostItems, 10, 20);

      return successResponse(matches);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
