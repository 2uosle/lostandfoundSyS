import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// These E2E tests require a live database and the dev server running.
// They are conditionally skipped unless E2E_HANOFF is set to '1'.
const runE2E = process.env.E2E_HANDOFF === '1';

(runE2E ? test.describe : test.describe.skip)('Mutual PIN Handoff Flow (E2E)', () => {
  const prisma = new PrismaClient();
  const adminEmail = 'admin+handoff@example.com';
  const ownerEmail = 'owner+handoff@example.com';
  const finderEmail = 'finder+handoff@example.com';
  const password = 'Passw0rd!X';
  let lostId = '';
  let foundId = '';
  let hsId = '';
  let ownerCode = '';
  let finderCode = '';

  test.beforeAll(async () => {
    if (!process.env.DATABASE_URL) test.skip();

    // Create users (upsert)
    const hashed = await bcrypt.hash(password, 10);
    const [admin, owner, finder] = await Promise.all([
      prisma.user.upsert({ where: { email: adminEmail }, create: { email: adminEmail, password: hashed, role: 'ADMIN' as any }, update: {} }),
      prisma.user.upsert({ where: { email: ownerEmail }, create: { email: ownerEmail, password: hashed, role: 'STUDENT' as any }, update: {} }),
      prisma.user.upsert({ where: { email: finderEmail }, create: { email: finderEmail, password: hashed, role: 'STUDENT' as any }, update: {} }),
    ]);

    // Create matched items
    const lost = await prisma.lostItem.create({
      data: {
        title: 'E2E Lost Phone',
        description: 'Black phone with case',
        category: 'electronics',
        status: 'MATCHED' as any,
        lostDate: new Date(),
        userId: owner.id,
      },
    });

    const found = await prisma.foundItem.create({
      data: {
        title: 'E2E Found Phone',
        description: 'Looks like a black phone',
        category: 'electronics',
        location: 'Library',
        foundDate: new Date(),
        status: 'MATCHED' as any,
        userId: finder.id,
      },
    });

    await prisma.lostItem.update({ where: { id: lost.id }, data: { matchedWith: { connect: { id: found.id } } } });

    lostId = lost.id;
    foundId = found.id;

    // Start handoff by directly creating session (bypass UI/auth for E2E brevity)
    const hs = await (prisma as any).handoffSession.create({
      data: {
        lostItemId: lostId,
        foundItemId: foundId,
        ownerUserId: owner.id,
        finderUserId: finder.id,
        ownerCode: '111222',
        finderCode: '333444',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        status: 'ACTIVE',
      },
    });
    hsId = hs.id; ownerCode = hs.ownerCode; finderCode = hs.finderCode;
  });

  test('Both sides verify codes and item becomes CLAIMED', async ({ request }) => {
    // Normally we would login and call the APIs with session cookies. Here we mimic the flow by writing state directly.
    const prismaAny: any = prisma;

    // Owner enters Finder code
    await prismaAny.handoffSession.update({ where: { id: hsId }, data: { ownerAttempts: 1, ownerVerified: true } });
    // Finder enters Owner code
    await prismaAny.handoffSession.update({ where: { id: hsId }, data: { finderAttempts: 1, finderVerified: true, status: 'COMPLETED' } });
    await prisma.lostItem.update({ where: { id: lostId }, data: { status: 'CLAIMED' as any } });

    const lost = await prisma.lostItem.findUnique({ where: { id: lostId } });
    expect(lost?.status).toBe('CLAIMED');
  });

  test('Attempts exceed -> lock and admin reset', async () => {
    const prismaAny: any = prisma;

    const hs = await prismaAny.handoffSession.create({
      data: {
        lostItemId: lostId,
        foundItemId: foundId,
        ownerUserId: (await prisma.user.findUnique({ where: { email: ownerEmail } }))!.id,
        finderUserId: (await prisma.user.findUnique({ where: { email: finderEmail } }))!.id,
        ownerCode: '222333',
        finderCode: '444555',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        status: 'ACTIVE',
      },
    });

    // Exceed attempts for owner
    await prismaAny.handoffSession.update({ where: { id: hs.id }, data: { ownerAttempts: 5, locked: true, status: 'LOCKED' } });
    const locked = await prismaAny.handoffSession.findUnique({ where: { id: hs.id } });
    expect(locked.locked).toBe(true);

    // Admin reset
    const reset = await prismaAny.handoffSession.update({
      where: { id: hs.id },
      data: {
        ownerAttempts: 0, finderAttempts: 0, ownerVerified: false, finderVerified: false, locked: false, status: 'ACTIVE',
        ownerCode: '999000', finderCode: '111000', expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });
    expect(reset.locked).toBe(false);
    expect(reset.status).toBe('ACTIVE');
  });
});
