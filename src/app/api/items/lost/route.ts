import { prisma } from '@/lib/prisma';
import { $Enums } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { lostItemSchema, imageUploadSchema } from '@/lib/validations';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';
import logger, { logRequest, logError } from '@/lib/logger';

export async function POST(req: Request) {
  const startTime = Date.now();
  let userId: string | undefined;
  
  try {
    const body = await req.json();
    const session = await getServerSession(authOptions);
    userId = session?.user?.id;

    // Check if user is authenticated
    if (!session?.user?.id) {
      return errorResponse('Unauthorized - Please login to report items', 401);
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!user) {
      return errorResponse('User not found - Please re-login', 404);
    }

    // Validate item data
    const validatedItem = lostItemSchema.parse({
      title: body.title,
      description: body.description,
      location: body.location,
      lostDate: body.date,
      category: body.category,
      contactInfo: body.contactInfo,
      userId: session.user.id,
    });

    // Validate image if provided
    let validatedImageUrl: string | null = null;
    if (body.image) {
      imageUploadSchema.parse({ image: body.image });
      
      // Validate the image format
      const { validateBase64Image } = await import('@/lib/image-validation');
      const validation = validateBase64Image(body.image);
      if (!validation.valid) {
        throw new Error('Invalid image format');
      }
      
      // Store base64 directly (works on Vercel and locally)
      validatedImageUrl = body.image;
    }

    // Use transaction to ensure atomicity
    const item = await prisma.$transaction(async (tx) => {
      // Create the lost item record
      const createdItem = await tx.lostItem.create({
        data: {
          title: validatedItem.title,
          description: validatedItem.description,
          location: validatedItem.location,
          lostDate: validatedItem.lostDate,
          category: validatedItem.category,
          contactInfo: validatedItem.contactInfo,
          status: 'PENDING',
          userId: validatedItem.userId,
          imageUrl: validatedImageUrl,
        },
      });

      // Create notification for the user
      await tx.notification.create({
        data: {
          userId: validatedItem.userId!,
          type: 'ITEM_REPORTED',
          title: 'Lost Item Reported',
          message: `Your lost item "${validatedItem.title}" has been successfully reported. We'll notify you if we find a match.`,
          itemId: createdItem.id,
          itemType: 'LOST',
        },
      });
      
      return createdItem;
    });

    // Find potential matches among found items (outside transaction for performance)
    const potentialMatches = await prisma.foundItem.findMany({
      where: {
        status: 'PENDING',
        category: validatedItem.category,
      },
      take: 5,
    });

    const duration = Date.now() - startTime;
    logRequest('POST', '/api/items/lost', userId, duration, 201);

    return successResponse({
      item,
      potentialMatches: potentialMatches.length,
    }, 201);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Lost item creation error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
    });
    logError(error as Error, { endpoint: '/api/items/lost', userId });
    logRequest('POST', '/api/items/lost', userId, duration, 500, (error as Error).message);
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
      prisma.lostItem.findMany({
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
      prisma.lostItem.count({
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