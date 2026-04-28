import { Link } from 'react-router-dom';
import { Eye, Plus } from 'lucide-react';
import { formatCurrency, unitLabels } from '../lib/labels';
import type { Product } from '../types/database';

export function ProductCard({ product, onAdd, list = false }: { product: Product; onAdd: (product: Product) => void; list?: boolean }) {
  const canBuy = product.is_available && (product.stock_quantity ?? 1) > 0;

  return (
    <article className={`relative overflow-hidden rounded-[20px] border border-slate-100 bg-white p-2 shadow-sm ${list ? 'grid grid-cols-[96px_1fr] gap-2' : 'min-h-[224px] max-h-[245px]'}`}>
      {!canBuy && <span className="absolute right-2 top-2 z-10 rounded-full bg-rose-600 px-2 py-1 text-[10px] font-extrabold text-white">مش متاح دلوقتي</span>}
      <Link to={`/products/${product.id}`} className={`block overflow-hidden rounded-2xl bg-[#F4FAFF] ${list ? 'h-24' : 'h-32 sm:h-32'}`}>
        {product.image_1_url ? (
          <img src={product.image_1_url} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center">
            <div className="h-10 w-10 rounded-2xl bg-white/80 shadow-inner" />
          </div>
        )}
      </Link>

      <div className="flex min-h-0 flex-col pt-1.5">
        <Link to={`/products/${product.id}`} className="line-clamp-2 min-h-[34px] text-sm font-extrabold leading-4 text-ink hover:text-azraq-700">
          {product.name}
        </Link>
        <p className="mt-0.5 text-[11px] font-bold text-slate-400">{unitLabels[product.unit_type]}</p>
        <p className="font-display text-lg font-extrabold text-azraq-900">{formatCurrency(product.price)}</p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <Link to={`/products/${product.id}`} className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-100 bg-white px-2 text-[11px] font-extrabold text-slate-600">
            <Eye size={13} />
            تفاصيل
          </Link>
          <button
            type="button"
            onClick={() => onAdd(product)}
            disabled={!canBuy}
            className="grid h-10 w-10 place-items-center rounded-xl bg-azraq-700 text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="زوّد"
          >
            <Plus size={19} />
          </button>
        </div>
      </div>
    </article>
  );
}
