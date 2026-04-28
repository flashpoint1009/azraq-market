import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bell, Boxes, ChevronLeft, Flame, Headphones, Home, Menu, MoreHorizontal, PackageCheck, Search, ShoppingCart, Sparkles, Tags, UserRound, X, Zap } from 'lucide-react';
import { LogoMark } from '../components/Brand';
import { ProductCard } from '../components/ProductCard';
import { EmptyState, ErrorState, LoadingState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Category, Product } from '../types/database';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const categoryIcons = [Boxes, PackageCheck, Sparkles, Zap];

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="h-56 animate-pulse rounded-[20px] bg-white shadow-sm" />
      ))}
    </div>
  );
}

export function CustomerHome() {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const { profile, signOut } = useAuth();
  const { addItem, total } = useCart();

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

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
  const dealProducts = useMemo(() => products.filter((_, index) => index % 3 === 0).slice(0, 8), [products]);
  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim();
    return products.filter((product) => {
      const matchesQuery = !normalizedQuery || product.name.includes(normalizedQuery) || product.description?.includes(normalizedQuery);
      const matchesCategory = categoryId === 'all' || categoryId === 'deals' || product.category_id === categoryId;
      const matchesDeal = categoryId !== 'deals' || dealProducts.some((item) => item.id === product.id);
      return matchesQuery && matchesCategory && matchesDeal;
    });
  }, [products, query, categoryId, dealProducts]);

  const topProducts = useMemo(() => visibleProducts.slice(0, 12), [visibleProducts]);
  const restProducts = useMemo(() => visibleProducts.slice(12), [visibleProducts]);

  const add = (product: Product) => {
    addItem(product);
    toast.success('المنتج اتضاف');
  };

  const closeDrawer = () => setDrawerOpen(false);

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    closeDrawer();
  };

  const drawerLinks = [
    { to: '/', label: 'الرئيسية', icon: Home },
    { to: '/', label: 'الأقسام', icon: Tags },
    { to: '/deals', label: 'العروض', icon: Flame },
    { to: '/orders', label: 'طلباتي', icon: PackageCheck },
    { to: '/cart', label: 'طلبك', icon: ShoppingCart },
    { to: '/profile', label: 'حسابي', icon: UserRound },
    { to: '/profile', label: 'الدعم', icon: Headphones },
  ];

  const renderProductGrid = (items: Product[]) => (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
      {items.map((product) => <ProductCard key={product.id} product={product} onAdd={add} />)}
    </div>
  );

  return (
    <div className="pb-28">
      <header className="rounded-[20px] bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <LogoMark compact />
          <div className="mr-auto flex items-center gap-2">
            <button type="button" onClick={() => setDrawerOpen(true)} className="grid h-9 w-9 place-items-center rounded-2xl bg-[#F4FAFF] text-azraq-700" aria-label="افتح القائمة">
              <Menu size={18} />
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-2xl bg-[#F4FAFF] text-azraq-700" aria-label="الإشعارات"><Bell size={18} /></button>
          </div>
          <div className="rounded-2xl bg-azraq-700 px-3 py-2 text-left text-white">
            <p className="text-[10px] font-bold text-white/70">السلة</p>
            <p className="text-sm font-extrabold">{formatCurrency(total)}</p>
          </div>
        </div>
        <div className="mt-3">
          <p className="text-base font-extrabold text-ink">صباح الخير يا {profile?.full_name || 'تاجر'} 👋</p>
          <p className="text-xs font-bold text-slate-400">طلباتك أوامر</p>
        </div>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-slate-950/35" onClick={closeDrawer} aria-label="اقفل القائمة" />
          <aside className="absolute inset-y-0 right-0 w-[82vw] max-w-sm rounded-l-[28px] bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <LogoMark compact />
                <p className="mt-4 text-xs font-bold text-slate-400">أهلًا</p>
                <h2 className="font-display text-xl font-extrabold text-ink">{profile?.full_name || profile?.phone || 'عميل أزرق'}</h2>
                {profile?.phone && <p className="mt-1 text-xs font-bold text-slate-400" dir="ltr">{profile.phone}</p>}
              </div>
              <button type="button" onClick={closeDrawer} className="grid h-9 w-9 place-items-center rounded-2xl bg-[#F4FAFF] text-slate-600">
                <X size={18} />
              </button>
            </div>

            <nav className="mt-5 grid gap-2">
              {drawerLinks.map((item) => (
                <Link key={`${item.to}-${item.label}`} to={item.to} onClick={closeDrawer} className="flex items-center gap-3 rounded-2xl bg-[#F4FAFF] px-4 py-3 text-sm font-extrabold text-slate-700">
                  <item.icon size={18} className="text-azraq-700" />
                  {item.label}
                </Link>
              ))}
              {installPrompt && (
                <button type="button" onClick={installApp} className="flex items-center gap-3 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-extrabold text-orange-600">
                  <Zap size={18} />
                  ثبّت التطبيق
                </button>
              )}
              <button type="button" onClick={() => { closeDrawer(); signOut(); }} className="mt-2 flex items-center justify-center rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-extrabold text-slate-600">
                اخرج من الحساب
              </button>
            </nav>
          </aside>
        </div>
      )}

      <section className="sticky top-2 z-20 mt-3 rounded-[20px] border border-white bg-white/95 p-2 shadow-sm backdrop-blur">
        <div className="relative">
          <Search className="absolute right-3 top-3 text-slate-400" size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="دوّر على منتج..."
            className="h-11 w-full rounded-2xl border border-slate-100 bg-[#F4FAFF] pr-10 pl-3 text-sm font-semibold outline-none transition focus:border-azraq-300 focus:bg-white"
          />
        </div>
      </section>

      <section className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setCategoryId('deals')} className={`grid h-20 min-w-20 place-items-center rounded-[20px] bg-white px-2 text-xs font-extrabold shadow-sm ${categoryId === 'deals' ? 'bg-azraq-700 text-white' : 'text-slate-600'}`}>
          <span className={`grid h-10 w-10 place-items-center rounded-full ${categoryId === 'deals' ? 'bg-white/20' : 'bg-orange-50 text-orange-500'}`}><Flame size={18} /></span>
          العروض
        </button>
        {data?.categories.slice(0, 8).map((category, index) => {
          const Icon = categoryIcons[index % categoryIcons.length];
          return (
            <button key={category.id} onClick={() => setCategoryId(category.id)} className={`grid h-20 min-w-20 place-items-center rounded-[20px] bg-white px-2 text-xs font-extrabold shadow-sm ${categoryId === category.id ? 'bg-azraq-700 text-white' : 'text-slate-600'}`}>
              <span className={`grid h-10 w-10 place-items-center rounded-full ${categoryId === category.id ? 'bg-white/20' : 'bg-[#F4FAFF] text-azraq-700'}`}>
                <Icon size={18} />
              </span>
              <span className="line-clamp-1">{category.name}</span>
            </button>
          );
        })}
        <button onClick={() => setCategoryId('all')} className={`grid h-20 min-w-20 place-items-center rounded-[20px] bg-white px-2 text-xs font-extrabold shadow-sm ${categoryId === 'all' ? 'bg-azraq-700 text-white' : 'text-slate-600'}`}>
          <span className={`grid h-10 w-10 place-items-center rounded-full ${categoryId === 'all' ? 'bg-white/20' : 'bg-[#F4FAFF] text-azraq-700'}`}><MoreHorizontal size={18} /></span>
          المزيد
        </button>
      </section>

      {error && <div className="mt-3"><ErrorState message={error} /></div>}
      {loading && <div className="mt-4"><LoadingState label="بنحمّل المنتجات..." /><SkeletonGrid /></div>}

      {!loading && !error && (
        <>
          <section className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold text-ink">أفضل العروض</h2>
              <button onClick={() => setCategoryId('deals')} className="inline-flex items-center gap-1 text-xs font-extrabold text-azraq-700">
                شوف الكل <ChevronLeft size={14} />
              </button>
            </div>
            {renderProductGrid(dealProducts.slice(0, 4))}
          </section>

          <section className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold text-ink">المنتجات الأكثر طلبًا</h2>
              <span className="text-xs font-bold text-slate-400">{topProducts.length} منتج</span>
            </div>
            {topProducts.length ? renderProductGrid(topProducts) : <EmptyState title="مفيش منتجات دلوقتي" body="جرّب تدور بكلمة تانية أو اختار قسم مختلف." />}
          </section>

          <section className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold text-ink">باقي المنتجات</h2>
              <span className="text-xs font-bold text-slate-400">{restProducts.length || visibleProducts.length} منتج</span>
            </div>
            {renderProductGrid(restProducts.length ? restProducts : visibleProducts)}
          </section>
        </>
      )}
    </div>
  );
}
