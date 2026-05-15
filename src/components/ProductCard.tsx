import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Package, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, unitLabels } from '../lib/labels';
import { getProductPricing } from '../lib/pricing';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Product } from '../types/database';

export function ProductCard({ product, onAdd, list = false }: { product: Product; onAdd: (product: Product) => void; list?: boolean }) {
  const { profile } = useAuth();
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const hasStockColumn = product.stock_quantity !== null && product.stock_quantity !== undefined;
  const canBuy = product.is_available && (!hasStockColumn || product.stock_quantity > 0);
  const pricing = getProductPricing(product);
  const imageUrl = product.image_1_url || product.image_2_url || '';
  const shouldLoadImage = Boolean(imageUrl);

  const toggleWishlist = async () => {
    if (!profile?.id) return;
    setWishlistLoading(true);
    try {
      if (wishlisted) {
        await supabase.from('wishlists').delete().eq('user_id', profile.id).eq('product_id', product.id);
        setWishlisted(false);
        toast.success('اتشال من المفضلة');
      } else {
        await supabase.from('wishlists').upsert({ user_id: profile.id, product_id: product.id }, { onConflict: 'user_id,product_id' });
        setWishlisted(true);
        toast.success('اتضاف للمفضلة');
      }
    } catch {
      toast.error('في مشكلة، حاول تاني');
    } finally {
      setWishlistLoading(false);
    }
  };

  return (
    <article className={`relative overflow-hidden rounded-2xl border border-slate-50 bg-white p-1.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${list ? 'grid min-h-[110px] grid-cols-[80px_1fr] gap-2' : 'pb-12'}`}>
      {!canBuy && <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-rose-600/90 px-1.5 py-0.5 text-2xs font-bold text-white backdrop-blur-sm">غير متاح</span>}
      {pricing.hasDiscount && (
        <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-orange-500/90 px-1.5 py-0.5 text-2xs font-bold text-white backdrop-blur-sm">
          {pricing.discountLabel || `-${formatCurrency(pricing.saving)}`}
        </span>
      )}

      {profile?.role === 'customer' && (
        <button
          type="button"
          onClick={toggleWishlist}
          disabled={wishlistLoading}
          className={`absolute left-1.5 bottom-14 z-10 grid h-7 w-7 place-items-center rounded-full transition ${wishlisted ? 'bg-rose-500 text-white shadow-sm' : 'bg-white/80 text-slate-400 ring-1 ring-slate-100 backdrop-blur-sm'}`}
          aria-label="أضف للمفضلة"
        >
          <Heart size={12} fill={wishlisted ? 'currentColor' : 'none'} />
        </button>
      )}

      <Link to={`/products/${product.id}`} className={`block overflow-hidden rounded-xl bg-[#f0f7fb] ${list ? 'h-20' : 'aspect-square'}`}>
        {shouldLoadImage ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(event) => {
              const img = event.currentTarget;
              img.style.display = 'none';
              const fallback = img.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = 'grid';
            }}
          />
        ) : null}

        <div
          className="grid h-full place-items-center bg-gradient-to-br from-azraq-50 to-azraq-200 text-azraq-400"
          style={{ display: shouldLoadImage ? 'none' : 'grid' }}
        >
          <Package size={28} strokeWidth={1.5} />
        </div>
      </Link>

      <div className="flex min-h-0 flex-col px-1 pt-1.5">
        <Link to={`/products/${product.id}`} className="line-clamp-2 text-xs font-bold leading-[1.4] text-ink hover:text-azraq-700">
          {product.name}
        </Link>
        <div className="mt-auto flex items-end justify-between gap-1 pt-1">
          <div>
            <p className="font-display text-sm font-extrabold text-azraq-800">
              {formatCurrency(pricing.finalPrice)}
            </p>
            {pricing.hasDiscount && (
              <p className="text-2xs font-bold text-slate-400 line-through">
                {formatCurrency(pricing.basePrice)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onAdd(product)}
            disabled={!canBuy}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-azraq-700 text-white shadow-sm transition hover:bg-azraq-800 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="زود المنتج"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
