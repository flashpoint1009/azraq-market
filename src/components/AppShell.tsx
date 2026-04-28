import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell, Boxes, ClipboardList, Flame, Headphones, Home, LayoutDashboard, LogOut, MapPinHouse, MapPinned, Package, ReceiptText, ShoppingCart, Tags, UserRound, Users } from 'lucide-react';
import { LogoMark } from './Brand';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { roleLabels } from '../lib/labels';

const customerNav = [
  { to: '/', label: 'الرئيسية', icon: Home },
  { to: '/deals', label: 'العروض', icon: Flame },
  { to: '/orders', label: 'طلباتي', icon: ClipboardList },
  { to: '/cart', label: 'طلبك', icon: ShoppingCart },
  { to: '/profile', label: 'حسابي', icon: UserRound },
];

const adminNav = [
  { to: '/admin', label: 'اللوحة', icon: LayoutDashboard },
  { to: '/admin/products', label: 'المنتجات', icon: Package },
  { to: '/admin/purchases', label: 'المشتريات', icon: ReceiptText },
  { to: '/admin/categories', label: 'الأقسام', icon: Tags },
  { to: '/admin/orders', label: 'الطلبات', icon: ClipboardList },
  { to: '/admin/customers', label: 'العملاء', icon: Users },
];

const warehouseNav = [
  { to: '/warehouse', label: 'المخزن', icon: Boxes },
  { to: '/warehouse/orders', label: 'الطلبات', icon: ClipboardList },
  { to: '/warehouse/products', label: 'الأصناف', icon: Package },
  { to: '/warehouse/categories', label: 'الأقسام', icon: Tags },
];

const deliveryNav = [
  { to: '/delivery', label: 'الحركة', icon: MapPinned },
  { to: '/delivery/orders', label: 'التوصيل', icon: ClipboardList },
];

export function AppShell({ mode }: { mode: 'customer' | 'admin' | 'warehouse' | 'delivery' }) {
  const { profile, signOut } = useAuth();
  const { count } = useCart();
  const { unreadCount } = useRealtimeNotifications(profile?.id);
  const location = useLocation();
  const nav = mode === 'admin' ? adminNav : mode === 'warehouse' ? warehouseNav : mode === 'delivery' ? deliveryNav : customerNav;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#d7efff_0,transparent_28%),linear-gradient(180deg,#f7fbff,#eef6ff)] text-ink">
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-72 border-l border-white/80 bg-white/80 p-5 shadow-soft backdrop-blur-xl lg:block">
        <LogoMark />
        <div className="mt-8 rounded-[1.5rem] bg-gradient-to-br from-azraq-700 to-azraq-950 p-4 text-white shadow-soft">
          <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
            <UserRound size={25} />
          </div>
          <p className="text-xs font-bold text-azraq-500">{profile?.role ? roleLabels[profile.role] : 'مستخدم'}</p>
          <p className="mt-1 font-display text-lg font-extrabold">{profile?.full_name || profile?.phone || 'أزرق ماركت'}</p>
          {profile?.phone && <p className="mt-1 text-xs text-white/70" dir="ltr">{profile.phone}</p>}
          {profile?.address && <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/70">{profile.address}</p>}
        </div>
        <nav className="mt-6 space-y-2">
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
            {[
              ['العناوين', MapPinHouse],
              ['الدعم', Headphones],
            ].map(([label, Icon]) => (
              <NavLink key={label as string} to="/profile" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-azraq-50 hover:text-azraq-800">
                <Icon size={18} />
                {label as string}
              </NavLink>
            ))}
          </div>
        )}
        <button onClick={signOut} className="absolute bottom-5 right-5 left-5 flex items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold text-slate-600">
          <LogOut size={17} />
          اخرج من الحساب
        </button>
      </aside>

      <main className="mx-auto max-w-7xl px-3 pb-20 pt-3 lg:mr-72 lg:px-6 lg:pb-8">
        <header className="mb-3 flex items-center justify-between rounded-2xl border border-white/80 bg-white/70 p-2 shadow-sm backdrop-blur lg:hidden">
          <LogoMark compact />
          <div className="flex items-center gap-2">
            <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-azraq-50 text-azraq-700">
              <Bell size={17} />
              {unreadCount > 0 && <span className="absolute -top-1 -left-1 h-4 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold text-white">{unreadCount}</span>}
            </div>
            <button onClick={signOut} className="grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-500">
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <Outlet />
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl border border-white/80 bg-white/95 p-1.5 shadow-soft backdrop-blur lg:hidden">
        {nav.slice(0, 4).map((item) => {
          const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <NavLink key={item.to} to={item.to} end className={`relative flex flex-col items-center gap-0.5 rounded-xl px-1.5 py-1.5 text-[10px] font-extrabold ${active ? 'bg-azraq-700 text-white' : 'text-slate-500'}`}>
              <item.icon size={16} />
              {item.label}
              {item.to === '/cart' && count > 0 && <span className="absolute -top-1 left-2 rounded-full bg-rose-500 px-1.5 text-[10px] text-white">{count}</span>}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
