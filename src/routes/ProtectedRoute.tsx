import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { SplashScreen } from '../components/Brand';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types/database';

const homeByRole: Record<Role, string> = {
  customer: '/',
  admin: '/admin',
  warehouse: '/warehouse',
  delivery: '/delivery',
};

export function roleHome(role: Role | null) {
  return role ? homeByRole[role] : '/login';
}

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { session, role, loading, profileResolved } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  if (loading) {
    console.info('CURRENT_PATH', currentPath);
    console.info('USER_ROLE', role);
    console.info('SHOULD_REDIRECT', false);
    console.info('REDIRECT_TARGET', null);
    return <SplashScreen />;
  }

  if (!session) {
    console.info('CURRENT_PATH', currentPath);
    console.info('USER_ROLE', null);
    console.info('SHOULD_REDIRECT', true);
    console.info('REDIRECT_TARGET', '/login');
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !profileResolved) {
    console.info('CURRENT_PATH', currentPath);
    console.info('USER_ROLE', role);
    console.info('SHOULD_REDIRECT', false);
    console.info('REDIRECT_TARGET', null);
    return <SplashScreen />;
  }

  const shouldRedirect = Boolean(roles && (!role || !roles.includes(role)));
  const redirectTarget = shouldRedirect ? roleHome(role) : null;

  console.info('CURRENT_PATH', currentPath);
  console.info('USER_ROLE', role);
  console.info('SHOULD_REDIRECT', shouldRedirect);
  console.info('REDIRECT_TARGET', redirectTarget);

  if (shouldRedirect && redirectTarget) {
    return <Navigate to={redirectTarget} replace />;
  }

  return <Outlet />;
}
