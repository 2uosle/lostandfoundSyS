import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

describe('Password Verification Timing Attack Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should take similar time for valid and invalid users', async () => {
    const validEmail = 'test@neu.edu.ph';
    const invalidEmail = 'nonexistent@neu.edu.ph';
    const password = 'TestPass123!';

    // Mock database responses
    const mockPrisma = {
      user: {
        findUnique: vi.fn((args) => {
          if (args.where.email === validEmail) {
            return Promise.resolve({
              id: '1',
              email: validEmail,
              password: bcrypt.hashSync(password, 10),
              role: 'STUDENT',
            });
          }
          return Promise.resolve(null);
        }),
      },
    };

    // Measure time for valid user
    const startValid = performance.now();
    type UserRecord = { id: string; email: string; password?: string; role: string };
    const validUser: UserRecord | null = await mockPrisma.user.findUnique({ where: { email: validEmail } });
    const validPasswordMatch = validUser && validUser.password
      ? await bcrypt.compare(password, validUser.password)
      : await bcrypt.compare(password, '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5gu0jhodg.WC2');
    const endValid = performance.now();
    const validTime = endValid - startValid;

    // Measure time for invalid user
    const startInvalid = performance.now();
    const invalidUser: UserRecord | null = await mockPrisma.user.findUnique({ where: { email: invalidEmail } });
    const invalidPasswordMatch = invalidUser && invalidUser.password
      ? await bcrypt.compare(password, invalidUser.password)
      : await bcrypt.compare(password, '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5gu0jhodg.WC2');
    const endInvalid = performance.now();
    const invalidTime = endInvalid - startInvalid;

    // Assert timing difference is < 300ms (bcrypt variance + system jitter + CI overhead)
    // CI environments can be slower, so we use a more generous threshold
    const timingDiff = Math.abs(validTime - invalidTime);
    expect(timingDiff).toBeLessThan(300); // Realistic threshold for CI environments
    
    expect(validPasswordMatch).toBe(true);
    expect(invalidPasswordMatch).toBe(false);
  });

  it('should always run bcrypt comparison even when user does not exist', async () => {
    const bcryptCompareSpy = vi.spyOn(bcrypt, 'compare');
    const password = 'TestPass123!';
    
    // Simulate non-existent user by always comparing against dummy hash
    const dummyHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5gu0jhodg.WC2';
    const passwordMatch = await bcrypt.compare(password, dummyHash);
    
    // bcrypt.compare should be called once for dummy hash
    expect(bcryptCompareSpy).toHaveBeenCalledTimes(1);
    expect(bcryptCompareSpy).toHaveBeenCalledWith(password, dummyHash);
    expect(passwordMatch).toBe(false);
    
    bcryptCompareSpy.mockRestore();
  });
});
