import { describe, expect, it } from 'vitest';
import { calculateCartTotals } from '../lib/cartMath';
import type { Product } from '../types/database';

const product = (id: string, price: number): Product => ({
  id,
  category_id: null,
  subcategory_id: null,
  name: id,
  description: null,
  price,
  cost_price: 0,
  discount_type: 'none',
  discount_value: 0,
  unit_type: 'piece',
  image_1_url: null,
  image_2_url: null,
  stock_quantity: 10,
  is_available: true,
  created_at: '',
  updated_at: '',
});

describe('cart totals', () => {
  it('calculates quantity count and total', () => {
    expect(calculateCartTotals([
      { product: product('one', 20), quantity: 2 },
      { product: product('two', 15), quantity: 3 },
    ])).toEqual({ count: 5, total: 85 });
  });
});
