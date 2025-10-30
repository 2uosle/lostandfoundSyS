import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { errorResponse, successResponse } from '@/lib/api-utils';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export async function GET(req: Request) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return errorResponse('Unauthorized - Admin access required', 403);
    }

    // Get date range (last 30 days by default)
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    // Parallel queries for better performance
    const [
      totalLostItems,
      totalFoundItems,
      matchedItems,
      resolvedItems,
      activeUsers,
      recentActivity,
      categoryStats,
      locationStats,
      dailyStats,
    ] = await Promise.all([
      // Total lost items
      prisma.lostItem.count(),
      
      // Total found items
      prisma.foundItem.count(),
      
      // Matched items (including MATCHED and CLAIMED)
      prisma.lostItem.count({
        where: { 
          status: {
            in: ['MATCHED', 'CLAIMED']
          }
        }
      }),
      
      // Resolved items
      prisma.lostItem.count({
        where: { status: 'RESOLVED' }
      }),
      
      // Active users (users with items in last 30 days)
      prisma.user.count({
        where: {
          OR: [
            {
              lostItems: {
                some: {
                  createdAt: {
                    gte: startDate,
                    lte: endDate,
                  }
                }
              }
            },
            {
              foundItems: {
                some: {
                  createdAt: {
                    gte: startDate,
                    lte: endDate,
                  }
                }
              }
            }
          ]
        }
      }),
      
      // Recent activity logs
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          itemType: true,
          itemTitle: true,
          createdAt: true,
          performedBy: {
            select: {
              name: true,
              email: true,
            }
          }
        }
      }),
      
      // Category breakdown
      prisma.lostItem.groupBy({
        by: ['category'],
        _count: {
          category: true,
        },
        orderBy: {
          _count: {
            category: 'desc',
          }
        }
      }),
      
      // Location breakdown (top 10)
      prisma.lostItem.groupBy({
        by: ['location'],
        where: {
          location: {
            not: null,
          }
        },
        _count: {
          location: true,
        },
        orderBy: {
          _count: {
            location: 'desc',
          }
        },
        take: 10,
      }),
      
      // Daily statistics for the last 30 days
      prisma.$queryRaw`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*) as count,
          'lost' as type
        FROM "LostItem"
        WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
        GROUP BY DATE("createdAt")
        
        UNION ALL
        
        SELECT 
          DATE("createdAt") as date,
          COUNT(*) as count,
          'found' as type
        FROM "FoundItem"
        WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
        GROUP BY DATE("createdAt")
        
        ORDER BY date DESC
      `,
    ]);

    // Calculate match success rate
    const matchSuccessRate = totalLostItems > 0 
      ? ((matchedItems + resolvedItems) / totalLostItems * 100).toFixed(1)
      : '0';

    // Format category stats
    const categories = categoryStats.map(stat => ({
      name: stat.category,
      count: stat._count.category,
    }));

    // Format location stats
    const locations = locationStats.map(stat => ({
      name: stat.location || 'Unknown',
      count: stat._count.location,
    }));

    // Process daily stats for chart
    const dailyData: any = {};
    (dailyStats as any[]).forEach((row: any) => {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { date: dateStr, lost: 0, found: 0 };
      }
      dailyData[dateStr][row.type] = Number(row.count);
    });

    const timeSeriesData = Object.values(dailyData)
      .sort((a: any, b: any) => a.date.localeCompare(b.date));

    return successResponse({
      summary: {
        totalLostItems,
        totalFoundItems,
        matchedItems,
        resolvedItems,
        activeUsers,
        matchSuccessRate: parseFloat(matchSuccessRate),
      },
      categories,
      locations,
      recentActivity,
      timeSeriesData,
    });

  } catch (error: any) {
    console.error('[Analytics API Error]:', error);
    return errorResponse(error.message || 'Failed to fetch analytics', 500);
  }
}
