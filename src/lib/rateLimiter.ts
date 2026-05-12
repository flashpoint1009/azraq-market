/**
 * Client-side rate limiter to prevent brute-force login attempts.
 * Uses in-memory tracking with configurable max attempts and lockout duration.
 */

type AttemptRecord = {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
};

const attempts = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000; // 1 minute window
const LOCKOUT_MS = 120_000; // 2 minute lockout after max attempts

function getRecord(key: string): AttemptRecord {
  const existing = attempts.get(key);
  if (!existing) return { count: 0, firstAttempt: Date.now(), lockedUntil: null };

  // Reset if window expired and not locked
  if (!existing.lockedUntil && Date.now() - existing.firstAttempt > WINDOW_MS) {
    return { count: 0, firstAttempt: Date.now(), lockedUntil: null };
  }

  // Unlock if lockout expired
  if (existing.lockedUntil && Date.now() > existing.lockedUntil) {
    return { count: 0, firstAttempt: Date.now(), lockedUntil: null };
  }

  return existing;
}

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const record = getRecord(key);

  if (record.lockedUntil) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordAttempt(key: string): void {
  const record = getRecord(key);
  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_MS;
  }

  attempts.set(key, record);
}

export function resetAttempts(key: string): void {
  attempts.delete(key);
}
