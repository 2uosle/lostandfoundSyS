import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 CHECKING DATABASE STATE\n');
  console.log('═'.repeat(80));

  try {
    // Check users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    console.log('\n👥 USERS IN DATABASE:');
    console.log(`Total: ${users.length} users (showing last 10)\n`);
    
    if (users.length === 0) {
      console.log('❌ No users found! You need to create a user first.');
      console.log('   Run: npm run db:seed');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Created: ${user.createdAt.toISOString()}`);
        console.log('');
      });
    }

    // Check lost items
    const lostItems = await prisma.lostItem.count();
    console.log(`\n📦 LOST ITEMS: ${lostItems}`);

    // Check found items
    const foundItems = await prisma.foundItem.count();
    console.log(`✨ FOUND ITEMS: ${foundItems}`);

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Database check complete!\n');

    if (users.length === 0) {
      console.log('📋 NEXT STEPS:');
      console.log('   1. Run: npm run db:seed');
      console.log('   2. Login with: admin@neu.edu.ph / Password123!');
    } else {
      console.log('📋 IF YOU GET "Foreign key constraint violated" ERROR:');
      console.log('   1. Logout from your browser');
      console.log('   2. Clear browser cookies for localhost:3000');
      console.log('   3. Login again with one of the users above');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
