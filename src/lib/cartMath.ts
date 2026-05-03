import { getProductPricing } from './pricing';
import type { CartItem } from '../context/CartContext';

export function calculateCartTotals(items: CartItem[]) {
  return {
    total: items.reduce((sum, item) => sum + getProductPricing(item.product).finalPrice * item.quantity, 0),
    count: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}
