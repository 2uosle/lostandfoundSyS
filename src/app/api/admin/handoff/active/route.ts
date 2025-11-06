import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';

// GET active handoff sessions for admin
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return errorResponse('Unauthorized - Admin access required', 403);
    }

    const anyPrisma: any = prisma;
    
    // Fetch all ACTIVE handoff sessions
    const sessions = await anyPrisma.handoffSession.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        lostItem: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        foundItem: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    return successResponse(sessions);
  } catch (error) {
    return handleApiError(error);
  }
}
