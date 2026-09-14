import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();

  const isManagerRoute = allowedRoles?.some(
    (r) => r === 'RESTAURANT_MANAGER' || r === 'MANAGER'
  );

  if (!isAuthenticated || !user) {
    return <Navigate to={isManagerRoute ? '/manager/login' : '/login'} replace />;
  }

  const isUserRoleAllowed = allowedRoles?.some((role) => {
    if (role === user.role) return true;
    if (
      (role === 'RESTAURANT_MANAGER' || role === 'MANAGER') &&
      (user.role === 'RESTAURANT_MANAGER' || user.role === 'MANAGER')
    ) {
      return true;
    }
    return false;
  });

  if (allowedRoles && !isUserRoleAllowed) {
    // If customer tries to open manager pages or vice versa
    const isUserManager =
      user.role === 'RESTAURANT_MANAGER' ||
      user.role === 'MANAGER' ||
      user.role === 'ADMIN';

    if (isUserManager) {
      return <Navigate to="/manager/dashboard" replace />;
    }
    return <Navigate to="/customer/dashboard" replace />;
  }

  return <Outlet />;
};
