import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: Request) {
  try {
  const data = await req.json();
  const { title, description, location, date, category, contactInfo } = data;
  // Attach server-side user if available
  const session: any = await getServerSession(authOptions as any);
  const userId: string | undefined = session?.user?.id;

    // Validate required fields
    if (!title || !description || !location || !date || !category || !contactInfo) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create the lost item record
    const createData: any = {
      title,
      description,
      location,
      lostDate: new Date(date),
      category,
      contactInfo,
      status: 'PENDING',
    };
    if (userId) createData.userId = userId;

    const item = await prisma.lostItem.create({ data: createData });

    // If client sent an image (base64), save it to public/uploads and update record
    if (data.image) {
      try {
        const matches = /^data:(image\/(png|jpeg));base64,(.+)$/.exec(data.image);
        if (matches) {
          const ext = matches[2] === 'jpeg' ? 'jpg' : matches[2];
          const b64 = matches[3];
          const buffer = Buffer.from(b64, 'base64');
          const filename = `${item.id}.${ext}`;
          const fs = await import('fs');
          const path = await import('path');
          const outPath = path.join(process.cwd(), 'public', 'uploads', filename);
          fs.writeFileSync(outPath, buffer);
          await prisma.lostItem.update({ where: { id: item.id }, data: { imageUrl: `/uploads/${filename}` } });
          item.imageUrl = `/uploads/${filename}`;
        }
      } catch (err) {
        console.error('Failed to save image:', err);
      }
    }

    // Find potential matches among found items
    const potentialMatches = await prisma.foundItem.findMany({
      where: {
        status: 'PENDING',
        category: category,
      },
    });

    return NextResponse.json({
      success: true,
      item,
      potentialMatches: potentialMatches.length,
    });
  } catch (error: any) {
    console.error('Error creating lost item:', error?.stack || error);
    const msg = error?.message || String(error);
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    // Get session to check if user is admin
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await prisma.lostItem.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching lost items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lost items' },
      { status: 500 }
    );
  }
}