/**
 * Stock movement operations for the advanced warehouse system.
 */
import { supabase } from './supabase';
import type { StockMovementType } from '../types/warehouse';

export async function recordMovement(
  productId: string,
  movementType: StockMovementType,
  quantity: number,
  actorId: string | null,
  options?: { reason?: string; referenceId?: string; referenceType?: string }
) {
  const { data, error } = await supabase.rpc('record_stock_movement', {
    p_product_id: productId,
    p_movement_type: movementType,
    p_quantity: quantity,
    p_reason: options?.reason || null,
    p_reference_id: options?.referenceId || null,
    p_reference_type: options?.referenceType || null,
    p_actor_id: actorId,
  });

  if (error) throw error;
  return data as string; // movement ID
}

export async function getStockMovements(productId?: string, limit = 50) {
  let query = supabase
    .from('stock_movements')
    .select('*, products(name, sku, barcode), profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (productId) {
    query = query.eq('product_id', productId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getLowStockProducts(threshold?: number) {
  let query = supabase
    .from('products')
    .select('id, name, stock_quantity, min_stock_level, image_1_url, sku, barcode, categories(name)')
    .eq('is_available', true);

  if (threshold !== undefined) {
    query = query.lte('stock_quantity', threshold);
  }

  const { data, error } = await query.order('stock_quantity', { ascending: true });
  if (error) throw error;

  // Filter products where stock is at or below their min_stock_level
  return (data || []).filter((p) =>
    p.stock_quantity <= ((p.min_stock_level as number | null) ?? 5)
  );
}

export async function createStocktake(title: string, actorId: string) {
  // Get all products with current quantities
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, stock_quantity')
    .eq('is_available', true);

  if (productsError) throw productsError;

  // Create stocktake
  const { data: stocktake, error: stocktakeError } = await supabase
    .from('stocktakes')
    .insert({ title, status: 'in_progress', total_items: products?.length || 0, created_by: actorId })
    .select('*')
    .single();

  if (stocktakeError) throw stocktakeError;

  // Create items
  const items = (products || []).map((p: { id: string; stock_quantity: number }) => ({
    stocktake_id: stocktake.id,
    product_id: p.id,
    system_quantity: p.stock_quantity,
  }));

  if (items.length) {
    const { error: itemsError } = await supabase.from('stocktake_items').insert(items);
    if (itemsError) throw itemsError;
  }

  return stocktake;
}

export async function completeStocktake(stocktakeId: string, actorId: string) {
  // Get all items with discrepancies
  const { data: items, error: itemsError } = await supabase
    .from('stocktake_items')
    .select('*')
    .eq('stocktake_id', stocktakeId)
    .not('counted_quantity', 'is', null);

  if (itemsError) throw itemsError;

  const discrepancies = (items || []).filter((item) => (item as { discrepancy: number }).discrepancy !== 0);

  // Apply adjustments for discrepancies
  for (const item of discrepancies) {
    const typedItem = item as { product_id: string; counted_quantity: number; discrepancy: number };
    await recordMovement(
      typedItem.product_id,
      'adjustment',
      typedItem.counted_quantity,
      actorId,
      { reason: `تسوية جرد: ${typedItem.discrepancy > 0 ? '+' : ''}${typedItem.discrepancy}`, referenceId: stocktakeId, referenceType: 'stocktake' }
    );
  }

  // Mark stocktake as completed
  const { error: updateError } = await supabase
    .from('stocktakes')
    .update({ status: 'completed', discrepancies: discrepancies.length, completed_at: new Date().toISOString() })
    .eq('id', stocktakeId);

  if (updateError) throw updateError;
}

export async function processCustomerReturn(
  returnId: string,
  approve: boolean,
  actorId: string
) {
  if (!approve) {
    await supabase
      .from('customer_returns')
      .update({ status: 'rejected', processed_by: actorId, processed_at: new Date().toISOString() })
      .eq('id', returnId);
    return;
  }

  // Get return items
  const { data: returnData, error } = await supabase
    .from('customer_returns')
    .select('*, customer_return_items(*)')
    .eq('id', returnId)
    .single();

  if (error) throw error;

  // Add stock back for items in good condition
  for (const item of (returnData.customer_return_items || [])) {
    if (item.condition === 'good') {
      await recordMovement(
        item.product_id,
        'return',
        item.quantity,
        actorId,
        { reason: 'مرتجع عميل', referenceId: returnId, referenceType: 'customer_return' }
      );
    }
  }

  // Mark as completed
  await supabase
    .from('customer_returns')
    .update({ status: 'completed', processed_by: actorId, processed_at: new Date().toISOString() })
    .eq('id', returnId);
}
