import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { useAuth } from './context/AuthContext';

const AdminAnalyticsPage = lazy(() => import('./pages/AdminAnalyticsPage').then((module) => ({ default: module.AdminAnalyticsPage })));
const AdminCouponsPage = lazy(() => import('./pages/AdminCouponsPage').then((module) => ({ default: module.AdminCouponsPage })));
const AdminCustomersPage = lazy(() => import('./pages/AdminCustomersPage').then((module) => ({ default: module.AdminCustomersPage })));
const AdminCategoriesPage = lazy(() => import('./pages/AdminCategoriesPage').then((module) => ({ default: module.AdminCategoriesPage })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));
const AdminLiveTrackingPage = lazy(() => import('./pages/AdminLiveTrackingPage').then((module) => ({ default: module.AdminLiveTrackingPage })));
const AdminDeveloperPage = lazy(() => import('./pages/AdminDeveloperPage').then((module) => ({ default: module.AdminDeveloperPage })));
const DeveloperSaasPage = lazy(() => import('./pages/DeveloperSaasPage').then((module) => ({ default: module.DeveloperSaasPage })));
const AdminProductsPage = lazy(() => import('./pages/AdminProductsPage').then((module) => ({ default: module.AdminProductsPage })));
const AdminPurchasesPage = lazy(() => import('./pages/AdminPurchasesPage').then((module) => ({ default: module.AdminPurchasesPage })));
const AdminOffersPage = lazy(() => import('./pages/AdminOffersPage').then((module) => ({ default: module.AdminOffersPage })));
const AdminReportsPage = lazy(() => import('./pages/AdminReportsPage').then((module) => ({ default: module.AdminReportsPage })));
const AdminReviewsPage = lazy(() => import('./pages/AdminReviewsPage').then((module) => ({ default: module.AdminReviewsPage })));
const AdminDebtsPage = lazy(() => import('./pages/AdminDebtsPage').then((module) => ({ default: module.AdminDebtsPage })));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })));
const CartPage = lazy(() => import('./pages/CartPage').then((module) => ({ default: module.CartPage })));
const CustomerHome = lazy(() => import('./pages/CustomerHome').then((module) => ({ default: module.CustomerHome })));
const DeliveryPage = lazy(() => import('./pages/DeliveryPage').then((module) => ({ default: module.DeliveryPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const OrderDetailsPage = lazy(() => import('./pages/OrderDetailsPage').then((module) => ({ default: module.OrderDetailsPage })));
const OrdersManagementPage = lazy(() => import('./pages/OrdersManagementPage').then((module) => ({ default: module.OrdersManagementPage })));
const OrdersPage = lazy(() => import('./pages/OrdersPage').then((module) => ({ default: module.OrdersPage })));
const ProductDetails = lazy(() => import('./pages/ProductDetails').then((module) => ({ default: module.ProductDetails })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const SupportPage = lazy(() => import('./pages/SupportPage').then((module) => ({ default: module.SupportPage })));
const WarehouseAdvancedPage = lazy(() => import('./pages/WarehouseAdvancedPage').then((module) => ({ default: module.WarehouseAdvancedPage })));
const WarehousePage = lazy(() => import('./pages/WarehousePage').then((module) => ({ default: module.WarehousePage })));
const WishlistPage = lazy(() => import('./pages/WishlistPage').then((module) => ({ default: module.WishlistPage })));

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6 text-center text-sm font-bold text-slate-500">
      جاري التحميل...
    </div>
  );
}

function RoleAwareShell() {
  const { role } = useAuth();
  return <AppShell mode={role === 'delivery' ? 'delivery' : role === 'warehouse' ? 'warehouse' : role === 'customer' ? 'customer' : 'admin'} />;
}

export function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute roles={['customer']} />}>
          <Route element={<AppShell mode="customer" />}>
            <Route index element={<CustomerHome />} />
            <Route path="deals" element={<Navigate to="/" replace />} />
            <Route path="products/:id" element={<ProductDetails />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="support" element={<SupportPage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route element={<AppShell mode="admin" />}>
            <Route path="admin" element={<ProtectedRoute permissions={['reports']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="admin/reports" element={<ProtectedRoute permissions={['reports']}><AdminReportsPage /></ProtectedRoute>} />
            <Route path="admin/analytics" element={<ProtectedRoute permissions={['reports']}><AdminAnalyticsPage /></ProtectedRoute>} />
            <Route path="admin/products" element={<ProtectedRoute permissions={['products']}><AdminProductsPage /></ProtectedRoute>} />
            <Route path="admin/purchases" element={<ProtectedRoute permissions={['purchases']}><AdminPurchasesPage /></ProtectedRoute>} />
            <Route path="admin/categories" element={<ProtectedRoute permissions={['categories']}><AdminCategoriesPage /></ProtectedRoute>} />
            <Route path="admin/offers" element={<ProtectedRoute permissions={['offers']}><AdminOffersPage /></ProtectedRoute>} />
            <Route path="admin/coupons" element={<ProtectedRoute permissions={['offers']}><AdminCouponsPage /></ProtectedRoute>} />
            <Route path="admin/reviews" element={<ProtectedRoute permissions={['products']}><AdminReviewsPage /></ProtectedRoute>} />
            <Route path="admin/orders" element={<ProtectedRoute permissions={['orders']}><OrdersManagementPage /></ProtectedRoute>} />
            <Route path="admin/debts" element={<ProtectedRoute permissions={['orders']}><AdminDebtsPage /></ProtectedRoute>} />
            <Route path="admin/customers" element={<ProtectedRoute permissions={['customers']}><AdminCustomersPage /></ProtectedRoute>} />
            <Route path="admin/users" element={<ProtectedRoute permissions={['users']}><AdminUsersPage /></ProtectedRoute>} />
            <Route path="admin/developer" element={<ProtectedRoute permissions={['developer']}><AdminDeveloperPage /></ProtectedRoute>} />
            <Route path="admin/developer/saas" element={<ProtectedRoute permissions={['developer']}><DeveloperSaasPage /></ProtectedRoute>} />
            <Route path="admin/tracking" element={<ProtectedRoute permissions={['orders']}><AdminLiveTrackingPage /></ProtectedRoute>} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['warehouse']} />}>
          <Route element={<AppShell mode="warehouse" />}>
            <Route path="warehouse" element={<WarehousePage />} />
            <Route path="warehouse/orders" element={<WarehousePage />} />
            <Route path="warehouse/products" element={<WarehousePage />} />
            <Route path="warehouse/categories" element={<WarehousePage />} />
            <Route path="warehouse/advanced" element={<WarehouseAdvancedPage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['delivery']} />}>
          <Route element={<AppShell mode="delivery" />}>
            <Route path="delivery" element={<DeliveryPage />} />
            <Route path="delivery/orders" element={<DeliveryPage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['customer', 'admin', 'warehouse', 'delivery']} />}>
          <Route element={<RoleAwareShell />}>
            <Route path="orders/:id" element={<OrderDetailsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
