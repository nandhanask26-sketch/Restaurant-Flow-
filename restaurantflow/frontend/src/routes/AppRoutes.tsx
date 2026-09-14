import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { CustomerLogin } from '../pages/CustomerLogin';
import { ManagerLogin } from '../pages/ManagerLogin';
import { RegisterCustomer } from '../pages/RegisterCustomer';
import { RegisterManager } from '../pages/RegisterManager';

// Layouts
import { CustomerLayout } from '../layouts/CustomerLayout';
import { ManagerLayout } from '../layouts/ManagerLayout';
import { ProtectedRoute } from './ProtectedRoute';

// Customer Pages
import { CustomerDashboard } from '../pages/customer/CustomerDashboard';
import { CustomerMenuPage } from '../pages/customer/CustomerMenuPage';
import { CustomerCartPage } from '../pages/customer/CustomerCartPage';
import { CustomerOrdersPage } from '../pages/customer/CustomerOrdersPage';
import { CustomerOrderDetailsPage } from '../pages/customer/CustomerOrderDetailsPage';
import { CustomerProfilePage } from '../pages/customer/CustomerProfilePage';

// Manager Pages
import { ManagerDashboard } from '../pages/manager/ManagerDashboard';
import { ManagerSmartQueuePage } from '../pages/manager/ManagerSmartQueuePage';
import { ManagerOrdersPage } from '../pages/manager/ManagerOrdersPage';
import { ManagerMenuPage } from '../pages/manager/ManagerMenuPage';
import { ManagerInventoryPage } from '../pages/manager/ManagerInventoryPage';
import { ManagerQRScannerPage } from '../pages/manager/ManagerQRScannerPage';
import { ManagerAnalyticsPage } from '../pages/manager/ManagerAnalyticsPage';
import { ManagerRestaurantProfilePage } from '../pages/manager/ManagerRestaurantProfilePage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<CustomerLogin />} />
      <Route path="/manager/login" element={<ManagerLogin />} />
      <Route path="/register/customer" element={<RegisterCustomer />} />
      <Route path="/register/manager" element={<RegisterManager />} />

      {/* Customer Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']} />}>
        <Route path="/customer" element={<CustomerLayout />}>
          <Route index element={<Navigate to="/customer/dashboard" replace />} />
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="menu" element={<CustomerMenuPage />} />
          <Route path="cart" element={<CustomerCartPage />} />
          <Route path="orders" element={<CustomerOrdersPage />} />
          <Route path="orders/:id" element={<CustomerOrderDetailsPage />} />
          <Route path="profile" element={<CustomerProfilePage />} />
        </Route>
      </Route>

      {/* Manager Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['RESTAURANT_MANAGER', 'MANAGER', 'ADMIN']} />}>
        <Route path="/manager" element={<ManagerLayout />}>
          <Route index element={<Navigate to="/manager/profile" replace />} />
          <Route path="profile" element={<ManagerRestaurantProfilePage />} />
          <Route path="qr-scanner" element={<ManagerQRScannerPage />} />
          <Route path="smart-queue" element={<Navigate to="/manager/qr-scanner" replace />} />
          <Route path="orders" element={<ManagerOrdersPage />} />
          <Route path="menu" element={<ManagerMenuPage />} />
          <Route path="dashboard" element={<ManagerDashboard />} />
          <Route path="analytics" element={<ManagerAnalyticsPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
