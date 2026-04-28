import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AdminCustomersPage } from './pages/AdminCustomersPage';
import { AdminCategoriesPage } from './pages/AdminCategoriesPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminProductsPage } from './pages/AdminProductsPage';
import { AdminPurchasesPage } from './pages/AdminPurchasesPage';
import { CartPage } from './pages/CartPage';
import { CustomerHome } from './pages/CustomerHome';
import { DealsPage } from './pages/DealsPage';
import { DeliveryPage } from './pages/DeliveryPage';
import { LoginPage } from './pages/LoginPage';
import { OrderDetailsPage } from './pages/OrderDetailsPage';
import { OrdersManagementPage } from './pages/OrdersManagementPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductDetails } from './pages/ProductDetails';
import { ProfilePage } from './pages/ProfilePage';
import { WarehousePage } from './pages/WarehousePage';
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
      <Route element={<ProtectedRoute roles={['customer']} />}>
        <Route element={<AppShell mode="customer" />}>
          <Route index element={<CustomerHome />} />
          <Route path="deals" element={<DealsPage />} />
          <Route path="products/:id" element={<ProductDetails />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route element={<AppShell mode="admin" />}>
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/products" element={<AdminProductsPage />} />
          <Route path="admin/purchases" element={<AdminPurchasesPage />} />
          <Route path="admin/categories" element={<AdminCategoriesPage />} />
          <Route path="admin/orders" element={<OrdersManagementPage />} />
          <Route path="admin/customers" element={<AdminCustomersPage />} />
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
