import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Standard error response format
 */
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    { 
      success: false, 
      error: message,
      timestamp: new Date().toISOString()
    },
    { status }
  );
}

/**
 * Standard success response format
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString()
    },
    { status }
  );
}

/**
 * Handle Zod validation errors
 */
export function handleValidationError(error: ZodError) {
  // Zod v3 exposes validation problems on `issues` (not `errors`)
  const errors = error.issues.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      errors,
      timestamp: new Date().toISOString()
    },
    { status: 400 }
  );
}

/**
 * Generic error handler for API routes
 */
export function handleApiError(error: unknown) {
  console.error('API Error:', error);

  if (error instanceof ZodError) {
    return handleValidationError(error);
  }

  // Don't expose internal errors in production
  const isDev = process.env.NODE_ENV === 'development';
  const message = isDev && error instanceof Error 
    ? error.message 
    : 'An unexpected error occurred';

  return errorResponse(message, 500);
}

/**
 * Extract pagination params from URL
 */
export function getPaginationParams(searchParams: URLSearchParams) {
  return {
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: Math.min(parseInt(searchParams.get('limit') || '20', 10), 100),
    search: searchParams.get('search') || undefined,
    category: searchParams.get('category') || 'all',
    status: searchParams.get('status') || 'all',
  };
}

/**
 * Calculate pagination metadata
 */
export function getPaginationMeta(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

