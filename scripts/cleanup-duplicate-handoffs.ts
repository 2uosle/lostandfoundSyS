import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicateHandoffs() {
  console.log('🔍 Checking for duplicate ACTIVE handoff sessions...');

  // Find all ACTIVE sessions grouped by lostItemId
  const activeSessions = await prisma.handoffSession.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' }, // Keep oldest
  });

  // Group by lostItemId
  const grouped = new Map<string, typeof activeSessions>();
  for (const session of activeSessions) {
    const existing = grouped.get(session.lostItemId) || [];
    existing.push(session);
    grouped.set(session.lostItemId, existing);
  }

  // Find duplicates
  let duplicateCount = 0;
  for (const [lostItemId, sessions] of grouped.entries()) {
    if (sessions.length > 1) {
      console.log(`\n⚠️  Found ${sessions.length} ACTIVE sessions for lostItemId: ${lostItemId}`);
      
      // Keep the first (oldest), mark others as EXPIRED
      const [keep, ...expire] = sessions;
      console.log(`   ✅ Keeping session: ${keep.id} (created: ${keep.createdAt})`);
      
      for (const session of expire) {
        console.log(`   ❌ Expiring session: ${session.id} (created: ${session.createdAt})`);
        await prisma.handoffSession.update({
          where: { id: session.id },
          data: { status: 'EXPIRED' },
        });
        duplicateCount++;
      }
    }
  }

  if (duplicateCount === 0) {
    console.log('\n✅ No duplicate ACTIVE sessions found!');
  } else {
    console.log(`\n✅ Cleaned up ${duplicateCount} duplicate session(s)`);
  }

  await prisma.$disconnect();
}

cleanupDuplicateHandoffs().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
