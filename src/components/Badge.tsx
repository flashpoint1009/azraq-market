/**
 * Badge — reusable badge/pill component with predefined variants.
 *
 * Usage:
 *   <Badge variant="success">نشط</Badge>
 *   <Badge variant="warning">قيد المراجعة</Badge>
 *   <StatusBadge status="delivered" />
 *   <RoleBadge role="admin" />
 */
import type { ReactNode } from 'react';
import { statusLabels, statusTone, roleLabels } from '../lib/labels';
import type { OrderStatus, Role } from '../types/database';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-azraq-50 text-azraq-700 border-azraq-100',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  danger: 'bg-rose-50 text-rose-700 border-rose-100',
  info: 'bg-blue-50 text-blue-700 border-blue-100',
  muted: 'bg-slate-100 text-slate-600 border-slate-200',
};

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  /** Larger size for section headers */
  size?: 'sm' | 'md';
  className?: string;
};

export function Badge({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  const sizeClasses = size === 'md'
    ? 'px-3 py-1 text-xs'
    : 'px-2 py-0.5 text-2xs';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-extrabold ${variantStyles[variant]} ${sizeClasses} ${className}`}>
      {children}
    </span>
  );
}

/**
 * StatusBadge — displays order status with the correct color.
 */
export function StatusBadge({ status, size = 'sm' }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'md'
    ? 'px-3 py-1 text-xs'
    : 'px-2 py-0.5 text-2xs';

  return (
    <span className={`inline-flex items-center rounded-full border font-extrabold ${statusTone[status]} ${sizeClasses}`}>
      {statusLabels[status]}
    </span>
  );
}

/**
 * RoleBadge — displays user role with appropriate styling.
 */
const roleTone: Record<Role, string> = {
  customer: 'bg-blue-50 text-blue-700 border-blue-100',
  admin: 'bg-purple-50 text-purple-700 border-purple-100',
  warehouse: 'bg-amber-50 text-amber-700 border-amber-100',
  delivery: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-extrabold ${roleTone[role]}`}>
      {roleLabels[role]}
    </span>
  );
}

/**
 * CountBadge — displays a number (notifications, cart count, etc.)
 */
export function CountBadge({ count, max = 99 }: { count: number; max?: number }) {
  if (count <= 0) return null;
  const display = count > max ? `${max}+` : String(count);
  return (
    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-2xs font-bold text-white">
      {display}
    </span>
  );
}
