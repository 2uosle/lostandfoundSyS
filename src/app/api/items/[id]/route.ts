import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  req: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
    const item = await prisma.lostItem.findUnique({
      where: { id },
      include: {
        reportedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!item) {
      return errorResponse('Item not found', 404);
    }

    return successResponse(item);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: Request,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return errorResponse('Unauthorized', 403);
    }

    const { id } = await context.params;
    const body = await req.json();

    const item = await prisma.lostItem.update({
      where: { id },
      data: body,
    });

    return successResponse(item);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: Request,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return errorResponse('Unauthorized', 403);
    }

    const { id } = await context.params;

    await prisma.lostItem.delete({ where: { id } });

    return successResponse({ message: 'Item deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
