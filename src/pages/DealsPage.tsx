import toast from 'react-hot-toast';
import { CalendarDays, Flame, Sparkles } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { Card, EmptyState, ErrorState, LoadingState } from '../components/ui';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Product, Promotion } from '../types/database';

function describePromotion(promotion: Promotion) {
  const discount = promotion.discount_type === 'percentage' ? `${promotion.discount_value}%` : formatCurrency(promotion.discount_value);
  if (promotion.promotion_type === 'order_total') return `خصم ${discount} على طلب بقيمة ${formatCurrency(promotion.min_order_amount || 0)}`;
  if (promotion.promotion_type === 'quantity') return `خصم ${discount} عند شراء ${promotion.min_quantity || 1} قطع`;
  if (promotion.promotion_type === 'bundle') return `عرض مجمع بخصم ${discount}`;
  return `خصم ${discount}`;
}

export function DealsPage() {
  const { addItem } = useCart();
  const { data, loading, error } = useSupabaseQuery(async () => {
    const now = new Date().toISOString();
    const [promotions, products] = await Promise.all([
      supabase
        .from('promotions')
        .select('*, products(id,name,price,image_1_url,unit_type,is_available,stock_quantity,category_id,subcategory_id,description,cost_price,image_2_url,created_at,updated_at)')
        .eq('is_active', true)
        .lte('starts_at', now)
        .gte('ends_at', now)
        .order('created_at', { ascending: false }),
      supabase.from('products').select('*').eq('is_available', true).order('created_at', { ascending: false }),
    ]);
    if (promotions.error) {
      console.error('DEALS_PROMOTIONS_FETCH_FAILED', promotions.error);
      throw promotions.error;
    }
    if (products.error) throw products.error;
    return {
      promotions: (promotions.data || []) as Promotion[],
      products: (products.data || []) as Product[],
    };
  }, []);

  const productPromotions = (data?.promotions || []).filter((promotion) => promotion.promotion_type !== 'order_total');
  const orderPromotions = (data?.promotions || []).filter((promotion) => promotion.promotion_type === 'order_total');

  return (
    <div className="pb-8">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-azraq-900 via-azraq-700 to-sky-500 p-6 text-white shadow-glow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold backdrop-blur">
              <Flame size={14} />
              عروض محددة المدة
            </div>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight">عروض أزرق ماركت</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">خصومات على منتجات، كميات، مجموعات، أو إجمالي الطلب.</p>
          </div>
          <Sparkles className="text-sky-100" size={34} />
        </div>
      </section>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && data?.promotions.length === 0 && <EmptyState title="لا توجد عروض الآن" body="العروض الجديدة ستظهر هنا بمجرد إضافتها من الإدارة." />}

      {!!orderPromotions.length && (
        <section className="mt-5 grid gap-3 md:grid-cols-2">
          {orderPromotions.map((promotion) => (
            <Card key={promotion.id} className="p-4">
              <h3 className="font-display text-xl font-extrabold text-ink">{promotion.title}</h3>
              <p className="mt-2 text-sm font-bold text-azraq-700">{describePromotion(promotion)}</p>
              <p className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                <CalendarDays size={13} />
                {new Date(promotion.starts_at).toLocaleDateString('ar-EG')} - {new Date(promotion.ends_at).toLocaleDateString('ar-EG')}
              </p>
            </Card>
          ))}
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display text-2xl font-extrabold text-ink">منتجات عليها عرض</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {productPromotions.map((promotion) => {
            const product = (promotion.products || data?.products.find((item) => item.id === promotion.product_id)) as Product | undefined;
            if (!product) return null;
            return (
              <div key={promotion.id} className="grid gap-2">
                <div className="rounded-2xl bg-white px-3 py-2 text-xs font-extrabold text-emerald-700 shadow-sm">{promotion.title}: {describePromotion(promotion)}</div>
                <ProductCard
                  product={product}
                  onAdd={(item) => {
                    addItem(item);
                    toast.success('العرض اتضاف لطلبك');
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
