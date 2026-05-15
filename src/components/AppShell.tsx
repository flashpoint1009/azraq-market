import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Bell, Boxes, ClipboardList, Code2, CreditCard, Heart, Headphones, Home, LayoutDashboard, LineChart, LogOut, MapPinned, Package, Percent, ReceiptText, ShieldCheck, ShoppingCart, Star, Tags, Ticket, UserRound, Users } from 'lucide-react';
import { AppAnnouncement } from './AppAnnouncement';
import { LogoMark } from './Brand';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { usePushSetup } from '../hooks/usePushSetup';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { roleLabels } from '../lib/labels';
import { hasPermission } from '../lib/permissions';

const customerNav = [
  { to: '/', label: 'الرئيسية', icon: Home },
  { to: '/orders', label: 'طلباتي', icon: ClipboardList },
  { to: '/cart', label: 'طلبك', icon: ShoppingCart },
  { to: '/wishlist', label: 'المفضلة', icon: Heart },
  { to: '/profile', label: 'حسابي', icon: UserRound },
];

const adminNav = [
  { to: '/admin', label: 'اللوحة', icon: LayoutDashboard },
  { to: '/admin/reports', label: 'التقارير', icon: BarChart3 },
  { to: '/admin/analytics', label: 'التحليلات', icon: LineChart },
  { to: '/admin/products', label: 'المنتجات', icon: Package },
  { to: '/admin/purchases', label: 'المشتريات', icon: ReceiptText },
  { to: '/admin/categories', label: 'الأقسام', icon: Tags },
  { to: '/admin/offers', label: 'العروض', icon: Percent },
  { to: '/admin/coupons', label: 'الكوبونات', icon: Ticket },
  { to: '/admin/reviews', label: 'التقييمات', icon: Star },
  { to: '/admin/orders', label: 'الطلبات', icon: ClipboardList },
  { to: '/admin/tracking', label: 'تتبع المندوبين', icon: MapPinned },
  { to: '/admin/debts', label: 'المديونيات', icon: CreditCard },
  { to: '/admin/users', label: 'المستخدمين', icon: ShieldCheck },
  { to: '/admin/customers', label: 'العملاء', icon: Users },
  { to: '/admin/developer', label: 'المطور', icon: Code2 },
];

const warehouseNav = [
  { to: '/warehouse', label: 'المخزن', icon: Boxes },
  { to: '/warehouse/orders', label: 'الطلبات', icon: ClipboardList },
  { to: '/warehouse/products', label: 'الأصناف', icon: Package },
  { to: '/warehouse/categories', label: 'الأقسام', icon: Tags },
  { to: '/warehouse/advanced', label: 'متقدم', icon: BarChart3 },
];

const deliveryNav = [
  { to: '/delivery', label: 'الحركة', icon: MapPinned },
  { to: '/delivery/orders', label: 'التوصيل', icon: ClipboardList },
];

