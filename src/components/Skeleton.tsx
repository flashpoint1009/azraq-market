/**
 * Skeleton loading components for smooth content loading UX.
 */

export function SkeletonBox({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/60 ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-[20px] bg-white p-2.5 shadow-sm">
      <SkeletonBox className="mb-2.5 h-32 w-full rounded-2xl" />
      <SkeletonBox className="mb-2 h-4 w-3/4" />
      <SkeletonBox className="mb-2 h-3 w-1/2" />
      <div className="flex items-center justify-between">
        <SkeletonBox className="h-5 w-16" />
        <SkeletonBox className="h-8 w-8 rounded-xl" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <SkeletonBox className="h-4 w-24" />
        <SkeletonBox className="h-6 w-16 rounded-full" />
      </div>
      <SkeletonBox className="mt-2 h-3 w-32" />
      <SkeletonBox className="mt-2 h-3 w-20" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white">
      <div className="flex gap-3 border-b border-slate-100 p-3">
        {Array.from({ length: cols }).map((_, index) => (
          <SkeletonBox key={index} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3 border-b border-slate-50 p-3 last:border-b-0">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <SkeletonBox key={colIndex} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {Array.from({ length: 6 }).map((_, index) => (
        <SkeletonBox key={index} className="h-[82px] rounded-2xl" />
      ))}
    </div>
  );
}
