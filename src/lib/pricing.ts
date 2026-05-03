import type { Product } from '../types/database';

export function getProductPricing(product: Product) {
  const basePrice = Number(product.price || 0);
  const discountType = product.discount_type ?? 'none';
  const rawDiscount = Number(product.discount_value || 0);
  const discountValue = Number.isFinite(rawDiscount) ? Math.max(0, rawDiscount) : 0;
  const saving =
    discountType === 'percent'
      ? Math.min(basePrice, (basePrice * Math.min(discountValue, 100)) / 100)
      : discountType === 'amount'
        ? Math.min(basePrice, discountValue)
        : 0;
  const finalPrice = Math.max(0, basePrice - saving);

  return {
    basePrice,
    finalPrice,
    saving,
    hasDiscount: saving > 0,
    discountLabel: discountType === 'percent' ? `${Math.min(discountValue, 100)}%` : null,
  };
}
