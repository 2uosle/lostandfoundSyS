import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data (in correct order to respect foreign keys)
  console.log('🗑️  Clearing existing data...');
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.lostItem.deleteMany();
  await prisma.foundItem.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  console.log('👥 Creating users...');
  const hashedPassword = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@neu.edu.ph',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'juan.delacruz@neu.edu.ph',
        name: 'Juan Dela Cruz',
        password: hashedPassword,
        role: 'STUDENT',
      },
    }),
    prisma.user.create({
      data: {
        email: 'maria.santos@neu.edu.ph',
        name: 'Maria Santos',
        password: hashedPassword,
        role: 'STUDENT',
      },
    }),
    prisma.user.create({
      data: {
        email: 'pedro.reyes@neu.edu.ph',
        name: 'Pedro Reyes',
        password: hashedPassword,
        role: 'STUDENT',
      },
    }),
    prisma.user.create({
      data: {
        email: 'ana.garcia@neu.edu.ph',
        name: 'Ana Garcia',
        password: hashedPassword,
        role: 'STUDENT',
      },
    }),
    prisma.user.create({
      data: {
        email: 'carlos.lopez@neu.edu.ph',
        name: 'Carlos Lopez',
        password: hashedPassword,
        role: 'STUDENT',
      },
    }),
  ]);

  console.log(`✅ Created ${users.length + 1} users (including admin)`);

  // Create lost items
  console.log('📢 Creating lost items...');
  const lostItems = await Promise.all([
    // iPhone 13 - Will match with found item
    prisma.lostItem.create({
      data: {
        title: 'iPhone 13 Pro Max',
        description: 'Black iPhone 13 Pro Max with a blue case. Lost near the library entrance.',
        category: 'Electronics',
        location: 'Main Library',
        contactInfo: users[0].email,
        lostDate: new Date('2025-10-25'),
        status: 'PENDING',
        userId: users[0].id,
      },
    }),
    // AirPods - Will match with found item
    prisma.lostItem.create({
      data: {
        title: 'AirPods Pro',
        description: 'White AirPods Pro with charging case. Has a small scratch on the case.',
        category: 'Electronics',
        location: 'Cafeteria',
        contactInfo: users[1].email,
        lostDate: new Date('2025-10-27'),
        status: 'PENDING',
        userId: users[1].id,
      },
    }),
    // Wallet - Will match with found item
    prisma.lostItem.create({
      data: {
        title: 'Brown Leather Wallet',
        description: 'Brown leather wallet containing ID, student card, and some cash. Very important!',
        category: 'Personal Items',
        location: 'Gymnasium',
        contactInfo: users[2].email,
        lostDate: new Date('2025-10-26'),
        status: 'PENDING',
        userId: users[2].id,
      },
    }),
    // Laptop - Pending
    prisma.lostItem.create({
      data: {
        title: 'Dell Laptop',
        description: 'Silver Dell XPS 13 laptop. Has NEU stickers on it.',
        category: 'Electronics',
        location: 'Computer Lab Room 301',
        contactInfo: users[3].email,
        lostDate: new Date('2025-10-28'),
        status: 'PENDING',
        userId: users[3].id,
      },
    }),
    // Keys - Pending
    prisma.lostItem.create({
      data: {
        title: 'Set of Keys',
        description: 'Keychain with multiple keys and a red lanyard. Has a small teddy bear charm.',
        category: 'Keys',
        location: 'Building A Hallway',
        contactInfo: users[4].email,
        lostDate: new Date('2025-10-29'),
        status: 'PENDING',
        userId: users[4].id,
      },
    }),
    // Textbook - Pending
    prisma.lostItem.create({
      data: {
        title: 'Calculus Textbook',
        description: 'Red calculus textbook with my name written inside the cover.',
        category: 'Books',
        location: 'Classroom 205',
        contactInfo: users[0].email,
        lostDate: new Date('2025-10-24'),
        status: 'PENDING',
        userId: users[0].id,
      },
    }),
    // Water Bottle - Pending
    prisma.lostItem.create({
      data: {
        title: 'Blue Water Bottle',
        description: 'Insulated blue water bottle with university logo sticker.',
        category: 'Personal Items',
        location: 'Sports Field',
        contactInfo: users[1].email,
        lostDate: new Date('2025-10-23'),
        status: 'PENDING',
        userId: users[1].id,
      },
    }),
    // Umbrella - Pending
    prisma.lostItem.create({
      data: {
        title: 'Black Umbrella',
        description: 'Compact black umbrella, automatic open/close.',
        category: 'Personal Items',
        location: 'Cafeteria',
        contactInfo: users[2].email,
        lostDate: new Date('2025-10-22'),
        status: 'PENDING',
        userId: users[2].id,
      },
    }),
  ]);

  console.log(`✅ Created ${lostItems.length} lost items`);

  // Create found items (some will match with lost items)
  console.log('✨ Creating found items...');
  const foundItems = await Promise.all([
    // iPhone - Matches with lost item #1
    prisma.foundItem.create({
      data: {
        title: 'Black iPhone with Blue Case',
        description: 'Found an iPhone 13 Pro with a blue protective case near the library main entrance.',
        category: 'Electronics',
        location: 'Main Library',
        contactInfo: admin.email,
        foundDate: new Date('2025-10-26'),
        userId: admin.id,
      },
    }),
    // AirPods - Matches with lost item #2
    prisma.foundItem.create({
      data: {
        title: 'Apple AirPods with Case',
        description: 'White AirPods Pro with charging case found on a table in the cafeteria.',
        category: 'Electronics',
        location: 'Cafeteria',
        contactInfo: admin.email,
        foundDate: new Date('2025-10-28'),
        userId: admin.id,
      },
    }),
    // Wallet - Matches with lost item #3
    prisma.foundItem.create({
      data: {
        title: 'Leather Wallet',
        description: 'Brown leather wallet found in the gym locker area. Contains ID and cards.',
        category: 'Personal Items',
        location: 'Gymnasium',
        contactInfo: admin.email,
        foundDate: new Date('2025-10-27'),
        userId: admin.id,
      },
    }),
    // Charger - No match
    prisma.foundItem.create({
      data: {
        title: 'iPhone Charger',
        description: 'White lightning cable and USB power adapter.',
        category: 'Electronics',
        location: 'Classroom 101',
        contactInfo: admin.email,
        foundDate: new Date('2025-10-25'),
        userId: admin.id,
      },
    }),
    // Glasses - No match
    prisma.foundItem.create({
      data: {
        title: 'Reading Glasses',
        description: 'Black-framed reading glasses in a brown case.',
        category: 'Personal Items',
        location: 'Library Study Area',
        contactInfo: admin.email,
        foundDate: new Date('2025-10-24'),
        userId: admin.id,
      },
    }),
    // USB Drive - No match
    prisma.foundItem.create({
      data: {
        title: 'USB Flash Drive',
        description: '32GB SanDisk USB flash drive, black color.',
        category: 'Electronics',
        location: 'Computer Lab Room 302',
        contactInfo: admin.email,
        foundDate: new Date('2025-10-23'),
        userId: admin.id,
      },
    }),
    // Headphones - No match
    prisma.foundItem.create({
      data: {
        title: 'Wireless Headphones',
        description: 'Black Sony wireless headphones, over-ear style.',
        category: 'Electronics',
        location: 'Student Lounge',
        contactInfo: admin.email,
        foundDate: new Date('2025-10-22'),
        userId: admin.id,
      },
    }),
  ]);

  console.log(`✅ Created ${foundItems.length} found items`);

  // Print summary
  console.log('\n📊 Seeding Summary:');
  console.log('='.repeat(50));
  console.log(`👥 Users created: ${users.length + 1}`);
  console.log(`   - Admin: ${admin.email} (Password: Password123!)`);
  console.log(`   - Students: ${users.length}`);
  console.log(`📢 Lost items: ${lostItems.length}`);
  console.log(`✨ Found items: ${foundItems.length}`);
  console.log('='.repeat(50));
  
  console.log('\n🎯 Test Matching:');
  console.log('These items should have high match scores:');
  console.log('  1. "iPhone 13 Pro Max" (lost) ↔️ "Black iPhone with Blue Case" (found)');
  console.log('  2. "AirPods Pro" (lost) ↔️ "Apple AirPods with Case" (found)');
  console.log('  3. "Brown Leather Wallet" (lost) ↔️ "Leather Wallet" (found)');
  
  console.log('\n🔐 Login Credentials:');
  console.log('='.repeat(50));
  console.log('Admin Account:');
  console.log('  Email: admin@neu.edu.ph');
  console.log('  Password: Password123!');
  console.log('\nStudent Accounts (all use same password):');
  console.log('  Email: juan.delacruz@neu.edu.ph');
  console.log('  Email: maria.santos@neu.edu.ph');
  console.log('  Email: pedro.reyes@neu.edu.ph');
  console.log('  Email: ana.garcia@neu.edu.ph');
  console.log('  Email: carlos.lopez@neu.edu.ph');
  console.log('  Password: Password123!');
  console.log('='.repeat(50));

  console.log('\n✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
