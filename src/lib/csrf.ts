import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest } from 'next/server';

/**
 * CSRF Protection for API routes
 * 
 * NextAuth already provides CSRF protection for auth routes,
 * but we add an extra layer for our custom API endpoints.
 */

/**
 * Verify CSRF token from request headers
 * This uses the session token as proof of authenticity
 */
export async function verifyCsrfToken(req: NextRequest): Promise<boolean> {
  // Get session - if user is authenticated, they have a valid session token
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return false; // Not authenticated = no CSRF protection needed (will fail auth check anyway)
  }

  // For authenticated requests, verify the origin header matches
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  
  if (!origin || !host) {
    return false;
  }

  // Verify origin matches host (prevents cross-origin requests)
  const originUrl = new URL(origin);
  if (originUrl.host !== host) {
    return false;
  }

  return true;
}

/**
 * Middleware wrapper for CSRF-protected routes
 */
export function withCsrfProtection<T>(
  handler: (req: NextRequest) => Promise<T>
) {
  return async (req: NextRequest): Promise<T | Response> => {
    // Only check CSRF for state-changing methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const isValid = await verifyCsrfToken(req);
      
      if (!isValid) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid request origin. Possible CSRF attack.' 
          }),
          { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        ) as any;
      }
    }

    return handler(req);
  };
}
