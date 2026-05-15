/**
 * Skeleton — loading placeholder components.
 *
 * Usage:
 *   <Skeleton className="h-4 w-24" />
 *   <CardSkeleton />
 *   <ListSkeleton rows={5} />
 *   <ProductGridSkeleton count={6} />
 *
 * Note: This file extends/replaces the existing Skeleton component
 * by providing a unified skeleton system.
 */

type SkeletonProps = {
  className?: string;
  /** Use 'circle' for avatars */
  variant?: 'rect' | 'circle' | 'text';
};

export function Skeleton({ className = '', variant = 'rect' }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-slate-100';
  const variantClasses = variant === 'circle'
    ? 'rounded-full'
    : variant === 'text'
      ? 'rounded-md'
      : 'rounded-xl';

  return <div className={`${baseClasses} ${variantClasses} ${className}`} />;
}

/**
 * CardSkeleton — mimics a typical product/order card.
 */
export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <Skeleton className="h-14 w-14 shrink-0" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-4 w-3/4" variant="text" />
          <Skeleton className="h-3 w-1/2" variant="text" />
          <Skeleton className="h-3 w-1/3" variant="text" />
        </div>
      </div>
    </div>
  );
}

/**
 * ListSkeleton — mimics a list of items.
 */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl bg-white/80 p-3">
          <Skeleton className="h-10 w-10 shrink-0" variant="circle" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" variant="text" />
            <Skeleton className="h-3 w-1/3" variant="text" />
          </div>
          <Skeleton className="h-6 w-16" variant="text" />
        </div>
      ))}
    </div>
  );
}

/**
 * ProductGridSkeleton — mimics a grid of product cards.
 */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/80 bg-white/90 p-2.5 shadow-soft">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="mt-2.5 space-y-2">
            <Skeleton className="h-3.5 w-4/5" variant="text" />
            <Skeleton className="h-3 w-1/2" variant="text" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-5 w-16" variant="text" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * TableSkeleton — mimics a data table.
 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/90 overflow-hidden shadow-soft">
      {/* Header */}
      <div className="flex gap-4 border-b border-slate-100 bg-slate-50/50 p-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" variant="text" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-slate-50 p-3">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-3 flex-1" variant="text" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * CategorySkeleton — mimics horizontal category chips.
 */
export function CategorySkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-20 shrink-0 rounded-2xl" />
      ))}
    </div>
  );
}

/**
 * PageSkeleton — full page loading state with header + content.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-4 p-3">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" variant="text" />
        <Skeleton className="h-7 w-48" variant="text" />
        <Skeleton className="h-3 w-32" variant="text" />
      </div>
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
