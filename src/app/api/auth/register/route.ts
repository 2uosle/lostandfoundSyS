import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { userSchema } from '@/lib/validations';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate input
    const validatedData = userSchema.parse({
      email: body.email,
      password: body.password,
      name: body.name,
      role: 'STUDENT',
    });

    // Check if user already exists
    const existing = await prisma.user.findUnique({ 
      where: { email: validatedData.email } 
    });
    
    if (existing) {
      return errorResponse('User with this email already exists', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        role: validatedData.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return successResponse(user, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
