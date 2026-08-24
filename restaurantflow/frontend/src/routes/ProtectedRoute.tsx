import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If manager tries to access customer route or vice versa
    if (user.role === 'RESTAURANT_MANAGER') {
      return <Navigate to="/manager/dashboard" replace />;
    }
    return <Navigate to="/customer/dashboard" replace />;
  }

  return <Outlet />;
};
