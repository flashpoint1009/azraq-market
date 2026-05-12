import { describe, expect, it } from 'vitest';
import { getProductPricing } from '../lib/pricing';
import type { Product } from '../types/database';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'test-id',
    category_id: null,
    subcategory_id: null,
    name: 'Test Product',
    description: null,
    price: 100,
    cost_price: 50,
    unit_type: 'carton',
    image_1_url: null,
    image_2_url: null,
    stock_quantity: 10,
    is_available: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    ...overrides,
  };
}

describe('getProductPricing', () => {
  it('should return base price when no discount', () => {
    const product = makeProduct({ price: 200 });
    const result = getProductPricing(product);
    expect(result.basePrice).toBe(200);
    expect(result.finalPrice).toBe(200);
    expect(result.saving).toBe(0);
    expect(result.hasDiscount).toBe(false);
    expect(result.discountLabel).toBeNull();
  });

  it('should calculate percentage discount correctly', () => {
    const product = makeProduct({ price: 200, discount_type: 'percent', discount_value: 25 });
    const result = getProductPricing(product);
    expect(result.basePrice).toBe(200);
    expect(result.finalPrice).toBe(150);
    expect(result.saving).toBe(50);
    expect(result.hasDiscount).toBe(true);
    expect(result.discountLabel).toBe('25%');
  });

  it('should calculate fixed amount discount correctly', () => {
    const product = makeProduct({ price: 200, discount_type: 'amount', discount_value: 30 });
    const result = getProductPricing(product);
    expect(result.basePrice).toBe(200);
    expect(result.finalPrice).toBe(170);
    expect(result.saving).toBe(30);
    expect(result.hasDiscount).toBe(true);
    expect(result.discountLabel).toBeNull();
  });

  it('should cap percentage discount at 100%', () => {
    const product = makeProduct({ price: 100, discount_type: 'percent', discount_value: 150 });
    const result = getProductPricing(product);
    expect(result.finalPrice).toBe(0);
    expect(result.saving).toBe(100);
    expect(result.discountLabel).toBe('100%');
  });

  it('should cap fixed discount at base price (no negative)', () => {
    const product = makeProduct({ price: 50, discount_type: 'amount', discount_value: 100 });
    const result = getProductPricing(product);
    expect(result.finalPrice).toBe(0);
    expect(result.saving).toBe(50);
  });

  it('should handle discount_type "none"', () => {
    const product = makeProduct({ price: 80, discount_type: 'none', discount_value: 20 });
    const result = getProductPricing(product);
    expect(result.finalPrice).toBe(80);
    expect(result.saving).toBe(0);
    expect(result.hasDiscount).toBe(false);
  });

  it('should handle null discount_value gracefully', () => {
    const product = makeProduct({ price: 100, discount_type: 'percent', discount_value: null });
    const result = getProductPricing(product);
    expect(result.finalPrice).toBe(100);
    expect(result.saving).toBe(0);
  });

  it('should handle zero price', () => {
    const product = makeProduct({ price: 0 });
    const result = getProductPricing(product);
    expect(result.basePrice).toBe(0);
    expect(result.finalPrice).toBe(0);
    expect(result.hasDiscount).toBe(false);
  });
});
