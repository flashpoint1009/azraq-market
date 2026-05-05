import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bell, Boxes, Headphones, Home, Menu, PackageCheck, Search, ShoppingCart, Sparkles, Tags, UserRound, X, Zap } from 'lucide-react';
import { LogoMark } from '../components/Brand';
import { ProductCard } from '../components/ProductCard';
import { EmptyState, ErrorState, LoadingState, SecondaryButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/labels';
import { isPushNotificationsConfigured, subscribeToPushNotifications } from '../lib/pushNotifications';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Category, Notification as AppNotification, Product } from '../types/database';

const categoryIcons = [Boxes, PackageCheck, Sparkles, Zap];
const PRODUCT_FETCH_LIMIT = 24;
const VISIBLE_STEP = 12;

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-56 animate-pulse rounded-[20px] bg-white shadow-sm" />
      ))}
    </div>
  );
}

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
    const normalizedQuery = query.trim();
    const source = data?.products ?? [];
    return source.filter((product) => (
      !normalizedQuery || product.name.includes(normalizedQuery) || product.description?.includes(normalizedQuery)
    ));
  }, [data?.products, query]);
  const productsToRender = useMemo(() => visibleProducts.slice(0, visibleCount), [visibleProducts, visibleCount]);
  const hasMore = visibleProducts.length > productsToRender.length;

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
    { to: '/profile', label: 'حسابي', icon: UserRound },
    { to: '/support', label: 'الدعم', icon: Headphones },
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
            <button type="button" onClick={() => setDrawerOpen(true)} className="grid h-9 w-9 place-items-center rounded-2xl bg-[#eef6fa] text-azraq-700" aria-label="افتح القائمة">
              <Menu size={18} />
            </button>
            <button type="button" onClick={openNotifications} className="relative grid h-9 w-9 place-items-center rounded-2xl bg-[#eef6fa] text-azraq-700" aria-label="الإشعارات">
              <Bell size={18} />
              {unreadCount > 0 && <span className="absolute -top-1 -left-1 h-4 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold text-white">{unreadCount}</span>}
            </button>
          </div>
          <Link to="/cart" className="rounded-2xl bg-azraq-700 px-3 py-2 text-left text-white">
            <p className="text-[10px] font-bold text-white/70">السلة</p>
            <p className="text-sm font-extrabold">{formatCurrency(total)}</p>
          </Link>
        </div>

        {notificationsOpen && (
          <div className="mt-3 rounded-2xl border border-slate-100 bg-[#f8fcff] p-2">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <p className="text-sm font-extrabold text-ink">الإشعارات</p>
              {isPushNotificationsConfigured() && (
                <button type="button" onClick={enableNotifications} className="rounded-xl bg-white px-3 py-1.5 text-[11px] font-extrabold text-azraq-700">
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
              <p className="rounded-2xl bg-white p-3 text-xs font-bold text-slate-400">لا توجد إشعارات حاليًا.</p>
            )}
          </div>
        )}

        <div className="mt-3">
          <p className="text-base font-extrabold text-ink">صباح الخير يا {profile?.full_name || 'تاجر'}</p>
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
                <p className="mt-4 text-xs font-bold text-slate-400">أهلا</p>
                <h2 className="font-display text-xl font-extrabold text-ink">{profile?.full_name || profile?.phone || 'عميل أزرق'}</h2>
                {profile?.phone && <p className="mt-1 text-xs font-bold text-slate-400" dir="ltr">{profile.phone}</p>}
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

      <section className="sticky top-2 z-20 mt-3 rounded-[20px] border border-white bg-white/95 p-2 shadow-sm backdrop-blur">
        <div className="relative">
          <Search className="absolute right-3 top-3 text-slate-400" size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="دور على منتج..."
            className="h-11 w-full rounded-2xl border border-slate-100 bg-[#eef6fa] pr-10 pl-3 text-sm font-semibold outline-none transition focus:border-azraq-300 focus:bg-white"
          />
        </div>
      </section>

      <section className="mt-3 grid grid-cols-3 gap-1.5">
        <button onClick={() => setCategoryId('all')} className={`grid h-[72px] place-items-center rounded-2xl bg-white px-1.5 text-[11px] font-extrabold shadow-sm ${categoryId === 'all' ? 'bg-azraq-700 text-white' : 'text-slate-600'}`}>
          <span className={`grid h-8 w-8 place-items-center rounded-full ${categoryId === 'all' ? 'bg-white/20' : 'bg-[#eef6fa] text-azraq-700'}`}><Boxes size={15} /></span>
          الكل
        </button>
        {data?.categories.slice(0, 8).map((category, index) => {
          const Icon = categoryIcons[index % categoryIcons.length];
          return (
            <button key={category.id} onClick={() => setCategoryId(category.id)} className={`grid h-[72px] place-items-center rounded-2xl bg-white px-1.5 text-[11px] font-extrabold shadow-sm ${categoryId === category.id ? 'bg-azraq-700 text-white' : 'text-slate-600'}`}>
              <span className={`grid h-8 w-8 place-items-center rounded-full ${categoryId === category.id ? 'bg-white/20' : 'bg-[#eef6fa] text-azraq-700'}`}>
                <Icon size={15} />
              </span>
              <span className="line-clamp-1">{category.name}</span>
            </button>
          );
        })}
      </section>

      {error && <div className="mt-3"><ErrorState message={error} /></div>}
      {loading && <div className="mt-4"><LoadingState label="بنحمل المنتجات..." /><SkeletonGrid /></div>}

      {!loading && !error && (
        <section className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold text-ink">{categoryId === 'all' ? 'المنتجات' : 'منتجات القسم'}</h2>
            <span className="text-xs font-bold text-slate-400">{visibleProducts.length} منتج</span>
          </div>
          {productsToRender.length ? renderProductGrid(productsToRender) : <EmptyState title="مفيش منتجات دلوقتي" body="جرب تدور بكلمة تانية أو اختار قسم مختلف." />}
          {hasMore && (
            <div className="mt-4">
              <SecondaryButton type="button" className="w-full" onClick={() => setVisibleCount((count) => count + VISIBLE_STEP)}>
                عرض المزيد
              </SecondaryButton>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
