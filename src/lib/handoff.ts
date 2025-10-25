export const HANDOFF_CODE_LENGTH = 6;
export const HANDOFF_TTL_MS = 10 * 60 * 1000; // 10 minutes (changed from 15)
export const HANDOFF_MAX_ATTEMPTS = 5;

export function generateCode(length = HANDOFF_CODE_LENGTH): string {
  // Generate a numeric code, avoid leading zero by using 10^(length-1)
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min)).toString();
}

export function isExpired(expiresAt: Date): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

export type HandoffRole = 'OWNER' | 'FINDER' | 'ADMIN';

export function inferRole(session: { ownerUserId: string; finderUserId: string }, userId: string): HandoffRole | null {
  if (session.ownerUserId === userId) return 'OWNER';
  if (session.finderUserId === userId) return 'FINDER';
  return null;
}

// Check if owner has been fully verified (mutual verification complete)
export function isOwnerFullyVerified(session: {
  ownerVerifiedAdmin: boolean;
  adminVerifiedOwner: boolean;
}): boolean {
  return session.ownerVerifiedAdmin && session.adminVerifiedOwner;
}

// Check if handoff is complete (only owner needs to be verified)
export function isHandoffComplete(session: {
  ownerVerifiedAdmin: boolean;
  adminVerifiedOwner: boolean;
}): boolean {
  return session.ownerVerifiedAdmin && session.adminVerifiedOwner;
}
