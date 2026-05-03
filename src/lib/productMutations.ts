import { supabase } from './supabase';
import type { Product } from '../types/database';

type ProductPayload = Partial<Product>;
const requiredInventoryColumns = new Set(['stock_quantity', 'cost_price', 'is_available']);

function missingProductsColumn(error: unknown) {
  if (!error || typeof error !== 'object' || !('message' in error)) return null;
  const message = String((error as { message?: unknown }).message ?? '');
  return message.match(/Could not find the '([^']+)' column of 'products'/)?.[1] ?? null;
}

export async function saveProductPayload(payload: ProductPayload, productId?: string | null) {
  let nextPayload: ProductPayload = { ...payload };

  for (let attempt = 0; attempt < 6; attempt += 1) {
    console.info('PRODUCT_CREATE_PAYLOAD', nextPayload);
    const result = productId
      ? await supabase.from('products').update(nextPayload).eq('id', productId)
      : await supabase.from('products').insert(nextPayload);

    const missingColumn = missingProductsColumn(result.error);
    if (result.error && missingColumn && missingColumn in nextPayload) {
      if (requiredInventoryColumns.has(missingColumn)) return result;

      console.warn('PRODUCT_PAYLOAD_COLUMN_SKIPPED', { missingColumn });
      const rest = { ...nextPayload };
      delete rest[missingColumn as keyof Product];
      nextPayload = rest;
      continue;
    }

    return result;
  }

  return productId
    ? supabase.from('products').update(nextPayload).eq('id', productId)
    : supabase.from('products').insert(nextPayload);
}
