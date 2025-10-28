import { prisma } from '@/lib/prisma';

type RateLimitOptions = {
  interval: number; // Time window in ms
  uniqueTokenPerInterval?: number; // Not used in DB version but kept for compatibility
};

/**
 * Distributed rate limiter using PostgreSQL
 * Works across multiple server instances
 */
export default function rateLimit(options: RateLimitOptions) {
  return {
    check: async (limit: number, token: string): Promise<void> => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + options.interval);

      try {
        // Clean up expired entries first (done periodically)
        if (Math.random() < 0.1) { // 10% chance to cleanup
          await prisma.rateLimit.deleteMany({
            where: {
              expiresAt: {
                lt: now,
              },
            },
          });
        }

        // Try to find or create the rate limit entry
        const existing = await prisma.rateLimit.findUnique({
          where: { key: token },
        });

        if (!existing || existing.expiresAt < now) {
          // First request or window expired - reset
          await prisma.rateLimit.upsert({
            where: { key: token },
            create: {
              key: token,
              count: 1,
              expiresAt,
            },
            update: {
              count: 1,
              expiresAt,
            },
          });
          return;
        }

        // Increment counter
        const updated = await prisma.rateLimit.update({
          where: { key: token },
          data: {
            count: {
              increment: 1,
            },
          },
        });

        if (updated.count > limit) {
          throw new Error('Rate limit exceeded');
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Rate limit exceeded') {
          throw error;
        }
        // Log database errors but don't block the request
        console.error('[RATE LIMIT] Database error:', error);
        // Fail open - allow the request if DB is down
      }
    },
  };
}

/**
 * Cleanup old rate limit entries
 * Call this periodically (e.g., via a cron job)
 */
export async function cleanupExpiredRateLimits() {
  try {
    const result = await prisma.rateLimit.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    console.log(`[RATE LIMIT] Cleaned up ${result.count} expired entries`);
    return result.count;
  } catch (error) {
    console.error('[RATE LIMIT] Cleanup failed:', error);
    return 0;
  }
}
