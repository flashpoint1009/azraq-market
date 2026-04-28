import type { OrderStatus, Role, UnitType } from '../types/database';

export const roleLabels: Record<Role, string> = {
  customer: 'عميل',
  admin: 'مشرف',
  warehouse: 'مخزن',
  delivery: 'توصيل',
};

export const unitLabels: Record<UnitType, string> = {
  carton: 'كرتونة',
  dozen: 'دستة',
  piece: 'قطعة',
};

export const statusLabels: Record<OrderStatus, string> = {
  new: 'طلب جديد',
  preparing: 'بنجهز طلبك',
  ready_for_delivery: 'جاهز للتسليم',
  with_delivery: 'في الطريق',
  delivered: 'الطلب وصلك',
  rejected: 'مرفوض',
  cancelled: 'اتلغى',
};

export const statusTone: Record<OrderStatus, string> = {
  new: 'bg-sky-50 text-sky-700 border-sky-100',
  preparing: 'bg-amber-50 text-amber-700 border-amber-100',
  ready_for_delivery: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  with_delivery: 'bg-blue-50 text-blue-700 border-blue-100',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  rejected: 'bg-rose-50 text-rose-700 border-rose-100',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const statusFlow: OrderStatus[] = ['new', 'preparing', 'ready_for_delivery', 'with_delivery', 'delivered'];

export const formatCurrency = (value: number | null | undefined) =>
  new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(value ?? 0);

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
