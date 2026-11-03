import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import { Button, Card } from '@/components/shared';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-surface px-4 py-12">
      <Card className="max-w-md w-full text-center p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-muted">
          <HelpCircle size={32} aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-ink">404 - Trang không tồn tại</h1>
        <p className="mt-2 text-sm text-muted">
          Đường dẫn bạn yêu cầu không tồn tại hoặc đã được chuyển sang địa chỉ khác.
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

