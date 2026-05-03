import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { SplashScreen } from '../components/Brand';
import { useAuth } from '../context/AuthContext';
import { hasAnyPermission, homeForProfile } from '../lib/permissions';
import type { PermissionKey, Role } from '../types/database';

const homeByRole: Record<Role, string> = {
  customer: '/',
  admin: '/admin',
  warehouse: '/warehouse',
  delivery: '/delivery',
};

export function roleHome(role: Role | null) {
  return role ? homeByRole[role] : '/login';
}

type ProtectedRouteProps = {
  roles?: Role[];
  allowedRoles?: Role[];
  permissions?: PermissionKey[];
  children?: ReactNode;
};

export function ProtectedRoute({ roles, allowedRoles, permissions, children }: ProtectedRouteProps) {
  const { session, role, loading, profile, profileResolved } = useAuth();
  const location = useLocation();
  const permittedRoles = roles ?? allowedRoles;

  if (loading || (session && permittedRoles && !profileResolved)) {
    return <SplashScreen />;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (permittedRoles && (!role || !permittedRoles.includes(role))) {
    const redirectTarget = roleHome(role);
    if (redirectTarget === location.pathname) return <Outlet />;
    return <Navigate to={redirectTarget} replace />;
  }

  if (permissions?.length && !hasAnyPermission(profile, permissions)) {
    const redirectTarget = homeForProfile(profile);
    if (redirectTarget === location.pathname) return <Outlet />;
    return <Navigate to={redirectTarget} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
