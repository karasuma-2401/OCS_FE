import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { RoleCode } from '@/types';
import { SkeletonLoading, ErrorState } from '@/components/shared';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleCode[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isChecking, bootstrapError, retryBootstrap, user } = useAuth();
  const location = useLocation();

  if (isChecking) {
    return (
      <SkeletonLoading variant="page" label="Đang xác thực phiên làm việc..." className="min-h-[60vh] p-6" />
    );
  }

  if (bootstrapError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <ErrorState
          title="Không thể kiểm tra phiên đăng nhập"
          description="Đã xảy ra lỗi kết nối với máy chủ xác thực. Vui lòng thử lại."
          onRetry={retryBootstrap}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Validate that pathname is a safe internal relative path (no protocol, no double slashes, no backslashes)
    const isSafe =
      location.pathname.startsWith('/') &&
      !location.pathname.startsWith('//') &&
      !location.pathname.includes('\\');

    const safeReturnPath = isSafe ? `${location.pathname}${location.search}` : '/';

    return <Navigate to={`/login?from=${encodeURIComponent(safeReturnPath)}`} state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = user?.roles?.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};
