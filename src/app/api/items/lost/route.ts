import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { lostItemSchema, imageUploadSchema } from '@/lib/validations';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Validate item data
    const validatedItem = lostItemSchema.parse({
      title: body.title,
      description: body.description,
      location: body.location,
      lostDate: body.date,
      category: body.category,
      contactInfo: body.contactInfo,
      userId,
    });

    // Validate image if provided
    if (body.image) {
      imageUploadSchema.parse({ image: body.image });
    }

    // Create the lost item record
    const item = await prisma.lostItem.create({
      data: {
        title: validatedItem.title,
        description: validatedItem.description,
        location: validatedItem.location,
        lostDate: validatedItem.lostDate,
        category: validatedItem.category,
        contactInfo: validatedItem.contactInfo,
        status: 'PENDING',
        userId: validatedItem.userId,
      },
    });

    // Handle image upload asynchronously
    if (body.image) {
      try {
        const matches = /^data:(image\/(png|jpeg));base64,(.+)$/.exec(body.image);
        if (matches) {
          const ext = matches[2] === 'jpeg' ? 'jpg' : matches[2];
          const b64 = matches[3];
          const buffer = Buffer.from(b64, 'base64');
          const filename = `${item.id}.${ext}`;
          
          // Ensure uploads directory exists
          const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
          await fs.mkdir(uploadsDir, { recursive: true });
          
          // Write file asynchronously
          const outPath = path.join(uploadsDir, filename);
          await fs.writeFile(outPath, buffer);
          
          // Update item with image URL
          await prisma.lostItem.update({
            where: { id: item.id },
            data: { imageUrl: `/uploads/${filename}` }
          });
          
          item.imageUrl = `/uploads/${filename}`;
        }
      } catch (imageError) {
        console.error('Failed to save image:', imageError);
        // Continue without image rather than failing the entire request
      }
    }

    // Find potential matches among found items
    const potentialMatches = await prisma.foundItem.findMany({
      where: {
        status: 'PENDING',
        category: validatedItem.category,
      },
      take: 5,
    });

    return successResponse({
      item,
      potentialMatches: potentialMatches.length,
    }, 201);
  } catch (error) {
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