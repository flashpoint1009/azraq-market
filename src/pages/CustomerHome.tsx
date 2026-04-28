import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bell, Boxes, ChevronLeft, Clock3, Flame, Grid2X2, List, Menu, PackageCheck, Repeat2, Search, Sparkles, TrendingUp, WalletCards, Zap } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { EmptyState, ErrorState, LoadingState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Category, Order, Product } from '../types/database';

const categoryIcons = [Boxes, PackageCheck, Sparkles, Flame, Zap];

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-72 animate-pulse rounded-2xl bg-white/80 shadow-sm" />
      ))}
    </div>
  );
}

function uniqueProducts(products: Product[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

export function CustomerHome() {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [list, setList] = useState(false);
  const { profile } = useAuth();
  const { addItem, fillFromOrder, total, count } = useCart();

  const { data, loading, error } = useSupabaseQuery(async () => {
    const [categoriesResult, productsResult, ordersResult] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*, categories(id,name)').order('created_at', { ascending: false }),
      supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('customer_id', profile?.id || '')
        .order('created_at', { ascending: false })
        .limit(3),
    ]);
    if (categoriesResult.error) throw categoriesResult.error;
    if (productsResult.error) throw productsResult.error;
    if (ordersResult.error) throw ordersResult.error;
    return {
      categories: (categoriesResult.data || []) as Category[],
      products: (productsResult.data || []) as Product[],
      recentOrders: (ordersResult.data || []) as Order[],
    };
  }, [profile?.id]);

  const products = useMemo(() => data?.products ?? [], [data]);
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim();
    return products.filter((product) => {
      const matchesQuery = !normalizedQuery || product.name.includes(normalizedQuery) || product.description?.includes(normalizedQuery);
      const matchesCategory = categoryId === 'all' || product.category_id === categoryId;
      return matchesQuery && matchesCategory;
    });
  }, [products, query, categoryId]);

  const topProducts = useMemo(() => filteredProducts.slice(0, 8), [filteredProducts]);
  const dealProducts = useMemo(() => filteredProducts.filter((_, index) => index % 3 === 0).slice(0, 8), [filteredProducts]);
  const usualProducts = useMemo(() => {
    const orderedNames = new Set((data?.recentOrders || []).flatMap((order) => order.order_items?.map((item) => item.product_name_snapshot) || []));
    return uniqueProducts(products.filter((product) => orderedNames.has(product.name))).slice(0, 8);
  }, [data?.recentOrders, products]);

  const repeatOrder = async (order: Order) => {
    const ids = order.order_items?.map((item) => item.product_id).filter(Boolean) as string[];
    const { data } = await supabase.from('products').select('*').in('id', ids);
    const sourceProducts = (data || []) as Product[];
    fillFromOrder(
      (order.order_items || []).flatMap((item) => {
        const product = sourceProducts.find((entry) => entry.id === item.product_id);
        return product ? [{ product, quantity: item.quantity }] : [];
      }),
    );
    toast.success('جهزنا طلبك القديم في السلة');
  };

  const featuredProduct = usualProducts[0] || topProducts[0];
  const bestDeal = dealProducts[0] || topProducts[1] || topProducts[0];
  const monthSaving = Math.round((data?.recentOrders || []).reduce((sum, order) => sum + Number(order.total_amount || 0), 0) * 0.06);

  const renderSection = (title: string, subtitle: string, items: Product[]) => (
    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <ChevronLeft className="text-slate-300" size={22} />
      </div>
      {items.length === 0 ? (
        <EmptyState title="مفيش منتجات دلوقتي" body="جرّب تدور بكلمة تانية أو اختار قسم مختلف." />
      ) : (
        <div className={list ? 'grid gap-4' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4'}>
          {items.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              list={list}
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
    <div className="pb-8">
      <header className="rounded-[2rem] bg-gradient-to-br from-azraq-950 via-azraq-800 to-azraq-600 p-5 text-white shadow-glow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-azraq-100">صباح الخير يا {profile?.full_name || 'عميل أزرق'} 👋</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight">اطلب اللي ناقصك بسرعة</h1>
            <p className="mt-2 line-clamp-1 text-sm text-azraq-100">{profile?.address || 'اختار عنوان الفرع من حسابك'}</p>
          </div>
          <div className="flex gap-2">
            <button className="grid h-11 w-11 place-items-center rounded-2xl bg-white/12 text-white backdrop-blur"><Bell size={19} /></button>
            <button className="grid h-11 w-11 place-items-center rounded-2xl bg-white/12 text-white backdrop-blur"><Menu size={20} /></button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
            <p className="text-xs text-azraq-100">قيمة طلبك الحالي</p>
            <p className="mt-1 font-display text-2xl font-extrabold">{formatCurrency(total)}</p>
          </div>
          <div className="rounded-2xl bg-orange-400 p-4 text-azraq-950">
            <p className="text-xs font-extrabold">عدد الأصناف</p>
            <p className="mt-1 font-display text-2xl font-extrabold">{count} صنف</p>
          </div>
        </div>
      </header>

      <section className="sticky top-3 z-20 mt-4 rounded-2xl border border-white bg-white/95 p-2 shadow-soft backdrop-blur">
        <div className="relative">
          <Search className="absolute right-4 top-3.5 text-slate-400" size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="دوّر على منتج..."
            className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3 pr-11 pl-4 text-sm outline-none transition focus:border-azraq-300 focus:bg-white"
          />
        </div>
      </section>

      <section className="mt-5 flex gap-3 overflow-x-auto pb-2">
        {[
          ['عروض اليوم', 'خصومات مختارة لمحلك', Flame, 'from-orange-500 to-orange-400'],
          ['توصيل خلال ساعتين', 'لو الطلب جاهز بدري', Clock3, 'from-azraq-700 to-azraq-500'],
          ['وفر الأسبوع ده', 'اختيارات ذكية من أزرق', WalletCards, 'from-emerald-600 to-emerald-400'],
        ].map(([title, body, Icon, gradient]) => (
          <div key={title as string} className={`min-w-[270px] rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-soft`}>
            <Icon size={24} />
            <h3 className="mt-4 font-display text-xl font-extrabold">{title as string}</h3>
            <p className="mt-1 text-sm text-white/85">{body as string}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-extrabold text-ink">كرر طلبك بسرعة</h2>
            <p className="text-sm text-slate-500">آخر 3 طلبات جاهزة تتضاف للطلب</p>
          </div>
          <Repeat2 className="text-azraq-600" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)
          ) : data?.recentOrders.length ? (
            data.recentOrders.map((order) => (
              <button key={order.id} onClick={() => repeatOrder(order)} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right transition hover:-translate-y-0.5 hover:border-azraq-200 hover:bg-white">
                <p className="font-bold text-ink">طلب #{order.id.slice(0, 8)}</p>
                <p className="mt-1 text-xs text-slate-500">{order.order_items?.length || 0} منتج - {formatCurrency(order.total_amount)}</p>
                <span className="mt-3 inline-flex rounded-full bg-azraq-700 px-3 py-1 text-xs font-bold text-white">كرر الطلب</span>
              </button>
            ))
          ) : (
            <div className="md:col-span-3 rounded-2xl bg-azraq-50 p-4 text-sm font-bold text-azraq-800">أول طلب هتبعته هيظهر هنا وتقدر تكرره بسرعة.</div>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 font-display text-xl font-extrabold text-ink">مساعد أزرق</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ['أكتر منتج بتطلبه', featuredProduct?.name || 'ابدأ أول طلب وهنعرف المعتاد عندك', TrendingUp, 'text-azraq-700'],
            ['أفضل عرض ليك اليوم', bestDeal?.name || 'العروض هتظهر حسب طلباتك', Sparkles, 'text-orange-500'],
            ['وفّرت الشهر ده', `${monthSaving || 0} جنيه`, WalletCards, 'text-emerald-600'],
          ].map(([title, value, Icon, tone]) => (
            <div key={title as string} className="rounded-2xl border border-white bg-white p-4 shadow-soft">
              <Icon className={tone as string} size={22} />
              <p className="mt-3 text-xs font-bold text-slate-400">{title as string}</p>
              <p className="mt-1 line-clamp-2 font-display text-lg font-extrabold text-ink">{value as string}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 flex gap-3 overflow-x-auto pb-2">
        <button onClick={() => setCategoryId('all')} className={`min-w-24 rounded-2xl px-4 py-3 text-sm font-extrabold shadow-sm ${categoryId === 'all' ? 'bg-azraq-700 text-white' : 'bg-white text-slate-600'}`}>الكل</button>
        {data?.categories.map((category, index) => {
          const Icon = categoryIcons[index % categoryIcons.length];
          return (
            <button key={category.id} onClick={() => setCategoryId(category.id)} className={`min-w-32 rounded-2xl px-4 py-3 text-sm font-extrabold shadow-sm ${categoryId === category.id ? 'bg-azraq-700 text-white' : 'bg-white text-slate-600'}`}>
              <Icon className="mx-auto mb-2" size={20} />
              {category.name}
            </button>
          );
        })}
      </section>

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={() => setList(false)} className={`grid h-10 w-10 place-items-center rounded-2xl ${!list ? 'bg-azraq-700 text-white' : 'bg-white text-slate-500'}`}><Grid2X2 size={18} /></button>
        <button onClick={() => setList(true)} className={`grid h-10 w-10 place-items-center rounded-2xl ${list ? 'bg-azraq-700 text-white' : 'bg-white text-slate-500'}`}><List size={18} /></button>
      </div>

      {error && <div className="mt-5"><ErrorState message={error} /></div>}
      {loading && <div className="mt-6"><SkeletonGrid /></div>}
      {!loading && !error && renderSection('الأكثر طلبًا', 'منتجات بتتحرك بسرعة في السوق', topProducts)}
      {!loading && !error && renderSection('عروض اليوم', 'وفر أكتر مع خصومات مناسبة لمحلك', dealProducts)}
      {!loading && !error && renderSection('منتجاتك المعتادة', 'حاجات شبه آخر طلباتك', usualProducts.length ? usualProducts : topProducts.slice(0, 4))}
      {!loading && !error && renderSection('كل المنتجات', 'كل منتجات أزرق ماركت', filteredProducts)}

      <Link to="/deals" className="fixed bottom-24 left-4 z-30 inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-3 text-sm font-extrabold text-white shadow-glow lg:bottom-6">
        <Flame size={18} />
        عروض X
      </Link>
    </div>
  );
}
