import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bell, Boxes, Headphones, Heart, Home, Menu, PackageCheck, Search, ShoppingCart, Sparkles, Tags, UserRound, X, Zap } from 'lucide-react';
import { LogoMark } from '../components/Brand';
import { ProductCard } from '../components/ProductCard';
import { CategorySkeleton, ProductGridSkeleton } from '../components/Skeleton';
import { EmptyState, ErrorState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { formatCurrency } from '../lib/labels';
import { sanitizeSearchQuery } from '../lib/sanitize';
import { isPushNotificationsConfigured, subscribeToPushNotifications } from '../lib/pushNotifications';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Category, Notification as AppNotification, Product } from '../types/database';

const categoryIcons = [Boxes, PackageCheck, Sparkles, Zap];
const allCategoryImage = '/assets/brand/all-category.png';
const homeHeroImage = '/assets/brand/home-hero.png';
const PRODUCT_FETCH_LIMIT = 24;
const VISIBLE_STEP = 12;

export function CustomerHome() {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_STEP);
  const { profile, signOut } = useAuth();
  const { addItem, total } = useCart();
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  useEffect(() => {
    setVisibleCount(VISIBLE_STEP);
  }, [categoryId, query]);

  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setNotifications((data || []) as AppNotification[]));
  }, [profile?.id]);

  const { data, loading, error } = useSupabaseQuery(async () => {
    const categoriesResult = await supabase.from('categories').select('*').order('sort_order');
    if (categoriesResult.error) throw categoriesResult.error;

    let productsQuery = supabase
      .from('products')
      .select('id,category_id,subcategory_id,name,description,price,cost_price,discount_type,discount_value,unit_type,image_1_url,image_2_url,stock_quantity,is_available,created_at,updated_at,categories(id,name)')
      .eq('is_available', true)
      .gt('stock_quantity', 0)
      .order('created_at', { ascending: false })
      .limit(PRODUCT_FETCH_LIMIT);

    if (categoryId !== 'all') {
      productsQuery = productsQuery.eq('category_id', categoryId);
    }

    const productsResult = await productsQuery;
    if (productsResult.error) throw productsResult.error;

    return {
      categories: (categoriesResult.data || []) as Category[],
      products: (productsResult.data || []) as unknown as Product[],
    };
  }, [categoryId]);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = sanitizeSearchQuery(query.trim());
    const source = data?.products ?? [];
    return source.filter((product) => (
      !normalizedQuery || product.name.includes(normalizedQuery) || product.description?.includes(normalizedQuery)
    ));
  }, [data?.products, query]);
  const productsToRender = useMemo(() => visibleProducts.slice(0, visibleCount), [visibleProducts, visibleCount]);
  const hasMore = visibleProducts.length > productsToRender.length;

  const { sentinelRef } = useInfiniteScroll(
    () => setVisibleCount((count) => count + VISIBLE_STEP),
    { enabled: hasMore }
  );

  const add = (product: Product) => {
    addItem(product);
    toast.success('تمت إضافة المنتج');
  };

  const closeDrawer = () => setDrawerOpen(false);

  const enableNotifications = async () => {
    try {
      await subscribeToPushNotifications();
      toast.success('تم تفعيل الإشعارات لهذا الجهاز');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'تعذر تفعيل الإشعارات';
      toast.error(message);
    }
  };

  const openNotifications = async () => {
    setNotificationsOpen((open) => !open);
    if (!profile?.id || unreadCount === 0) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
  };

  const drawerLinks = [
    { to: '/', label: 'الرئيسية', icon: Home },
    { to: '/', label: 'الأقسام', icon: Tags },
    { to: '/orders', label: 'طلباتي', icon: PackageCheck },
    { to: '/cart', label: 'طلبك', icon: ShoppingCart },
    { to: '/wishlist', label: 'المفضلة', icon: Heart },
    { to: '/profile', label: 'حسابي', icon: UserRound },
    { to: '/support', label: 'الدعم', icon: Headphones },
  ];

  const renderProductGrid = (items: Product[]) => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((product) => <ProductCard key={product.id} product={product} onAdd={add} />)}
    </div>
  );

  return (
    <div className="pb-28">
      <header
        className="relative min-h-[130px] overflow-hidden rounded-2xl bg-white bg-cover bg-center p-2.5 shadow-sm"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(255,255,255,.22), rgba(255,255,255,.82) 54%, rgba(255,255,255,.94)), url(${homeHeroImage})` }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-2 ring-white">
            <img src={homeHeroImage} alt="أزرق ماركت" className="h-full w-full object-cover" loading="eager" decoding="async" />
          </div>
          <div className="mr-auto flex items-center gap-1.5">
            <button type="button" onClick={() => setDrawerOpen(true)} className="grid h-8 w-8 place-items-center rounded-xl bg-[#eef6fa]/80 text-azraq-700" aria-label="افتح القائمة">
              <Menu size={16} />
            </button>
            <button type="button" onClick={openNotifications} className="relative grid h-8 w-8 place-items-center rounded-xl bg-[#eef6fa]/80 text-azraq-700" aria-label="الإشعارات">
              <Bell size={16} />
              {unreadCount > 0 && <span className="absolute -top-0.5 -left-0.5 h-3.5 min-w-3.5 rounded-full bg-rose-500 px-0.5 text-center text-[8px] font-bold text-white">{unreadCount}</span>}
            </button>
          </div>
          <Link to="/cart" className="rounded-xl bg-azraq-700 px-2.5 py-1.5 text-left text-white">
            <p className="text-2xs font-bold text-white/70">السلة</p>
            <p className="text-xs font-extrabold">{formatCurrency(total)}</p>
          </Link>
        </div>

        {notificationsOpen && (
          <div className="mt-3 rounded-2xl border border-slate-100 bg-[#f8fcff] p-2">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <p className="text-sm font-extrabold text-ink">الإشعارات</p>
              {isPushNotificationsConfigured() && (
                <button type="button" onClick={enableNotifications} className="rounded-xl bg-white px-3 py-1.5 text-xs font-extrabold text-azraq-700">
                  تفعيل الهاتف
                </button>
              )}
            </div>
            {notifications.length ? (
              <div className="grid gap-2">
                {notifications.map((notification) => (
                  <div key={notification.id} className="rounded-2xl bg-white p-3 shadow-sm">
                    <p className="text-sm font-extrabold text-ink">{notification.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-slate-500">{notification.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-white p-3 text-xs font-bold text-slate-500">لا توجد إشعارات حاليًا.</p>
            )}
          </div>
        )}

        <div className="relative z-10 mt-6 max-w-[70%] pr-1">
          <p className="text-sm font-extrabold text-ink">صباح الخير يا {profile?.full_name || 'تاجر'}</p>
          <p className="text-2xs font-bold text-slate-500">طلباتك أوامر</p>
        </div>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-slate-950/35" onClick={closeDrawer} aria-label="اقفل القائمة" />
          <aside className="absolute inset-y-0 right-0 w-[82vw] max-w-sm rounded-l-[28px] bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <LogoMark compact />
                <p className="mt-4 text-xs font-bold text-slate-500">أهلا</p>
                <h2 className="font-display text-xl font-extrabold text-ink">{profile?.full_name || profile?.phone || 'عميل أزرق'}</h2>
                {profile?.phone && <p className="mt-1 text-xs font-bold text-slate-500" dir="ltr">{profile.phone}</p>}
              </div>
              <button type="button" onClick={closeDrawer} className="grid h-9 w-9 place-items-center rounded-2xl bg-[#eef6fa] text-slate-600">
                <X size={18} />
              </button>
            </div>

            <nav className="mt-5 grid gap-2">
              {drawerLinks.map((item) => (
                <Link key={`${item.to}-${item.label}`} to={item.to} onClick={closeDrawer} className="flex items-center gap-3 rounded-2xl bg-[#eef6fa] px-4 py-3 text-sm font-extrabold text-slate-700">
                  <item.icon size={18} className="text-azraq-700" />
                  {item.label}
                </Link>
              ))}
              <button type="button" onClick={() => { closeDrawer(); signOut(); }} className="mt-2 flex items-center justify-center rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-extrabold text-slate-600">
                اخرج من الحساب
              </button>
            </nav>
          </aside>
        </div>
      )}

      <section className="sticky top-1 z-20 mt-2 rounded-2xl border border-white/80 bg-white/95 p-1.5 shadow-sm backdrop-blur" role="search" aria-label="بحث المنتجات">
        <div className="relative">
          <Search className="absolute right-2.5 top-2.5 text-slate-400" size={15} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="دور على منتج..."
            aria-label="ابحث عن منتج"
            className="h-9 w-full rounded-xl border border-slate-100 bg-[#f4f9fc] pr-8 pl-3 text-xs font-medium outline-none transition focus:border-azraq-300 focus:bg-white"
          />
        </div>
      </section>

      {/* Categories — circular scrollable chips */}
      <section className="mt-3 flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-hide">
        <button onClick={() => setCategoryId('all')} className="flex shrink-0 flex-col items-center gap-1.5">
          <div className={`grid h-16 w-16 place-items-center overflow-hidden rounded-full border-[2.5px] shadow-sm transition ${categoryId === 'all' ? 'border-azraq-600 scale-105' : 'border-slate-200'}`}>
            <img src={allCategoryImage} alt="الكل" className="h-full w-full object-cover" loading="lazy" decoding="async" />
          </div>
          <span className={`text-2xs font-bold ${categoryId === 'all' ? 'text-azraq-700' : 'text-slate-600'}`}>الكل</span>
        </button>
        {data?.categories.map((category, index) => {
          const Icon = categoryIcons[index % categoryIcons.length];
          const active = categoryId === category.id;
          return (
            <button key={category.id} onClick={() => setCategoryId(category.id)} className="flex shrink-0 flex-col items-center gap-1.5">
              <div className={`grid h-16 w-16 place-items-center overflow-hidden rounded-full border-[2.5px] shadow-sm transition ${active ? 'border-azraq-600 scale-105' : 'border-slate-200'}`}>
                {category.image_url ? (
                  <img src={category.image_url} alt={category.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className={`grid h-full w-full place-items-center ${active ? 'bg-azraq-700 text-white' : 'bg-azraq-50 text-azraq-600'}`}>
                    <Icon size={22} />
                  </div>
                )}
              </div>
              <span className={`max-w-[64px] truncate text-2xs font-bold ${active ? 'text-azraq-700' : 'text-slate-600'}`}>{category.name}</span>
            </button>
          );
        })}
      </section>

      {error && <div className="mt-3"><ErrorState message={error} /></div>}
      {loading && <div className="mt-4"><CategorySkeleton /><div className="mt-4"><ProductGridSkeleton /></div></div>}

      {!loading && !error && (
        <div className="mt-4 space-y-5">
          {/* Row 1: العروض */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-base font-extrabold text-ink">🔥 العروض</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {(() => {
                const discounted = visibleProducts.filter((p) => p.discount_type && p.discount_type !== 'none' && (p.discount_value ?? 0) > 0);
                const items = discounted.length >= 3 ? discounted : visibleProducts.slice(0, 10);
                return items.slice(0, 10).map((product) => (
                  <div key={product.id} className="w-[calc(33.333%-6px)] min-w-[120px] shrink-0">
                    <ProductCard product={product} onAdd={add} />
                  </div>
                ));
              })()}
            </div>
          </section>

          {/* Row 2: الأكثر مبيعًا */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-base font-extrabold text-ink">⭐ الأكثر مبيعًا</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {visibleProducts.slice(0, 10).map((product) => (
                <div key={product.id} className="w-[calc(33.333%-6px)] min-w-[120px] shrink-0">
                  <ProductCard product={product} onAdd={add} />
                </div>
              ))}
            </div>
          </section>

          {/* Row 3: الأقل سعرًا */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-base font-extrabold text-ink">💰 الأقل سعرًا</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {[...visibleProducts].sort((a, b) => a.price - b.price).slice(0, 10).map((product) => (
                <div key={product.id} className="w-[calc(33.333%-6px)] min-w-[120px] shrink-0">
                  <ProductCard product={product} onAdd={add} />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
