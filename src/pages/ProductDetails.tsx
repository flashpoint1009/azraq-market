import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Minus, Plus, ShoppingCart, Star } from 'lucide-react';
import { Button, Card, ErrorState, LoadingState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency, unitLabels } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Product, ProductReview } from '../types/database';

function StarRating({ value, onChange, size = 22 }: { value: number; onChange?: (value: number) => void; size?: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          className={`transition ${onChange ? 'cursor-pointer active:scale-125' : 'cursor-default'}`}
        >
          <Star
            size={size}
            className={star <= value ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}
          />
        </button>
      ))}
    </div>
  );
}

function SkeletonReview() {
  return (
    <div className="animate-pulse space-y-2 rounded-2xl bg-white p-3 shadow-sm">
      <div className="h-3 w-24 rounded-full bg-slate-100" />
      <div className="h-3 w-full rounded-full bg-slate-100" />
    </div>
  );
}

export function ProductDetails() {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const { addItem } = useCart();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: product, loading, error } = useSupabaseQuery(async () => {
    if (!id) throw new Error('المنتج مش موجود');
    const { data, error } = await supabase.from('products').select('*, categories(id,name)').eq('id', id).single();
    if (error) throw error;
    return data as Product;
  }, [id]);

  const { data: reviews, loading: reviewsLoading, reload: reloadReviews } = useSupabaseQuery(async () => {
    if (!id) return [] as ProductReview[];
    const { data } = await supabase
      .from('product_reviews')
      .select('*, profiles(full_name,phone)')
      .eq('product_id', id)
      .order('created_at', { ascending: false })
      .limit(20);
    return (data || []) as ProductReview[];
  }, [id]);

  const alreadyReviewed = reviews?.some((review) => review.user_id === profile?.id);
  const avgRating = reviews?.length
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  const submitReview = async (rating: number) => {
    if (!profile?.id || !id || reviewSubmitting || alreadyReviewed) return;
    setReviewRating(rating);
    setReviewSubmitting(true);
    const { error: reviewError } = await supabase.from('product_reviews').insert({
      product_id: id,
      user_id: profile.id,
      rating,
      comment: null,
    });
    setReviewSubmitting(false);
    if (reviewError) {
      toast.error('تعذر إرسال التقييم');
      return;
    }
    toast.success('شكراً على تقييمك!');
    reloadReviews();
  };

  if (loading) return <LoadingState />;
  if (error || !product) return <ErrorState message={error || 'المنتج مش موجود'} />;

  const image = product.image_1_url || product.image_2_url;
  const canBuy = product.is_available && (product.stock_quantity ?? 1) > 0;

  return (
    <div className="pb-28">
      {/* Product image — compact height */}
      <div className="overflow-hidden rounded-2xl bg-azraq-50 shadow-sm">
        <div className="h-48 sm:h-64">
          {image ? (
            <img src={image} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-sm font-bold text-azraq-700">صورة المنتج</div>
          )}
        </div>

        {/* Product info right below image */}
        <div className="bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-500">{product.categories?.name || 'تفاصيل المنتج'}</p>
              <h1 className="mt-0.5 font-display text-lg font-extrabold leading-6 text-ink">{product.name}</h1>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${canBuy ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {canBuy ? 'متوفر' : 'غير متاح'}
            </span>
          </div>

          {/* Avg rating inline */}
          {reviews && reviews.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <StarRating value={Math.round(avgRating)} size={14} />
              <span className="text-xs font-bold text-slate-500">{avgRating} ({reviews.length})</span>
            </div>
          )}

          {/* Price */}
          <div className="mt-2 flex items-center justify-between rounded-xl bg-[#F4FAFF] px-3 py-2">
            <div>
              <p className="font-display text-xl font-extrabold text-azraq-900">{formatCurrency(product.price)}</p>
              <p className="text-xs font-bold text-slate-500">{unitLabels[product.unit_type]}</p>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <p className="mt-2 text-xs leading-5 text-slate-500">{product.description}</p>
          )}

          {/* Quantity selector — prominent + and - */}
          <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
            <span className="text-sm font-extrabold text-slate-600">الكمية</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="grid h-9 w-9 place-items-center rounded-xl bg-slate-200 text-slate-700 text-lg font-extrabold transition hover:bg-slate-300 active:scale-95"
              >
                <Minus size={16} />
              </button>
              <strong className="min-w-8 text-center text-lg font-extrabold text-ink">{quantity}</strong>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-azraq-700 text-white text-lg font-extrabold transition hover:bg-azraq-800 active:scale-95"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews section — below product card */}
      <section className="mt-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-base font-extrabold text-ink">تقييمات العملاء</h2>
          {reviews && reviews.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-extrabold text-amber-600">
              <Star size={12} fill="currentColor" /> {avgRating} ({reviews.length})
            </span>
          )}
        </div>

        {/* Tap-to-rate — no button needed */}
        {profile?.role === 'customer' && !alreadyReviewed && !reviewsLoading && (
          <Card className="mb-3 p-3">
            <p className="mb-2 text-xs font-extrabold text-ink">
              {reviewSubmitting ? 'جاري الحفظ...' : 'اضغط على النجوم لتقييم المنتج'}
            </p>
            <StarRating
              value={reviewRating}
              onChange={reviewSubmitting ? undefined : submitReview}
              size={28}
            />
          </Card>
        )}

        {alreadyReviewed && (
          <div className="mb-3 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            شكراً — سبق إن قيّمت المنتج ده
          </div>
        )}

        {reviewsLoading && (
          <div className="grid gap-2">
            {[1, 2].map((index) => <SkeletonReview key={index} />)}
          </div>
        )}

        {!reviewsLoading && reviews && reviews.length === 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-center text-xs font-bold text-slate-500">
            لا توجد تقييمات — كن أول من يقيّم المنتج!
          </div>
        )}

        <div className="grid gap-2">
          {reviews?.map((review) => (
            <div key={review.id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-extrabold text-ink">{review.profiles?.full_name || review.profiles?.phone || 'عميل'}</p>
                <StarRating value={review.rating} size={13} />
              </div>
              {review.comment && <p className="mt-1 text-xs leading-5 text-slate-600">{review.comment}</p>}
              <p className="mt-1 text-2xs font-bold text-slate-500">{new Date(review.created_at).toLocaleDateString('ar-EG')}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sticky bottom bar */}
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
          زوّد للطلب — {formatCurrency(product.price * quantity)}
        </Button>
      </div>
    </div>
  );
}
