import { useCallback, useEffect, useState } from 'react';
import type { DependencyList } from 'react';

export function useSupabaseQuery<T>(loader: () => Promise<T>, deps: DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Callers pass deps explicitly, similar to useEffect, to avoid over-fetching on inline loaders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loader());
    } catch (err) {
      console.error('SUPABASE_QUERY_FAILED', err);
      setError('تعذر تحميل البيانات، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
