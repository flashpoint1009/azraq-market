import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, Heart, Package, Plus, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, unitLabels } from '../lib/labels';
import { getProductPricing } from '../lib/pricing';
import { supabase } from '../lib/supabase';
import type { Product } from '../types/database';

export function ProductCard({ product, onAdd, list = false }: { product: Product; onAdd: (product: Product) => void; list?: boolean }) {
  const { profile } = useAuth();
  const hasStockColumn = product.stock_quantity !== null && product.stock_quantity !== undefined;
  const canBuy = product.is_available && (!hasStockColumn || product.stock_quantity > 0);
  const pricing = getProductPricing(product);
  const [rating, setRating] = useState({ average: product.average_rating ?? 0, count: product.reviews_count ?? 0 });
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase
      .from('product_reviews')
      .select('rating')
      .eq('product_id', product.id)
      .then(({ data }) => {
        if (!alive || !data?.length) return;
        const average = data.reduce((sum, item) => sum + Number(item.rating || 0), 0) / data.length;
        setRating({ average, count: data.length });
      });

    if (profile?.id) {
      supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', profile.id)
        .eq('product_id', product.id)
        .maybeSingle()
        .then(({ data }) => {
          if (alive) setFavorite(Boolean(data));
        });
    }
    return () => {
      alive = false;
    };
  }, [product.id, profile?.id]);

  const toggleFavorite = async () => {
    if (!profile) {
      toast.error('سجل دخولك الأول');
      return;
    }
    if (favorite) {
      const { error } = await supabase.from('wishlists').delete().eq('user_id', profile.id).eq('product_id', product.id);
      if (error) toast.error(error.message);
      else setFavorite(false);
      return;
    }
    const { error } = await supabase.from('wishlists').insert({ user_id: profile.id, product_id: product.id });
    if (error) toast.error(error.message);
    else {
      setFavorite(true);
      toast.success('اتضاف للمفضلة');
    }
  };

  return (
    <article className={`relative rounded-[20px] border border-slate-100 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${list ? 'grid min-h-[132px] grid-cols-[96px_1fr] gap-2' : 'h-[245px] pb-12'}`}>
      {!canBuy && <span className="absolute right-2 top-2 z-10 rounded-full bg-rose-600 px-2 py-1 text-[10px] font-extrabold text-white">مش متاح دلوقتي</span>}
      {pricing.hasDiscount && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-extrabold text-white shadow-sm">
          {pricing.discountLabel || `وفر ${formatCurrency(pricing.saving)}`}
        </span>
      )}
      <Link to={`/products/${product.id}`} className={`block overflow-hidden rounded-2xl bg-[#F4FAFF] ${list ? 'h-24' : 'h-[135px]'}`}>
        {product.image_1_url ? (
          <img src={product.image_1_url} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center bg-gradient-to-br from-azraq-50 to-white text-azraq-700">
            <Package size={34} strokeWidth={1.8} />
          </div>
        )}
      </Link>
      <button type="button" onClick={toggleFavorite} className="absolute left-2 top-11 z-20 grid h-8 w-8 place-items-center rounded-xl bg-white/90 text-rose-500 shadow-sm">
        <Heart size={15} fill={favorite ? 'currentColor' : 'none'} />
      </button>

      <div className="flex min-h-0 flex-col pt-1">
        <Link to={`/products/${product.id}`} className="line-clamp-2 min-h-[34px] text-sm font-extrabold leading-4 text-ink hover:text-azraq-700">
          {product.name}
        </Link>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold text-slate-400">{unitLabels[product.unit_type]}</p>
          <p className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-500">
            <Star size={12} fill="currentColor" />
            {rating.count ? rating.average.toFixed(1) : 'جديد'}
          </p>
        </div>
        <div className="mt-0.5">
          <p className="font-display text-base font-extrabold text-azraq-900">{formatCurrency(pricing.finalPrice)}</p>
          {pricing.hasDiscount && (
            <div className="flex flex-wrap items-center gap-1 text-[10px] font-extrabold text-orange-600">
              <span>العرض وفر لك {formatCurrency(pricing.saving)}</span>
              <span className="text-slate-400 line-through">{formatCurrency(pricing.basePrice)}</span>
            </div>
          )}
        </div>

        <div className="absolute inset-x-2 bottom-2 z-20 flex items-center justify-between gap-2">
          <Link to={`/products/${product.id}`} className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-100 bg-white px-2 text-[11px] font-extrabold text-slate-600 shadow-sm">
            <Eye size={13} />
            تفاصيل
          </Link>
          <button
            type="button"
            onClick={() => onAdd(product)}
            disabled={!canBuy}
            className="grid h-10 w-10 place-items-center rounded-full bg-azraq-700 text-white shadow-lg ring-4 ring-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="زوّد"
          >
            <Plus size={19} />
          </button>
        </div>
      </div>
    </article>
  );
}
