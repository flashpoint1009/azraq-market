import { useCallback, useEffect, useRef } from 'react';

/**
 * Hook that triggers a callback when a sentinel element becomes visible.
 * Used for infinite scroll / "load more" behavior.
 */
export function useInfiniteScroll(
  onIntersect: () => void,
  options: { enabled?: boolean; rootMargin?: string } = {}
) {
  const { enabled = true, rootMargin = '200px' } = options;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onIntersect);
  callbackRef.current = onIntersect;

  const setSentinel = useCallback((node: HTMLDivElement | null) => {
    sentinelRef.current = node;
  }, []);

  useEffect(() => {
    if (!enabled || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          callbackRef.current();
        }
      },
      { rootMargin }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return { sentinelRef: setSentinel };
}
