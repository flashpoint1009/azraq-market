import { describe, expect, it } from 'vitest';
import { hasPermission, hasAnyPermission, homeForProfile } from '../lib/permissions';
import type { Profile } from '../types/database';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-1',
    phone: '201014099991',
    full_name: 'Test User',
    role: 'admin',
    address: null,
    latitude: null,
    longitude: null,
    app_permissions: null,
    created_at: '2024-01-01',
    ...overrides,
  };
}

describe('hasPermission', () => {
  it('should return false for null profile', () => {
    expect(hasPermission(null, 'products')).toBe(false);
  });

  it('should return false for undefined profile', () => {
    expect(hasPermission(undefined, 'products')).toBe(false);
  });

  it('should grant all non-developer permissions to admin without specific permissions', () => {
    const profile = makeProfile({ role: 'admin', app_permissions: null });
    expect(hasPermission(profile, 'products')).toBe(true);
    expect(hasPermission(profile, 'orders')).toBe(true);
    expect(hasPermission(profile, 'reports')).toBe(true);
  });

  it('should deny developer-only permissions to admin without explicit grant', () => {
    const profile = makeProfile({ role: 'admin', app_permissions: null });
    expect(hasPermission(profile, 'developer')).toBe(false);
    expect(hasPermission(profile, 'settings')).toBe(false);
    expect(hasPermission(profile, 'data')).toBe(false);
  });

  it('should grant developer-only permissions when developer permission is set', () => {
    const profile = makeProfile({ role: 'admin', app_permissions: ['developer'] });
    expect(hasPermission(profile, 'developer')).toBe(true);
    expect(hasPermission(profile, 'settings')).toBe(true);
    expect(hasPermission(profile, 'data')).toBe(true);
  });

  it('should deny regular permissions when profile has developer permission', () => {
    const profile = makeProfile({ role: 'admin', app_permissions: ['developer'] });
    expect(hasPermission(profile, 'products')).toBe(false);
    expect(hasPermission(profile, 'orders')).toBe(false);
  });

  it('should grant only specific permissions when app_permissions array is set', () => {
    const profile = makeProfile({ role: 'admin', app_permissions: ['products', 'orders'] });
    expect(hasPermission(profile, 'products')).toBe(true);
    expect(hasPermission(profile, 'orders')).toBe(true);
    expect(hasPermission(profile, 'reports')).toBe(false);
    expect(hasPermission(profile, 'users')).toBe(false);
  });

  it('should grant admin with empty array all non-developer permissions', () => {
    const profile = makeProfile({ role: 'admin', app_permissions: [] });
    expect(hasPermission(profile, 'products')).toBe(true);
    expect(hasPermission(profile, 'orders')).toBe(true);
  });
});

describe('hasAnyPermission', () => {
  it('should return true if at least one permission matches', () => {
    const profile = makeProfile({ role: 'admin', app_permissions: ['products'] });
    expect(hasAnyPermission(profile, ['products', 'orders'])).toBe(true);
  });

  it('should return false if no permissions match', () => {
    const profile = makeProfile({ role: 'admin', app_permissions: ['products'] });
    expect(hasAnyPermission(profile, ['orders', 'users'])).toBe(false);
  });
});

describe('homeForProfile', () => {
  it('should return /login for null profile', () => {
    expect(homeForProfile(null)).toBe('/login');
  });

  it('should return / for customer', () => {
    const profile = makeProfile({ role: 'customer' });
    expect(homeForProfile(profile)).toBe('/');
  });

  it('should return /warehouse for warehouse role', () => {
    const profile = makeProfile({ role: 'warehouse' });
    expect(homeForProfile(profile)).toBe('/warehouse');
  });

  it('should return /delivery for delivery role', () => {
    const profile = makeProfile({ role: 'delivery' });
    expect(homeForProfile(profile)).toBe('/delivery');
  });

  it('should return /admin/developer for admin with developer permission', () => {
    const profile = makeProfile({ role: 'admin', app_permissions: ['developer'] });
    expect(homeForProfile(profile)).toBe('/admin/developer');
  });

  it('should return /admin for admin with reports permission', () => {
    const profile = makeProfile({ role: 'admin', app_permissions: ['reports'] });
    expect(homeForProfile(profile)).toBe('/admin');
  });

  it('should return /admin/products for admin with only products permission', () => {
    const profile = makeProfile({ role: 'admin', app_permissions: ['products'] });
    expect(homeForProfile(profile)).toBe('/admin/products');
  });

  it('should return /admin for admin with no specific permissions (full admin)', () => {
    const profile = makeProfile({ role: 'admin', app_permissions: null });
    expect(homeForProfile(profile)).toBe('/admin');
  });
});
