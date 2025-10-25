import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { foundItemSchema, imageUploadSchema } from '@/lib/validations';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';
import { saveValidatedImage } from '@/lib/image-validation';
import logger, { logRequest, logError } from '@/lib/logger';
import path from 'path';

export async function POST(req: Request) {
  const startTime = Date.now();
  let userId: string | undefined;
  
  try {
    const body = await req.json();
    const session = await getServerSession(authOptions);
    userId = session?.user?.id;

    // Only admins can report found items
    if (!session?.user || session.user.role !== 'ADMIN') {
      return errorResponse('Unauthorized - Only admins can report found items', 403);
    }

    // Image is required for found items
    if (!body.image) {
      return errorResponse('Photo is required for found items', 400);
    }

    // Validate item data
    const validatedItem = foundItemSchema.parse({
      title: body.title,
      description: body.description,
      location: body.location,
      foundDate: body.date,
      category: body.category,
      contactInfo: body.contactInfo,
      userId,
    });

    // Validate image
    imageUploadSchema.parse({ image: body.image });

    // Use transaction to ensure atomicity
    const item = await prisma.$transaction(async (tx) => {
      // Create the found item record
      const createdItem = await tx.foundItem.create({
        data: {
          title: validatedItem.title,
          description: validatedItem.description,
          location: validatedItem.location,
          foundDate: validatedItem.foundDate,
          category: validatedItem.category,
          contactInfo: validatedItem.contactInfo,
          status: 'PENDING',
          userId: validatedItem.userId,
        },
      });

      // Handle image upload within transaction
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      const imageUrl = await saveValidatedImage(body.image, createdItem.id, uploadsDir);
      
      // Update item with image URL
      const updatedItem = await tx.foundItem.update({
        where: { id: createdItem.id },
        data: { imageUrl },
      });
      
      return updatedItem;
    });

    // Find potential matches among lost items (outside transaction for performance)
    const potentialMatches = await prisma.lostItem.findMany({
      where: {
        status: 'PENDING',
        category: validatedItem.category,
      },
      take: 5,
    });

    const duration = Date.now() - startTime;
    logRequest('POST', '/api/items/found', userId, duration, 201);

    return successResponse({
      item,
      potentialMatches: potentialMatches.length,
    }, 201);
  } catch (error) {
    const duration = Date.now() - startTime;
    logError(error as Error, { endpoint: '/api/items/found', userId });
    logRequest('POST', '/api/items/found', userId, duration, 500, (error as Error).message);
    return handleApiError(error);
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return errorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const skip = (page - 1) * limit;

    // Admins see all items, regular users see only their own
    const whereClause = session.user.role === 'ADMIN' 
      ? {} 
      : { userId: session.user.id };

    const [items, total] = await Promise.all([
      prisma.foundItem.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
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
          reportedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.foundItem.count({
        where: whereClause,
      }),
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