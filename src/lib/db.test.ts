import { describe, it, expect, vi } from 'vitest';
import * as db from './db';

vi.mock('./prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: '1', email: 'a' }) },
    lostItem: { create: vi.fn().mockResolvedValue({ id: 'i1' }) },
    foundItem: { create: vi.fn().mockResolvedValue({ id: 'f1' }) }
  }
}));

describe('db utilities', () => {
  it('createUser calls prisma', async () => {
    const u = await db.createUser({ email: 'a', password: 'p', role: 'STUDENT' as any });
    expect(u).toHaveProperty('id');
  });
});
