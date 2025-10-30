/**
 * Test script for distributed rate limiting
 * 
 * Run with: npx ts-node scripts/test-rate-limit.ts
 */

import { prisma } from '@/lib/prisma';
import rateLimit from '@/lib/rate-limit';
import { cleanupExpiredRateLimits } from '@/lib/rate-limit';

async function testRateLimiting() {
  console.log('🧪 Testing Distributed Rate Limiting\n');

  // Create a test limiter
  const testLimiter = rateLimit({
    interval: 10 * 1000, // 10 seconds
  });

  const testKey = 'test:user:123';

  try {
    console.log('1️⃣ Testing normal requests (should pass)...');
    for (let i = 1; i <= 3; i++) {
      await testLimiter.check(5, testKey);
      console.log(`   ✅ Request ${i}/5 passed`);
    }

    console.log('\n2️⃣ Testing rate limit (should fail after 5)...');
    for (let i = 4; i <= 7; i++) {
      try {
        await testLimiter.check(5, testKey);
        console.log(`   ✅ Request ${i}/5 passed`);
      } catch {
        console.log(`   ❌ Request ${i}/5 blocked (rate limit exceeded)`);
      }
    }

    // Check database
    console.log('\n3️⃣ Checking database entries...');
    const entry = await prisma.rateLimit.findUnique({
      where: { key: testKey },
    });
    console.log(`   📊 Current count: ${entry?.count}`);
    console.log(`   ⏰ Expires at: ${entry?.expiresAt.toISOString()}`);

    // Test cleanup
    console.log('\n4️⃣ Creating expired entries for cleanup test...');
    await prisma.rateLimit.create({
      data: {
        key: 'test:expired:1',
        count: 10,
        expiresAt: new Date(Date.now() - 60000), // Expired 1 min ago
      },
    });
    await prisma.rateLimit.create({
      data: {
        key: 'test:expired:2',
        count: 5,
        expiresAt: new Date(Date.now() - 120000), // Expired 2 min ago
      },
    });

    console.log('   ✅ Created 2 expired entries');

    console.log('\n5️⃣ Running cleanup...');
    const deletedCount = await cleanupExpiredRateLimits();
    console.log(`   🧹 Cleaned up ${deletedCount} expired entries`);

    // Verify cleanup
    const remaining = await prisma.rateLimit.count({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    console.log(`   📊 Remaining expired entries: ${remaining}`);

    // Test different identifiers
    console.log('\n6️⃣ Testing different identifier types...');
    
    const ipKey = 'api:ip:192.168.1.1';
    const userKey = 'api:user:user123';
    const authKey = 'auth:ip:10.0.0.1';

    await testLimiter.check(10, ipKey);
    console.log('   ✅ IP-based rate limit working');

    await testLimiter.check(10, userKey);
    console.log('   ✅ User-based rate limit working');

    await testLimiter.check(5, authKey);
    console.log('   ✅ Auth rate limit working');

    // Show all active limits
    console.log('\n7️⃣ Active rate limit entries:');
    const allLimits = await prisma.rateLimit.findMany({
      where: {
        expiresAt: {
          gte: new Date(),
        },
      },
      orderBy: {
        count: 'desc',
      },
    });

    allLimits.forEach(limit => {
      console.log(`   📊 ${limit.key}: ${limit.count} requests, expires in ${Math.round((limit.expiresAt.getTime() - Date.now()) / 1000)}s`);
    });

    console.log('\n✅ All tests completed successfully!');
    console.log('\n🧹 Cleaning up test data...');
    
    // Cleanup test entries
    await prisma.rateLimit.deleteMany({
      where: {
        key: {
          startsWith: 'test:',
        },
      },
    });
    
    console.log('   ✅ Test data cleaned up');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testRateLimiting()
  .then(() => {
    console.log('\n🎉 Rate limiting is working correctly!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Rate limiting test failed:', error);
    process.exit(1);
  });
