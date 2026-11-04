import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AuthLayout } from './components/layout/AuthLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ConsignPage } from './pages/ConsignPage';
import { UIComponentsPage } from './pages/UIComponentsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyOtpPage } from './pages/VerifyOtpPage';
import { ShopDashboardPage } from './pages/ShopDashboardPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { NotFoundPage } from './pages/NotFoundPage';

const CustomerLayout: React.FC = () => {
  return (
    <div className="landing customer-layout">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      {/* Public Customer Layout routes */}
      <Route element={<CustomerLayout />}>
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/explore" element={<CatalogPage />} />
        <Route path="/kham-pha" element={<CatalogPage />} />
        <Route path="/consign" element={<ConsignPage />} />
        <Route path="/cach-ky-gui" element={<ConsignPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
      </Route>

      {/* UI Components Kit preview */}
      <Route path="/ui-components" element={<UIComponentsPage />} />

      {/* Protected Shop / Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Staff']}>
            <ShopDashboardPage initialTab="reports" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pos"
        element={
          <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Staff']}>
            <ShopDashboardPage initialTab="pos" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Staff']}>
            <ShopDashboardPage initialTab="inventory" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Staff']}>
            <ShopDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shop/*"
        element={
          <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Staff']}>
            <ShopDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* 404 Catch-All */}
      <Route element={<CustomerLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
