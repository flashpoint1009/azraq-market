import { useMemo } from 'react';
import toast from 'react-hot-toast';
import { Clock3, Flame, Sparkles, Zap } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { EmptyState, ErrorState, LoadingState } from '../components/ui';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Product } from '../types/database';

export function DealsPage() {
  const { addItem } = useCart();
  const { data, loading, error } = useSupabaseQuery(async () => {
    const { data, error } = await supabase.from('products').select('*, categories(id,name)').eq('is_available', true).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Product[];
  }, []);

  const deals = useMemo(() => (data || []).filter((product) => (product.discount_type ?? 'none') !== 'none' && Number(product.discount_value || 0) > 0), [data]);

  return (
    <div className="pb-8">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-azraq-950 via-azraq-800 to-orange-500 p-6 text-white shadow-glow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold backdrop-blur">
              <Flame size={14} />
              Flash Deals
            </div>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight">العروض الخاصة</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">خصومات مختارة لمحلك، بتتجدد يوميًا على المنتجات المطلوبة.</p>
          </div>
          <Sparkles className="text-orange-200" size={34} />
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          {['05', '42', '18'].map((value, index) => (
            <div key={index} className="rounded-2xl bg-white/15 p-3 backdrop-blur">
              <p className="font-display text-2xl font-extrabold">{value}</p>
              <p className="text-[11px] text-white/75">{['ساعات', 'دقائق', 'ثواني'][index]}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          ['وفر أكتر', 'خصومات تقريبية على كميات الجملة', Zap],
          ['توصيل أسرع', 'منتجات جاهزة تخرج', Clock3],
          ['ترشيحات ذكية', 'حسب المنتجات الأكثر طلبًا', Sparkles],
        ].map(([title, body, Icon]) => (
          <div key={title as string} className="rounded-2xl bg-white p-4 shadow-soft">
            <Icon className="text-orange-500" size={22} />
            <h3 className="mt-3 font-display text-lg font-extrabold text-ink">{title as string}</h3>
            <p className="mt-1 text-sm text-slate-500">{body as string}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-extrabold text-ink">منتجات عليها عرض</h2>
        <p className="mt-1 text-sm text-slate-500">كل كارت بيعرض توفير تقريبي قبل ما تزود المنتج.</p>
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!loading && !error && deals.length === 0 && <EmptyState title="مفيش عروض دلوقتي" body="العروض هتظهر أول ما تتوفر منتجات مناسبة." />}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {deals.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAdd={(item) => {
                addItem(item);
                toast.success('العرض اتضاف لطلبك');
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
