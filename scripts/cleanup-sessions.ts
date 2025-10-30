import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupSessions() {
  console.log('🧹 DATABASE CLEANUP\n');
  console.log('═'.repeat(80));

  try {
    console.log('\n📋 This script helps fix foreign key constraint errors.\n');
    console.log('The error usually happens when your session references a deleted user.\n');
    
    console.log('Solutions:');
    console.log('  1. ✅ Logout from your browser (clears session)');
    console.log('  2. ✅ Clear browser cookies for localhost:3000');
    console.log('  3. ✅ Login again with a valid user\n');

    // Check for users
    const userCount = await prisma.user.count();
    console.log(`Current users in database: ${userCount}`);

    if (userCount === 0) {
      console.log('\n⚠️  No users found! Run: npm run db:seed');
    } else {
      const users = await prisma.user.findMany({
        select: { email: true, role: true },
        take: 5,
      });
      console.log('\nAvailable users:');
      users.forEach(u => console.log(`  - ${u.email} (${u.role})`));
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Check complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupSessions();
