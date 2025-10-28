import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredRateLimits } from '@/lib/rate-limit';

/**
 * Cron job endpoint to cleanup expired rate limit entries
 * 
 * This endpoint should be called periodically (e.g., every hour) by:
 * - Vercel Cron Jobs (https://vercel.com/docs/cron-jobs)
 * - External cron service (e.g., cron-job.org)
 * - Server cron if self-hosting
 * 
 * Protected by Authorization header to prevent abuse
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[CRON] CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron job not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[CRON] Unauthorized cleanup attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Run cleanup
    const deletedCount = await cleanupExpiredRateLimits();

    return NextResponse.json({
      success: true,
      deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CRON] Rate limit cleanup failed:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
