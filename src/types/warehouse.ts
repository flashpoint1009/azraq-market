/**
 * Advanced Warehouse System Types
 */

export type StockMovementType = 'in' | 'out' | 'adjustment' | 'return' | 'damage' | 'transfer';
export type StocktakeStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';
export type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type ReturnCondition = 'good' | 'damaged' | 'expired';

export type StockMovement = {
  id: string;
  product_id: string;
  movement_type: StockMovementType;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_by: string | null;
  created_at: string;
  products?: { name: string; sku: string | null; barcode: string | null } | null;
  profiles?: { full_name: string | null } | null;
};

export type Stocktake = {
  id: string;
  title: string;
  status: StocktakeStatus;
  notes: string | null;
  total_items: number;
  discrepancies: number;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
};

export type StocktakeItem = {
  id: string;
  stocktake_id: string;
  product_id: string;
  system_quantity: number;
  counted_quantity: number | null;
  discrepancy: number;
  notes: string | null;
  counted_at: string | null;
  counted_by: string | null;
  products?: { name: string; sku: string | null; barcode: string | null; image_1_url: string | null } | null;
};

export type StockAlert = {
  id: string;
  product_id: string;
  min_quantity: number;
  is_active: boolean;
  last_alerted_at: string | null;
  created_at: string;
  products?: { name: string; stock_quantity: number; image_1_url: string | null } | null;
};

export type CustomerReturn = {
  id: string;
  order_id: string | null;
  customer_id: string;
  status: ReturnStatus;
  reason: string;
  total_amount: number;
  notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  profiles?: { full_name: string | null; phone: string | null } | null;
  customer_return_items?: CustomerReturnItem[];
};

export type CustomerReturnItem = {
  id: string;
  return_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  condition: ReturnCondition;
  products?: { name: string } | null;
};

export type BinLocation = {
  id: string;
  code: string;
  name: string;
  zone: string | null;
  capacity: number | null;
  is_active: boolean;
  created_at: string;
};

export type ProductLocation = {
  id: string;
  product_id: string;
  bin_location_id: string;
  quantity: number;
  is_primary: boolean;
  updated_at: string;
  products?: { name: string; image_1_url: string | null } | null;
  bin_locations?: { code: string; name: string; zone: string | null } | null;
};

// Movement type labels for UI
export const movementTypeLabels: Record<StockMovementType, string> = {
  in: 'إضافة',
  out: 'صرف',
  adjustment: 'تسوية',
  return: 'مرتجع',
  damage: 'تالف',
  transfer: 'تحويل',
};

export const movementTypeColors: Record<StockMovementType, string> = {
  in: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  out: 'bg-rose-50 text-rose-700 border-rose-200',
  adjustment: 'bg-amber-50 text-amber-700 border-amber-200',
  return: 'bg-blue-50 text-blue-700 border-blue-200',
  damage: 'bg-red-50 text-red-700 border-red-200',
  transfer: 'bg-purple-50 text-purple-700 border-purple-200',
};

export const stocktakeStatusLabels: Record<StocktakeStatus, string> = {
  draft: 'مسودة',
  in_progress: 'جاري الجرد',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

export const returnStatusLabels: Record<ReturnStatus, string> = {
  pending: 'قيد المراجعة',
  approved: 'تمت الموافقة',
  rejected: 'مرفوض',
  completed: 'مكتمل',
};

export const returnConditionLabels: Record<ReturnCondition, string> = {
  good: 'حالة جيدة',
  damaged: 'تالف',
  expired: 'منتهي الصلاحية',
};
