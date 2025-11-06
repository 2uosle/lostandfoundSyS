import { prisma } from '@/lib/prisma';
import { matchRequestSchema } from '@/lib/validations';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';
import { findMatchesForLostItem, findMatchesForFoundItem } from '@/lib/matching';
import logger from '@/lib/logger';

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
          turnedInByName: true,
          turnedInByStudentNumber: true,
          turnedInByContact: true,
          turnedInByDepartment: true,
        },
      });

      // Get declined matches for this lost item
      const declinedMatches = await prisma.declinedMatch.findMany({
        where: { lostItemId: lostItem.id },
        select: { foundItemId: true },
      });
      const declinedFoundItemIds = new Set(declinedMatches.map(dm => dm.foundItemId));

      // Filter out declined matches
      const filteredFoundItems = foundItems.filter(item => !declinedFoundItemIds.has(item.id));

      // Log candidate count for debugging
      logger.info({ type: 'match_request', mode: 'lost->found', lostItemId: lostItem.id, candidateCount: filteredFoundItems.length, declinedCount: declinedFoundItemIds.size, sampleIds: filteredFoundItems.slice(0,5).map(f => f.id) }, 'Match search candidates');

      // Calculate match scores
      const matches = findMatchesForLostItem(lostItem, filteredFoundItems, 10, 20);

      return successResponse({ matches, candidateCount: filteredFoundItems.length });
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

      // Get declined matches for this found item
      const declinedMatches = await prisma.declinedMatch.findMany({
        where: { foundItemId: foundItem.id },
        select: { lostItemId: true },
      });
      const declinedLostItemIds = new Set(declinedMatches.map(dm => dm.lostItemId));

      // Filter out declined matches
      const filteredLostItems = lostItems.filter(item => !declinedLostItemIds.has(item.id));

      // Log candidate count for debugging
      logger.info({ type: 'match_request', mode: 'found->lost', foundItemId: foundItem.id, candidateCount: filteredLostItems.length, declinedCount: declinedLostItemIds.size, sampleIds: filteredLostItems.slice(0,5).map(l => l.id) }, 'Match search candidates');
      console.log(`[MATCH DEBUG] Found ${lostItems.length} PENDING lost items, ${declinedLostItemIds.size} declined, ${filteredLostItems.length} after filtering`);
      console.log('[MATCH DEBUG] Found item:', foundItem);
      console.log('[MATCH DEBUG] Sample lost items:', filteredLostItems.slice(0, 2));

      // Calculate match scores
      const matches = findMatchesForFoundItem(foundItem, filteredLostItems, 10, 20);
      
      console.log(`[MATCH DEBUG] Calculated ${matches.length} matches above threshold`);
      console.log('[MATCH DEBUG] Sample matches:', matches.slice(0, 2));

      return successResponse({ matches, candidateCount: filteredLostItems.length });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
