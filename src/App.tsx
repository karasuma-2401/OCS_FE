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
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ShopDashboardPage } from './pages/ShopDashboardPage';
import { AppointmentSlotsPage } from './pages/AppointmentSlotsPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { ConsignmentTrackingPage } from './pages/ConsignmentTrackingPage';
import { ProfilePage } from './pages/ProfilePage';
import { ContractIntakePage } from './pages/ContractIntakePage';
import { ContractListPage, ContractPdfPage } from './pages/ContractDocumentsPage';
import { ContractTemplatePage } from './pages/ContractTemplatePage';
import { SkeletonLoading } from './components/shared';

const ProductRailPreviewPage = React.lazy(() => import('./pages/ProductRailPreviewPage'));

const CustomerLayout: React.FC = () => {
  return (
    <div className={`
      landing bg-[#f9f7f8] font-sans text-[#28252e] [&_a]:no-underline [&_a:focus-visible]:outline-2
      [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-[#bd6b8a]
      [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4
      [&_button:focus-visible]:outline-[#bd6b8a] [&_h2]:mt-3 [&_h2]:text-[clamp(1.7rem,2.8vw,2.55rem)]
      [&_h2]:leading-[1.16] [&_h2]:font-bold [&_h2]:tracking-[-.045em] motion-reduce:[&_*]:!duration-[0.01ms]
      customer-layout flex min-h-screen flex-col
    `}>
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
        <Route path="/consign" element={<ConsignPage />} />
        <Route path="/appointments" element={<ProtectedRoute allowedRoles={['Customer']}><AppointmentsPage /></ProtectedRoute>} />
        <Route path="/my-consignments" element={<ProtectedRoute allowedRoles={['Customer']}><ConsignmentTrackingPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* UI Components Kit preview */}
      <Route path="/ui-components" element={<UIComponentsPage />} />
      <Route path="/ui-components/product-rail-gallery" element={<React.Suspense fallback={<SkeletonLoading variant="page" label="Đang tải thư viện sản phẩm..." className="p-6" />}><ProductRailPreviewPage /></React.Suspense>} />

      {/* Protected Shop / Admin routes */}
      <Route path="/shop/contracts/new" element={<ProtectedRoute allowedRoles={['Admin', 'Manager', 'Staff']}><ContractIntakePage /></ProtectedRoute>} />
      <Route path="/shop/appointment-slots" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><AppointmentSlotsPage /></ProtectedRoute>} />
      <Route path="/shop/contracts/template" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><ContractTemplatePage /></ProtectedRoute>} />
      <Route path="/shop/contracts" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><ContractListPage /></ProtectedRoute>} />
      <Route path="/shop/contracts/:id" element={<ProtectedRoute allowedRoles={['Admin', 'Manager', 'Staff']}><ContractPdfPage /></ProtectedRoute>} />
      <Route path="/admin/accounts" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><ShopDashboardPage initialTab="accounts" /></ProtectedRoute>} />
      <Route path="/shop/accounts" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><ShopDashboardPage initialTab="accounts" /></ProtectedRoute>} />
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
