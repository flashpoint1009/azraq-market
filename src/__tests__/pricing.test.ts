import { describe, expect, it } from 'vitest';
import { getProductPricing } from '../lib/pricing';
import type { Product } from '../types/database';

const product = (price: number, discount_type: Product['discount_type'], discount_value: number): Product => ({
  id: 'p1',
  category_id: null,
  subcategory_id: null,
  name: 'Test product',
  description: null,
  price,
  cost_price: 0,
  discount_type,
  discount_value,
  unit_type: 'piece',
  image_1_url: null,
  image_2_url: null,
  stock_quantity: 10,
  is_available: true,
  created_at: '',
  updated_at: '',
});

describe('pricing', () => {
  it('calculates percent discounts', () => {
    expect(getProductPricing(product(100, 'percent', 15)).finalPrice).toBe(85);
  });

  it('caps fixed discounts at product price', () => {
    expect(getProductPricing(product(100, 'amount', 150)).finalPrice).toBe(0);
  });

  it('keeps full price when there is no discount', () => {
    expect(getProductPricing(product(100, 'none', 0)).finalPrice).toBe(100);
  });
});
