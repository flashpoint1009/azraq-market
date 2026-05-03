import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Minus, Plus, ShoppingCart, Star } from 'lucide-react';
import { Button, Card, ErrorState, LoadingState, SecondaryButton, Textarea } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency, unitLabels } from '../lib/labels';
import { getProductPricing } from '../lib/pricing';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Product, ProductReview } from '../types/database';

export function ProductDetails() {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const { profile } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const { data: product, loading, error } = useSupabaseQuery(async () => {
    if (!id) throw new Error('المنتج مش موجود');
    const { data, error } = await supabase.from('products').select('*, categories(id,name)').eq('id', id).single();
    if (error) throw error;
    return data as Product;
  }, [id]);
  const { data: reviews, loading: reviewsLoading, reload: reloadReviews } = useSupabaseQuery(async () => {
    if (!id) return [] as ProductReview[];
    const { data, error } = await supabase
      .from('product_reviews')
      .select('*, profiles(full_name,phone)')
      .eq('product_id', id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as ProductReview[];
  }, [id]);
  const { data: canReview } = useSupabaseQuery(async () => {
    if (!id || !profile?.id) return false;
    const { data, error } = await supabase
      .from('order_items')
      .select('id, orders!inner(customer_id,status)')
      .eq('product_id', id)
      .eq('orders.customer_id', profile.id)
      .eq('orders.status', 'delivered')
      .limit(1);
    if (error) {
      console.error('PRODUCT_REVIEW_ELIGIBILITY_FAILED', error);
      return false;
    }
    return Boolean(data?.length);
  }, [id, profile?.id]);

  if (loading) return <LoadingState />;
  if (error || !product) return <ErrorState message={error || 'المنتج مش موجود'} />;

  const image = product.image_1_url || product.image_2_url;
  const canBuy = product.is_available && (product.stock_quantity ?? 1) > 0;
  const pricing = getProductPricing(product);
  const averageRating = reviews?.length ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length : 0;
  const saveReview = async () => {
    if (!profile || !id) return;
    setSavingReview(true);
    const { error } = await supabase.from('product_reviews').upsert({
      product_id: id,
      customer_id: profile.id,
      rating,
      comment: comment || null,
    }, { onConflict: 'product_id,customer_id' });
    setSavingReview(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('تم حفظ التقييم');
    setComment('');
    reloadReviews();
  };

  return (
    <div className="pb-24">
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="h-72 bg-azraq-50 sm:h-96">
          {image ? (
            <img src={image} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-sm font-bold text-azraq-700">صورة المنتج</div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-400">{product.categories?.name || 'تفاصيل المنتج'}</p>
              <h1 className="mt-1 font-display text-2xl font-extrabold leading-8 text-ink">{product.name}</h1>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-extrabold ${canBuy ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {canBuy ? 'متوفر' : 'مش متاح دلوقتي'}
            </span>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-3">
            <p className="font-display text-2xl font-extrabold text-azraq-900">{formatCurrency(pricing.finalPrice)}</p>
            {pricing.hasDiscount && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-extrabold text-orange-600">
                <span>العرض وفر لك {formatCurrency(pricing.saving)}</span>
                <span className="text-slate-400 line-through">{formatCurrency(pricing.basePrice)}</span>
              </div>
            )}
            <p className="mt-1 text-sm font-bold text-slate-500">الوحدة: {unitLabels[product.unit_type]}</p>
          </div>

          <p className="mt-4 text-sm leading-7 text-slate-600">{product.description || 'مفيش وصف للمنتج دلوقتي.'}</p>

          <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-2">
            <span className="text-sm font-extrabold text-slate-600">الكمية</span>
            <div className="flex items-center gap-3">
              <SecondaryButton className="h-10 w-10 p-0" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                <Minus size={16} />
              </SecondaryButton>
              <strong className="min-w-8 text-center text-lg">{quantity}</strong>
              <SecondaryButton className="h-10 w-10 p-0" onClick={() => setQuantity(quantity + 1)}>
                <Plus size={16} />
              </SecondaryButton>
            </div>
          </div>
        </div>
      </div>

      <Card className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-extrabold text-ink">تقييمات المنتج</h2>
          <p className="inline-flex items-center gap-1 text-sm font-extrabold text-amber-500">
            <Star size={16} fill="currentColor" />
            {reviews?.length ? averageRating.toFixed(1) : 'جديد'}
          </p>
        </div>
        {canReview && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" onClick={() => setRating(value)} className="text-amber-500">
                  <Star size={22} fill={value <= rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="اكتب رأيك في المنتج..." rows={3} className="mt-3" />
            <Button type="button" onClick={saveReview} disabled={savingReview} className="mt-3">
              {savingReview ? 'جاري الحفظ...' : 'حفظ التقييم'}
            </Button>
          </div>
        )}
        {reviewsLoading && <LoadingState label="بنحمّل التقييمات..." />}
        <div className="mt-4 grid gap-2">
          {reviews?.map((review) => (
            <div key={review.id} className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-extrabold text-ink">{review.profiles?.full_name || 'عميل'}</p>
                <p className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-500"><Star size={13} fill="currentColor" /> {review.rating}</p>
              </div>
              {review.comment && <p className="mt-2 text-sm leading-6 text-slate-600">{review.comment}</p>}
            </div>
          ))}
          {!reviewsLoading && !reviews?.length && <p className="text-sm font-bold text-slate-400">لسه مفيش تقييمات.</p>}
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/95 p-3 shadow-soft backdrop-blur lg:right-72">
        <Button
          disabled={!canBuy}
          onClick={() => {
            addItem(product, quantity);
            toast.success('المنتج اتضاف');
            navigate('/cart');
          }}
          className="h-12 w-full rounded-2xl"
        >
          <ShoppingCart size={18} />
          زوّد للطلب - {formatCurrency(pricing.finalPrice * quantity)}
        </Button>
      </div>
    </div>
  );
}
