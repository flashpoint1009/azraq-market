import { Link } from 'react-router-dom';
import { Eye, Plus, Sparkles } from 'lucide-react';
import { formatCurrency, unitLabels } from '../lib/labels';
import type { Product } from '../types/database';

function offerSaving(product: Product) {
  return Math.max(3, Math.round(Number(product.price || 0) * 0.08));
}

export function ProductCard({ product, onAdd, list = false }: { product: Product; onAdd: (product: Product) => void; list?: boolean }) {
  const saving = offerSaving(product);
  const canBuy = product.is_available && (product.stock_quantity ?? 1) > 0;

  return (
    <article className={`group relative overflow-hidden rounded-2xl border border-white bg-white p-3 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-glow ${list ? 'grid grid-cols-[112px_1fr] gap-4' : ''}`}>
      <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-sm">
        <Sparkles size={12} />
        وفر {saving} ج
      </div>
      <Link to={`/products/${product.id}`} className={`block overflow-hidden rounded-2xl bg-azraq-50 ${list ? 'h-28' : 'h-40 sm:h-44'}`}>
        {product.image_1_url ? (
          <img src={product.image_1_url} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center bg-gradient-to-br from-azraq-100 via-white to-orange-50 text-sm font-bold text-azraq-700">صورة المنتج</div>
        )}
      </Link>
      <div className="flex min-h-0 flex-1 flex-col pt-3">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/products/${product.id}`} className="line-clamp-2 font-display text-base font-extrabold leading-6 text-ink hover:text-azraq-700">
            {product.name}
          </Link>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold ${product.is_available ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {canBuy ? 'متوفر' : 'مش متاح دلوقتي'}
          </span>
        </div>
        <p className="mt-1 text-xs font-bold text-slate-400">الوحدة: {unitLabels[product.unit_type]}</p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="font-display text-lg font-extrabold text-azraq-900">{formatCurrency(product.price)}</p>
            <p className="text-[11px] font-bold text-emerald-600">توفير تقريبي {formatCurrency(saving)}</p>
          </div>
          <div className="flex gap-2">
            <Link to={`/products/${product.id}`} className="grid h-10 w-10 place-items-center rounded-2xl border border-azraq-100 bg-white text-azraq-700 shadow-sm transition hover:-translate-y-0.5">
              <Eye size={17} />
            </Link>
            <button
              type="button"
              onClick={() => onAdd(product)}
              disabled={!canBuy}
              className="grid h-10 w-10 place-items-center rounded-2xl bg-azraq-700 text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-azraq-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
