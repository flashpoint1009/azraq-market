import { Link } from 'react-router-dom';
import { Package, Plus } from 'lucide-react';
import { formatCurrency, unitLabels } from '../lib/labels';
import { getProductPricing } from '../lib/pricing';
import type { Product } from '../types/database';

export function ProductCard({ product, onAdd, list = false }: { product: Product; onAdd: (product: Product) => void; list?: boolean }) {
  const hasStockColumn = product.stock_quantity !== null && product.stock_quantity !== undefined;
  const canBuy = product.is_available && (!hasStockColumn || product.stock_quantity > 0);
  const pricing = getProductPricing(product);
  const imageUrl = product.image_1_url || product.image_2_url || '';
  const shouldLoadImage = Boolean(imageUrl);

  return (
    <article className={`relative overflow-hidden rounded-[18px] border border-slate-100 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${list ? 'grid min-h-[132px] grid-cols-[96px_1fr] gap-2' : 'h-[268px] pb-14'}`}>
      {!canBuy && <span className="absolute right-2 top-2 z-10 rounded-full bg-rose-600 px-2 py-1 text-[10px] font-extrabold text-white">مش متاح دلوقتي</span>}
      {pricing.hasDiscount && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-extrabold text-white">
          وفر {pricing.discountLabel || formatCurrency(pricing.saving)}
        </span>
      )}

      <Link to={`/products/${product.id}`} className={`block overflow-hidden rounded-2xl bg-[#eef6fa] ${list ? 'h-24' : 'h-[132px]'}`}>
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
          className="grid h-full place-items-center bg-gradient-to-br from-azraq-100 to-azraq-500 text-white"
          style={{ display: shouldLoadImage ? 'none' : 'grid' }}
        >
          <Package size={34} strokeWidth={1.8} />
        </div>
      </Link>

      <div className="flex min-h-0 flex-col pt-2 text-center">
        <Link to={`/products/${product.id}`} className="line-clamp-2 min-h-[38px] text-sm font-extrabold leading-5 text-ink hover:text-azraq-700">
          {product.name}
        </Link>
        <p className="mt-0.5 text-[10px] font-bold text-slate-400">{unitLabels[product.unit_type]}</p>
        <div className="mx-auto mt-1 min-w-[104px] rounded-2xl bg-azraq-50 px-2 py-1.5 text-center">
          {pricing.hasDiscount && (
            <p className="text-[10px] font-extrabold leading-4 text-orange-600">
              العرض وفر لك {formatCurrency(pricing.saving)}
            </p>
          )}
          <p className="font-display text-xl font-extrabold leading-none text-azraq-950">
            {formatCurrency(pricing.finalPrice)}
          </p>
          {pricing.hasDiscount && (
            <p className="mt-0.5 text-[10px] font-bold leading-none text-slate-400 line-through">
              {formatCurrency(pricing.basePrice)}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onAdd(product)}
          disabled={!canBuy}
          className="absolute bottom-2 right-2 z-10 grid h-10 w-10 place-items-center rounded-full bg-azraq-700 text-white shadow-lg ring-4 ring-white disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="زود المنتج"
        >
          <Plus size={19} />
        </button>
      </div>
    </article>
  );
}
