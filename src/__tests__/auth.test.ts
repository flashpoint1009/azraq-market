import { describe, expect, it } from 'vitest';
import { normalizeEgyptPhone, phoneToInternalEmail } from '../lib/auth';

describe('normalizeEgyptPhone', () => {
  it('should normalize 010xxxxxxxx format', () => {
    expect(normalizeEgyptPhone('01014099991')).toBe('201014099991');
  });

  it('should normalize 2010xxxxxxxx format', () => {
    expect(normalizeEgyptPhone('201014099991')).toBe('201014099991');
  });

  it('should normalize +2010xxxxxxxx format', () => {
    expect(normalizeEgyptPhone('+201014099991')).toBe('201014099991');
  });

  it('should normalize 0020xxxxxxxx format', () => {
    expect(normalizeEgyptPhone('00201014099991')).toBe('201014099991');
  });

  it('should strip non-digit characters', () => {
    expect(normalizeEgyptPhone('010-1409-9991')).toBe('201014099991');
  });

  it('should throw for invalid phone number (too short)', () => {
    expect(() => normalizeEgyptPhone('0101409')).toThrow();
  });

  it('should throw for invalid phone number (wrong prefix)', () => {
    expect(() => normalizeEgyptPhone('0201234567890')).toThrow();
  });

  it('should throw for empty string', () => {
    expect(() => normalizeEgyptPhone('')).toThrow();
  });
});

describe('phoneToInternalEmail', () => {
  it('should create correct internal email from local format', () => {
    expect(phoneToInternalEmail('01014099991')).toBe('phone201014099991@azraqmarket.app');
  });

  it('should create correct internal email from international format', () => {
    expect(phoneToInternalEmail('+201014099991')).toBe('phone201014099991@azraqmarket.app');
  });

  it('should create correct internal email from already normalized format', () => {
    expect(phoneToInternalEmail('201014099991')).toBe('phone201014099991@azraqmarket.app');
  });
});
