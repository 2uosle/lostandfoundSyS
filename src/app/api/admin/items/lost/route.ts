import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';

/**
 * GET /api/admin/items/lost
 * Admin-only endpoint to view ALL lost items
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only admins can access this endpoint
    if (!session?.user || session.user.role !== 'ADMIN') {
      return errorResponse('Unauthorized - Admin access required', 403);
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const category = searchParams.get('category') || 'all';

    // Build filter conditions
    const where: any = {};
    
    if (status !== 'all') {
      where.status = status;
    }
    
    if (category !== 'all') {
      where.category = category;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Admin panel: show ALL lost items with filters
    const [items, total] = await Promise.all([
      prisma.lostItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          location: true,
          lostDate: true,
          status: true,
          imageUrl: true,
          contactInfo: true,
          createdAt: true,
          reportedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.lostItem.count({ where }),
    ]);

    return successResponse({
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
