import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card, Button } from '@/components/shared';
import { MailCheck, ArrowLeft } from 'lucide-react';

export const VerifyOtpPage: React.FC = () => {
  const location = useLocation();
  const state = location.state as { email?: string; continuationToken?: string } | undefined;

  return (
    <div className="flex min-h-[75vh] items-center justify-center bg-surface px-4 py-12">
      <Card className="w-full max-w-md p-8 shadow-lg text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent-dark mb-3">
          <MailCheck size={24} />
        </div>
        <h1 className="text-2xl font-black text-ink">Xác thực Email OTP</h1>
        <p className="mt-1 text-sm text-muted">
          Mã xác thực 6 chữ số đã được gửi tới địa chỉ email của bạn
          {state?.email ? ` (${state.email})` : ''}.
        </p>

        <div className="my-6 p-4 rounded-xl bg-slate-50 border border-border text-xs text-muted text-left">
          <p className="font-semibold text-ink mb-1">💡 Sẵn sàng kết nối tại CP8:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Nhập mã OTP 6 chữ số</li>
            <li>Đếm ngược cooldown gửi lại 60 giây</li>
            <li>Kích hoạt tài khoản và chuyển hướng đăng nhập</li>
          </ul>
        </div>

        <div className="space-y-3">
          <Link to="/login">
            <Button variant="outline" className="w-full flex items-center justify-center gap-2">
              <ArrowLeft size={16} />
              Quay lại đăng nhập
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};

