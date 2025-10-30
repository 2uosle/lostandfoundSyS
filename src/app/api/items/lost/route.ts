import { prisma } from '@/lib/prisma';
import { $Enums } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { lostItemSchema, imageUploadSchema } from '@/lib/validations';
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
    if (body.image) {
      imageUploadSchema.parse({ image: body.image });
    }

    // Use transaction to ensure atomicity
    const item = await prisma.$transaction(async (tx) => {
      let imageUrl: string | null = null;
      
      // Handle image - on Vercel we can't save to filesystem, so store base64 directly
      if (body.image) {
        // Validate the image format
        const validation = await import('@/lib/image-validation').then(m => m.validateBase64Image(body.image));
        if (!validation.valid) {
          throw new Error('Invalid image format');
        }
        
        // In production (Vercel), store as base64. In development, try to save to disk
        if (process.env.VERCEL) {
          // On Vercel: Store base64 directly (temporary solution)
          imageUrl = body.image;
        } else {
          // Local development: Save to disk
          const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
          imageUrl = await saveValidatedImage(body.image, '', uploadsDir);
        }
      }
      
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
          imageUrl: imageUrl,
        },
      });

      // Create notification for the user
      if (validatedItem.userId) {
        await tx.notification.create({
          data: {
            userId: validatedItem.userId,
            type: $Enums.NotificationType.ITEM_REPORTED,
            title: 'Lost Item Reported',
            message: `Your lost item "${validatedItem.title}" has been successfully reported. We'll notify you if we find a match.`,
            itemId: createdItem.id,
            itemType: 'LOST',
          },
        });
      }
      
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