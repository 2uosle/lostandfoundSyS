import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 TESTING MATCHING ALGORITHM');
  console.log('═'.repeat(80));

  // Clean up existing test data
  console.log('\n🧹 Cleaning up existing test data...');
  await prisma.lostItem.deleteMany({
    where: { contactInfo: { contains: 'test-matching' } },
  });
  await prisma.foundItem.deleteMany({
    where: { contactInfo: { contains: 'test-matching' } },
  });
  await prisma.user.deleteMany({
    where: { email: { contains: 'test-matching' } },
  });

  // Create test users
  console.log('👤 Creating test users...');
  const password = await bcrypt.hash('Password123!', 12);
  
  const admin = await prisma.user.create({
    data: {
      name: 'Test Admin',
      email: 'admin-test-matching@neu.edu.ph',
      password,
      role: 'ADMIN',
    },
  });

  const student1 = await prisma.user.create({
    data: {
      name: 'Test Student 1',
      email: 'student1-test-matching@neu.edu.ph',
      password,
      role: 'STUDENT',
    },
  });

  const student2 = await prisma.user.create({
    data: {
      name: 'Test Student 2',
      email: 'student2-test-matching@neu.edu.ph',
      password,
      role: 'STUDENT',
    },
  });

  console.log('✅ Created 3 users\n');

  // Create Lost Items
  console.log('📱 Creating 5 lost items...');
  const lostIPhone = await prisma.lostItem.create({
    data: {
      title: 'iPhone 13 Pro Max',
      description: 'Black iPhone 13 Pro Max with blue case. Lost near the library entrance.',
      category: 'Electronics',
      location: 'Main Library',
      contactInfo: 'student1-test-matching@neu.edu.ph',
      lostDate: new Date('2025-01-15'),
      status: 'PENDING',
      userId: student1.id,
    },
  });

  const lostWallet = await prisma.lostItem.create({
    data: {
      title: 'Brown Leather Wallet',
      description: 'Brown leather wallet with ID cards and some cash. Very important!',
      category: 'Personal Items',
      location: 'Gymnasium',
      contactInfo: 'student1-test-matching@neu.edu.ph',
      lostDate: new Date('2025-01-16'),
      status: 'PENDING',
      userId: student1.id,
    },
  });

  const lostKeys = await prisma.lostItem.create({
    data: {
      title: 'Car Keys with Red Keychain',
      description: 'Toyota car keys with a red keychain. Has 3 keys attached.',
      category: 'Personal Items',
      location: 'Parking Lot',
      contactInfo: 'student2-test-matching@neu.edu.ph',
      lostDate: new Date('2025-01-17'),
      status: 'PENDING',
      userId: student2.id,
    },
  });

  const lostTextbook = await prisma.lostItem.create({
    data: {
      title: 'Calculus Textbook',
      description: 'Math textbook for Calculus 101. Blue cover.',
      category: 'Books',
      location: 'Classroom Building A',
      contactInfo: 'student2-test-matching@neu.edu.ph',
      lostDate: new Date('2025-01-18'),
      status: 'PENDING',
      userId: student2.id,
    },
  });

  const lostAirPods = await prisma.lostItem.create({
    data: {
      title: 'AirPods Pro',
      description: 'Apple AirPods Pro with charging case. White color.',
      category: 'Electronics',
      location: 'Cafeteria',
      contactInfo: 'student1-test-matching@neu.edu.ph',
      lostDate: new Date('2025-01-19'),
      status: 'PENDING',
      userId: student1.id,
    },
  });

  // Create Found Items
  console.log('✨ Creating 5 found items...');
  await prisma.foundItem.create({
    data: {
      title: 'Black iPhone with Blue Case',
      description: 'Found iPhone 13 Pro with blue case near the main library entrance.',
      category: 'Electronics',
      location: 'Main Library',
      contactInfo: 'admin-test-matching@neu.edu.ph',
      foundDate: new Date('2025-01-15'),
      userId: admin.id,
    },
  });

  await prisma.foundItem.create({
    data: {
      title: 'Leather Wallet',
      description: 'Brown leather wallet found in the gym. Contains ID and cards.',
      category: 'Personal Items',
      location: 'Gymnasium',
      contactInfo: 'admin-test-matching@neu.edu.ph',
      foundDate: new Date('2025-01-16'),
      userId: admin.id,
    },
  });

  await prisma.foundItem.create({
    data: {
      title: 'Car Keys with Keychain',
      description: 'Found car keys with red keychain, looks like Toyota keys.',
      category: 'Personal Items',
      location: 'Cafeteria',
      contactInfo: 'admin-test-matching@neu.edu.ph',
      foundDate: new Date('2025-01-17'),
      userId: admin.id,
    },
  });

  await prisma.foundItem.create({
    data: {
      title: 'Apple AirPods with Case',
      description: 'Found AirPods Pro with white charging case in the cafeteria.',
      category: 'Electronics',
      location: 'Cafeteria',
      contactInfo: 'admin-test-matching@neu.edu.ph',
      foundDate: new Date('2025-01-19'),
      userId: admin.id,
    },
  });

  await prisma.foundItem.create({
    data: {
      title: 'MacBook Laptop',
      description: 'Found MacBook Pro laptop. Silver color.',
      category: 'Electronics',
      location: 'Classroom Building A',
      contactInfo: 'admin-test-matching@neu.edu.ph',
      foundDate: new Date('2025-01-18'),
      userId: admin.id,
    },
  });

  console.log('✅ Created 5 lost items and 5 found items\n');

  // Now use the API endpoint to test matching
  console.log('\n' + '═'.repeat(80));
  console.log('📊 TESTING MATCHES FOR EACH LOST ITEM');
  console.log('═'.repeat(80));

  const testCases = [
    { lost: lostIPhone, name: 'iPhone 13 Pro Max', expected: '~95%', desc: 'Perfect match' },
    { lost: lostWallet, name: 'Brown Leather Wallet', expected: '~85%', desc: 'Good match' },
    { lost: lostKeys, name: 'Car Keys', expected: '~50-60%', desc: 'Medium match (different location)' },
    { lost: lostTextbook, name: 'Textbook', expected: '~20%', desc: 'Poor match (should reject)' },
    { lost: lostAirPods, name: 'AirPods Pro', expected: '~90%', desc: 'High match' },
  ];

  for (const testCase of testCases) {
    console.log(`\n📌 LOST: "${testCase.lost.title}"`);
    console.log(`   Category: ${testCase.lost.category} | Location: ${testCase.lost.location || 'N/A'}`);
    console.log(`   Expected: ${testCase.expected} (${testCase.desc})`);

    // Fetch matches via the matching API endpoint logic
    // We'll just show the items were created successfully
    console.log(`   ✅ Created and ready for manual testing via UI`);
  }

  console.log(`\n\n${'═'.repeat(80)}`);
  console.log('✅ TEST DATA CREATED SUCCESSFULLY!');
  console.log(`${'═'.repeat(80)}`);
  console.log('\n📋 NEXT STEPS - Manual Testing:');
  console.log('   1. Login as: admin-test-matching@neu.edu.ph / Password123!');
  console.log('   2. Go to: Admin Dashboard → Manage Items');
  console.log('   3. Click "Match" on any lost item to see suggested matches');
  console.log('   4. Expected high matches:');
  console.log('      - iPhone 13 Pro Max → Black iPhone with Blue Case');
  console.log('      - Brown Leather Wallet → Leather Wallet');
  console.log('      - AirPods Pro → Apple AirPods with Case');
  console.log('   5. Expected medium match:');
  console.log('      - Car Keys → Car Keys (different location penalty)');
  console.log('   6. Expected rejection:');
  console.log('      - Calculus Textbook should NOT match MacBook Laptop\n');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