const customerSecondaryNav = [
  { to: '/support', label: 'الدعم', icon: Headphones },
];

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function AppShell({ mode }: { mode: 'customer' | 'admin' | 'warehouse' | 'delivery' }) {
  const { profile, signOut } = useAuth();
  const { count, total } = useCart();
  const { unreadCount } = useRealtimeNotifications(profile?.id);
  usePushSetup(profile?.id);
  const location = useLocation();
  const nav = (mode === 'admin' ? adminNav : mode === 'warehouse' ? warehouseNav : mode === 'delivery' ? deliveryNav : customerNav).filter((item) => {
    if (mode !== 'admin') return true;
    if (item.to === '/admin') return hasPermission(profile, 'reports');
    if (item.to === '/admin/reports') return hasPermission(profile, 'reports');
    if (item.to === '/admin/analytics') return hasPermission(profile, 'reports');
    if (item.to === '/admin/products') return hasPermission(profile, 'products');
    if (item.to === '/admin/purchases') return hasPermission(profile, 'purchases');
    if (item.to === '/admin/categories') return hasPermission(profile, 'categories');
    if (item.to === '/admin/offers') return hasPermission(profile, 'offers');
    if (item.to === '/admin/coupons') return hasPermission(profile, 'offers');
    if (item.to === '/admin/reviews') return hasPermission(profile, 'products');
    if (item.to === '/admin/orders') return hasPermission(profile, 'orders');
    if (item.to === '/admin/tracking') return hasPermission(profile, 'orders');
    if (item.to === '/admin/debts') return hasPermission(profile, 'orders');
    if (item.to === '/admin/customers') return profile?.role === 'admin' || hasPermission(profile, 'customers');
    if (item.to === '/admin/users') return profile?.role === 'admin' || hasPermission(profile, 'users');
    if (item.to === '/admin/developer') return hasPermission(profile, 'developer');
    return true;
  });
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <div className="min-h-screen bg-pearl text-ink">
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-72 border-l border-white/80 bg-white/80 p-5 shadow-soft backdrop-blur-xl lg:block" role="navigation" aria-label="القائمة الجانبية">
        <LogoMark />
        <div className="mt-8 rounded-[1.5rem] bg-gradient-to-br from-azraq-700 to-azraq-950 p-4 text-white shadow-soft">
          <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
            <UserRound size={25} />
          </div>
          <p className="text-xs font-bold text-azraq-300">{profile?.role ? roleLabels[profile.role] : 'مستخدم'}</p>
          <p className="mt-1 font-display text-lg font-extrabold">{profile?.full_name || profile?.phone || 'أزرق ماركت'}</p>
          {profile?.phone && <p className="mt-1 text-xs text-white/70" dir="ltr">{profile.phone}</p>}
          {profile?.address && <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/70">{profile.address}</p>}
        </div>
        <nav className="mt-6 max-h-[calc(100vh-310px)] space-y-2 overflow-y-auto pr-1">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${isActive ? 'bg-azraq-700 text-white shadow-soft' : 'text-slate-600 hover:bg-azraq-50 hover:text-azraq-800'}`}>
              <item.icon size={18} />
              {item.label}
              {item.to === '/cart' && count > 0 && <span className="mr-auto rounded-full bg-white/20 px-2 text-xs">{count}</span>}
            </NavLink>
          ))}
        </nav>
        {mode === 'customer' && (
          <div className="mt-5 grid gap-2">
            {customerSecondaryNav.map((item) => (
              <NavLink key={item.to} to={item.to} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-azraq-50 hover:text-azraq-800">
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
        {installPrompt && mode !== 'customer' && (
          <button onClick={installApp} className="mt-4 flex w-full items-center justify-center rounded-2xl bg-orange-50 px-4 py-3 text-sm font-extrabold text-orange-600">
            ثبت التطبيق
          </button>
        )}
        <button onClick={signOut} className="absolute bottom-5 right-5 left-5 flex items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold text-slate-600">
          <LogOut size={17} />
          اخرج من الحساب
        </button>
      </aside>

      <main className="mx-auto max-w-7xl px-2 pb-20 pt-2 sm:px-3 sm:pt-3 lg:mr-72 lg:px-6 lg:pb-8" role="main" aria-label="المحتوى الرئيسي">
        {mode === 'customer' && <AppAnnouncement />}
        {mode !== 'customer' && <header className="mb-3 flex items-center justify-between rounded-2xl border border-white/80 bg-white/70 p-2 shadow-sm backdrop-blur lg:hidden">
          <LogoMark compact />
          <div className="flex items-center gap-2">
            <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-azraq-50 text-azraq-700">
              <Bell size={17} />
              {unreadCount > 0 && <span className="absolute -top-1 -left-1 h-4 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold text-white">{unreadCount}</span>}
            </div>
            <button onClick={signOut} className="grid h-11 w-11 place-items-center rounded-xl bg-white text-slate-500">
              <LogOut size={16} />
            </button>
            {installPrompt && (
              <button onClick={installApp} className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-600">
                ثبت
              </button>
            )}
          </div>
        </header>}
        <Outlet />
      </main>

      {mode === 'customer' && location.pathname !== '/cart' && (
        <Link to="/cart" className="fixed inset-x-3 bottom-[72px] z-40 flex items-center justify-between rounded-2xl border border-white bg-white/95 px-3 py-2 shadow-soft backdrop-blur lg:hidden">
          <div>
            <p className="text-xs font-extrabold text-slate-500">{count ? `${count} أصناف • ${total.toLocaleString('ar-EG')} ج.م` : 'الحق العروض واطلب دلوقتي'}</p>
            <p className="text-xs font-bold text-slate-500">{count ? 'راجع الطلب قبل الإرسال' : 'الحق العروض واطلب دلوقتي'}</p>
          </div>
          <span className="rounded-xl bg-azraq-700 px-3 py-2 text-xs font-extrabold text-white">كمل طلبك</span>
        </Link>
      )}

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl border border-white/80 bg-white/95 p-1 shadow-soft backdrop-blur lg:hidden" role="navigation" aria-label="التنقل الرئيسي">
        {(mode === 'admin' ? nav.filter((item) => ['/admin', '/admin/reports', '/admin/orders', '/admin/users'].includes(item.to)) : nav.slice(0, 4)).map((item) => {
          const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <NavLink key={item.to} to={item.to} end className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl min-h-[44px] px-1.5 py-2 text-2xs font-extrabold ${active ? 'bg-azraq-700 text-white' : 'text-slate-500'}`}>
              <item.icon size={18} />
              {item.label}
              {item.to === '/cart' && count > 0 && <span className="absolute -top-1 left-2 rounded-full bg-rose-500 px-1.5 text-2xs text-white">{count}</span>}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
