import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Minus, Plus, ShoppingCart, Star } from 'lucide-react';
import { Button, Card, ErrorState, LoadingState, SecondaryButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency, unitLabels } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Product, ProductReview } from '../types/database';

function StarRating({ value, onChange }: { value: number; onChange?: (value: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          className={`transition ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
        >
          <Star size={20} className={star <= value ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'} />
        </button>
      ))}
    </div>
  );
}

function SkeletonReview() {
  return (
    <div className="animate-pulse space-y-2 rounded-2xl bg-white p-4 shadow-sm">
      <div className="h-3 w-24 rounded-full bg-slate-100" />
      <div className="h-3 w-full rounded-full bg-slate-100" />
      <div className="h-3 w-3/4 rounded-full bg-slate-100" />
    </div>
  );
}

export function ProductDetails() {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
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
  const avgRating = reviews?.length ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10 : 0;

  const submitReview = async () => {
    if (!profile?.id || !id) return;
    setReviewLoading(true);
    const { error: reviewError } = await supabase.from('product_reviews').insert({
      product_id: id,
      user_id: profile.id,
      rating: reviewRating,
      comment: reviewComment.trim() || null,
    });
    setReviewLoading(false);
    if (reviewError) { toast.error('تعذر إرسال التقييم'); return; }
    toast.success('شكراً على تقييمك!');
    setReviewComment('');
    reloadReviews();
  };

  if (loading) return <LoadingState />;
  if (error || !product) return <ErrorState message={error || 'المنتج مش موجود'} />;

  const image = product.image_1_url || product.image_2_url;
  const canBuy = product.is_available && (product.stock_quantity ?? 1) > 0;

  return (
    <div className="pb-32">
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

          {reviews && reviews.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <StarRating value={Math.round(avgRating)} />
              <span className="text-sm font-bold text-slate-500">{avgRating} ({reviews.length} تقييم)</span>
            </div>
          )}

          <div className="mt-4 rounded-2xl bg-slate-50 p-3">
            <p className="font-display text-2xl font-extrabold text-azraq-900">{formatCurrency(product.price)}</p>
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

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">تقييمات العملاء</h2>
          {reviews && reviews.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-extrabold text-amber-600">
              <Star size={14} fill="currentColor" /> {avgRating}
            </span>
          )}
        </div>

        {profile?.role === 'customer' && !alreadyReviewed && !reviewsLoading && (
          <Card className="mb-4">
            <p className="mb-3 text-sm font-extrabold text-ink">اترك تقييمك</p>
            <StarRating value={reviewRating} onChange={setReviewRating} />
            <textarea
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              placeholder="رأيك في المنتج... (اختياري)"
              rows={3}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-azraq-400 focus:ring-4 focus:ring-azraq-100"
            />
            <Button type="button" onClick={submitReview} disabled={reviewLoading} className="mt-3">
              {reviewLoading ? 'جاري الإرسال...' : 'ابعت التقييم'}
            </Button>
          </Card>
        )}

        {reviewsLoading && (
          <div className="grid gap-3">
            {[1, 2, 3].map((index) => <SkeletonReview key={index} />)}
          </div>
        )}

        {!reviewsLoading && reviews && reviews.length === 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center text-sm font-bold text-slate-400">
            لا توجد تقييمات حتى الآن — كن أول من يقيّم هذا المنتج!
          </div>
        )}

        <div className="grid gap-3">
          {reviews?.map((review) => (
            <div key={review.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-extrabold text-ink">{review.profiles?.full_name || review.profiles?.phone || 'عميل'}</p>
                <StarRating value={review.rating} />
              </div>
              {review.comment && <p className="mt-2 text-sm leading-6 text-slate-600">{review.comment}</p>}
              <p className="mt-2 text-xs font-bold text-slate-400">{new Date(review.created_at).toLocaleDateString('ar-EG')}</p>
            </div>
          ))}
        </div>
      </section>

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
          زوّد للطلب - {formatCurrency(product.price * quantity)}
        </Button>
      </div>
    </div>
  );
}
