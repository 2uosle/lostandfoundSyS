import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import rateLimit from '@/lib/rate-limit';

// Rate limiters for different endpoint types
const authLimiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 1000,
});

const apiLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000,
});

const writeLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000,
});

/**
 * Get identifier for rate limiting (IP or user ID if authenticated)
 */
function getRateLimitIdentifier(req: NextRequest, token: any): string {
  // Prefer user ID for authenticated requests
  if (token?.sub) {
    return `user:${token.sub}`;
  }
  
  // Fall back to IP address
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    ?? req.headers.get('x-real-ip') 
    ?? 'unknown';
  
  return `ip:${ip}`;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const identifier = getRateLimitIdentifier(req, token);

  // Rate limit authentication endpoints (stricter limits)
  if (pathname.startsWith('/api/auth/register') || pathname.startsWith('/api/auth/signin')) {
    const key = `auth:${identifier}`;
    try {
      await authLimiter.check(5, key); // 5 attempts per 15 min
    } catch {
      console.warn(`[SECURITY] Auth rate limit exceeded for ${pathname} by ${identifier}`);
      return NextResponse.json(
        { error: 'Too many authentication attempts. Please try again later.' },
        { status: 429 }
      );
    }
  }

  // Rate limit write operations (POST, PUT, DELETE, PATCH)
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const key = `write:${identifier}`;
    
    // Stricter limits for certain endpoints
    if (pathname.startsWith('/api/items') || 
        pathname.startsWith('/api/handoff') ||
        pathname.startsWith('/api/notifications')) {
      try {
        await writeLimiter.check(10, key); // 10 write operations per minute
      } catch {
        console.warn(`[SECURITY] Write rate limit exceeded for ${pathname} by ${identifier}`);
        return NextResponse.json(
          { error: 'Too many requests. Please slow down.' },
          { status: 429 }
        );
      }
    }
  }

  // General API rate limiting (read operations)
  if (pathname.startsWith('/api/') && req.method === 'GET') {
    const key = `api:${identifier}`;
    try {
      await apiLimiter.check(60, key); // 60 requests per minute
    } catch {
      console.warn(`[SECURITY] API rate limit exceeded for ${pathname} by ${identifier}`);
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!token || token.role !== 'ADMIN') {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // Add security headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CSRF Protection - ensure same-origin requests only
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  
  if (origin && host) {
    const originUrl = new URL(origin);
    if (originUrl.host === host) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
  }
  
  // Only set HSTS in production with HTTPS
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*']
};
