import toast from 'react-hot-toast';
import { Star, Trash2 } from 'lucide-react';
import { Card, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { ProductReview } from '../types/database';

export function AdminReviewsPage() {
  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const result = await supabase
      .from('product_reviews')
      .select('*, profiles(full_name,phone), products(id,name)')
      .order('created_at', { ascending: false });
    if (result.error) throw result.error;
    return (result.data || []) as ProductReview[];
  }, []);

  const remove = async (id: string) => {
    if (!window.confirm('حذف التقييم؟')) return;
    const { error: deleteError } = await supabase.from('product_reviews').delete().eq('id', id);
    if (deleteError) toast.error(deleteError.message);
    else {
      toast.success('تم حذف التقييم');
      reload();
    }
  };

  return (
    <div>
      <PageHeader title="تقييمات المنتجات" subtitle="مراجعة آراء العملاء وحذف غير المناسب." />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      <div className="grid gap-3">
        {data?.map((review) => (
          <Card key={review.id} className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-extrabold">{review.products?.name || 'منتج'}</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-extrabold text-amber-600"><Star size={13} fill="currentColor" /> {review.rating}</span>
              </div>
              <p className="mt-1 text-sm font-bold text-slate-500">{review.profiles?.full_name || review.profiles?.phone || 'عميل'}</p>
              {review.comment && <p className="mt-2 text-sm leading-6 text-slate-600">{review.comment}</p>}
            </div>
            <button type="button" onClick={() => remove(review.id)} className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600"><Trash2 size={16} /></button>
          </Card>
        ))}
      </div>
    </div>
  );
}
