import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from '@/pages/home/HomePage';
import { CatalogPage } from '@/pages/catalog/CatalogPage';
import { AppointmentsPage } from '@/pages/consignor/AppointmentsPage';
import { ContractsPage } from '@/pages/consignor/ContractsPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { PosPage } from '@/pages/admin/PosPage';
import { ProductManagementPage } from '@/pages/admin/ProductManagementPage';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/catalog" element={<CatalogPage />} />
      <Route path="/appointments" element={<AppointmentsPage />} />
      <Route path="/contracts" element={<ContractsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Staff & Admin Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Staff']}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pos"
        element={
          <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Staff']}>
            <PosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Staff']}>
            <ProductManagementPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

