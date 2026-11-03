import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button, Card } from '@/components/shared';
import { useAuth } from '@/context/AuthContext';

export const UnauthorizedPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-surface px-4 py-12">
      <Card className="max-w-md w-full text-center p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-bg text-danger-text">
          <ShieldAlert size={32} aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-ink">Truy cập bị từ chối (403)</h1>
        <p className="mt-2 text-sm text-muted">
          Tài khoản của bạn ({user?.email}) không có quyền truy cập vào phân hệ này.
        </p>
        <p className="mt-1 text-xs text-muted">
          Vai trò hiện tại: {user?.roles?.join(', ') || 'Chưa phân quyền'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Về trang chủ
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};

