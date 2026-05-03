import { describe, expect, it } from 'vitest';
import { normalizeEgyptPhone, phoneToInternalEmail } from '../lib/auth';

describe('auth phone helpers', () => {
  it('normalizes local Egyptian mobile numbers', () => {
    expect(normalizeEgyptPhone('01000000001')).toBe('201000000001');
  });

  it('creates the internal email identity', () => {
    expect(phoneToInternalEmail('+201000000001')).toBe('phone201000000001@market.local');
  });
});
