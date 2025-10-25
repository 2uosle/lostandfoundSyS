import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return errorResponse('Unauthorized - Admin access required', 403);
    }

    const { searchParams } = new URL(req.url);
    const statusParam = (searchParams.get('status') || 'all').toUpperCase();
    const validStatuses = ['DONATED', 'DISPOSED'] as const;
    const isAll = statusParam === 'ALL';
    const statuses = isAll
      ? validStatuses
      : (validStatuses.includes(statusParam as any) ? [statusParam as 'DONATED' | 'DISPOSED'] : validStatuses);

    const [lost, found] = await Promise.all([
      prisma.lostItem.findMany({
        where: { status: { in: statuses as any } },
        orderBy: { updatedAt: 'desc' },
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
          updatedAt: true,
          reportedBy: { select: { name: true, email: true } },
        },
      }),
      prisma.foundItem.findMany({
        where: { status: { in: statuses as any } },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          location: true,
          foundDate: true,
          status: true,
          imageUrl: true,
          contactInfo: true,
          createdAt: true,
          updatedAt: true,
          reportedBy: { select: { name: true, email: true } },
        },
      }),
    ]);

    // Normalize items so the UI can render a single list per tab if desired
    const normalize = (arr: any[], type: 'LOST' | 'FOUND') =>
      arr.map((i) => ({
        ...i,
        itemType: type,
        date: type === 'LOST' ? i.lostDate : i.foundDate,
      }));

    return successResponse({
      lost: normalize(lost, 'LOST'),
      found: normalize(found, 'FOUND'),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
