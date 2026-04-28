import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Boxes, Flame, PackageCheck, Search, Sparkles, Zap } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { EmptyState, ErrorState, LoadingState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Category, Product } from '../types/database';

const categoryIcons = [Boxes, PackageCheck, Sparkles, Flame, Zap];

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="h-60 animate-pulse rounded-2xl bg-white/85 shadow-sm" />
      ))}
    </div>
  );
}

export function CustomerHome() {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const { profile } = useAuth();
  const { addItem, total, count } = useCart();

  const { data, loading, error } = useSupabaseQuery(async () => {
    const [categoriesResult, productsResult] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*, categories(id,name)').order('created_at', { ascending: false }),
    ]);
    if (categoriesResult.error) throw categoriesResult.error;
    if (productsResult.error) throw productsResult.error;
    return {
      categories: (categoriesResult.data || []) as Category[],
      products: (productsResult.data || []) as Product[],
    };
  }, []);

  const products = useMemo(() => data?.products ?? [], [data]);
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim();
    return products.filter((product) => {
      const matchesQuery = !normalizedQuery || product.name.includes(normalizedQuery) || product.description?.includes(normalizedQuery);
      const matchesCategory = categoryId === 'all' || product.category_id === categoryId;
      return matchesQuery && matchesCategory;
    });
  }, [products, query, categoryId]);

  const dealProducts = useMemo(() => filteredProducts.filter((_, index) => index % 3 === 0).slice(0, 8), [filteredProducts]);
  const topProducts = useMemo(() => filteredProducts.slice(0, 10), [filteredProducts]);
  const restProducts = useMemo(() => filteredProducts.slice(10), [filteredProducts]);

  const renderSection = (title: string, items: Product[]) => (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-lg font-extrabold text-ink">{title}</h2>
        <span className="text-xs font-bold text-slate-400">{items.length} منتج</span>
      </div>
      {items.length === 0 ? (
        <EmptyState title="مفيش منتجات دلوقتي" body="جرّب تدور بكلمة تانية أو اختار قسم مختلف." />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {items.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAdd={(item) => {
                addItem(item);
                toast.success('المنتج اتضاف');
              }}
            />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="pb-4">
      <header className="rounded-2xl bg-gradient-to-l from-azraq-900 to-azraq-700 p-3 text-white shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold">أهلًا {profile?.full_name || 'يا تاجر'}</p>
            <p className="mt-0.5 text-[11px] text-azraq-100">{count} صنف في الطلب</p>
          </div>
          <div className="shrink-0 rounded-2xl bg-white/14 px-3 py-2 text-left">
            <p className="text-[10px] font-bold text-azraq-100">إجمالي السلة</p>
            <p className="font-display text-base font-extrabold">{formatCurrency(total)}</p>
          </div>
        </div>
      </header>

      <section className="sticky top-2 z-20 mt-3 rounded-2xl border border-white bg-white/95 p-2 shadow-sm backdrop-blur">
        <div className="relative">
          <Search className="absolute right-3 top-3 text-slate-400" size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="دوّر على منتج..."
            className="h-11 w-full rounded-2xl border border-slate-100 bg-slate-50 pr-10 pl-3 text-sm font-semibold outline-none transition focus:border-azraq-300 focus:bg-white"
          />
        </div>
      </section>

      <section className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setCategoryId('all')} className={`grid h-20 min-w-20 place-items-center rounded-2xl px-2 text-xs font-extrabold shadow-sm ${categoryId === 'all' ? 'bg-azraq-700 text-white' : 'bg-white text-slate-600'}`}>
          <Boxes size={22} />
          الكل
        </button>
        {data?.categories.map((category, index) => {
          const Icon = categoryIcons[index % categoryIcons.length];
          return (
            <button key={category.id} onClick={() => setCategoryId(category.id)} className={`grid h-20 min-w-20 place-items-center rounded-2xl px-2 text-xs font-extrabold shadow-sm ${categoryId === category.id ? 'bg-azraq-700 text-white' : 'bg-white text-slate-600'}`}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-azraq-50 text-azraq-700">
                <Icon size={18} />
              </span>
              <span className="line-clamp-1">{category.name}</span>
            </button>
          );
        })}
      </section>

      {error && <div className="mt-3"><ErrorState message={error} /></div>}
      {loading && <div className="mt-4"><LoadingState label="بنحمّل المنتجات..." /><SkeletonGrid /></div>}
      {!loading && !error && renderSection('أفضل العروض', dealProducts)}
      {!loading && !error && renderSection('المنتجات الأكثر طلبًا', topProducts)}
      {!loading && !error && renderSection('باقي المنتجات', restProducts.length ? restProducts : filteredProducts)}
    </div>
  );
}
