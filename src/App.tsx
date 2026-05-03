import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AdminCustomersPage } from './pages/AdminCustomersPage';
import { AdminCategoriesPage } from './pages/AdminCategoriesPage';
import { AdminAnalyticsPage } from './pages/AdminAnalyticsPage';
import { AdminCouponsPage } from './pages/AdminCouponsPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminProductsPage } from './pages/AdminProductsPage';
import { AdminPurchasesPage } from './pages/AdminPurchasesPage';
import { AdminReviewsPage } from './pages/AdminReviewsPage';
import { CartPage } from './pages/CartPage';
import { CustomerHome } from './pages/CustomerHome';
import { DealsPage } from './pages/DealsPage';
import { DeliveryPage } from './pages/DeliveryPage';
import { LoginPage } from './pages/LoginPage';
import { OrderDetailsPage } from './pages/OrderDetailsPage';
import { OrdersManagementPage } from './pages/OrdersManagementPage';
import { OrdersPage } from './pages/OrdersPage';
import { PaymentCallbackPage } from './pages/PaymentCallbackPage';
import { ProductDetails } from './pages/ProductDetails';
import { ProfilePage } from './pages/ProfilePage';
import { SetupWizardPage } from './pages/SetupWizardPage';
import { WarehousePage } from './pages/WarehousePage';
import { WishlistPage } from './pages/WishlistPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { useAuth } from './context/AuthContext';

function RoleAwareShell() {
  const { role } = useAuth();
  return <AppShell mode={role === 'delivery' ? 'delivery' : role === 'warehouse' ? 'warehouse' : role === 'customer' ? 'customer' : 'admin'} />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/payment/callback" element={<PaymentCallbackPage />} />
      <Route element={<ProtectedRoute roles={['customer']} />}>
        <Route element={<AppShell mode="customer" />}>
          <Route index element={<CustomerHome />} />
          <Route path="deals" element={<DealsPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="products/:id" element={<ProductDetails />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route element={<AppShell mode="admin" />}>
          <Route path="admin" element={<ProtectedRoute permissions={['reports']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="admin/analytics" element={<ProtectedRoute permissions={['reports']}><AdminAnalyticsPage /></ProtectedRoute>} />
          <Route path="admin/products" element={<ProtectedRoute permissions={['products']}><AdminProductsPage /></ProtectedRoute>} />
          <Route path="admin/purchases" element={<ProtectedRoute permissions={['purchases']}><AdminPurchasesPage /></ProtectedRoute>} />
          <Route path="admin/categories" element={<ProtectedRoute permissions={['categories']}><AdminCategoriesPage /></ProtectedRoute>} />
          <Route path="admin/coupons" element={<ProtectedRoute permissions={['orders']}><AdminCouponsPage /></ProtectedRoute>} />
          <Route path="admin/reviews" element={<ProtectedRoute permissions={['products']}><AdminReviewsPage /></ProtectedRoute>} />
          <Route path="admin/orders" element={<ProtectedRoute permissions={['orders']}><OrdersManagementPage /></ProtectedRoute>} />
          <Route path="admin/customers" element={<ProtectedRoute permissions={['users']}><AdminCustomersPage /></ProtectedRoute>} />
          <Route path="admin/setup" element={<ProtectedRoute permissions={['settings']}><SetupWizardPage /></ProtectedRoute>} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['warehouse']} />}>
        <Route element={<AppShell mode="warehouse" />}>
          <Route path="warehouse" element={<WarehousePage />} />
          <Route path="warehouse/orders" element={<WarehousePage />} />
          <Route path="warehouse/products" element={<WarehousePage />} />
          <Route path="warehouse/categories" element={<WarehousePage />} />
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
  );
}
