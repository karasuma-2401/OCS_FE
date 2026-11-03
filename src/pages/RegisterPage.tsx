import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '@/components/shared';
import { UserPlus, ArrowLeft } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  return (
    <div className="flex min-h-[75vh] items-center justify-center bg-surface px-4 py-12">
      <Card className="w-full max-w-md p-8 shadow-lg text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-pink-light text-brand-highlight mb-3">
          <UserPlus size={24} />
        </div>
        <h1 className="text-2xl font-black text-ink">Đăng ký tài khoản mới</h1>
        <p className="mt-1 text-sm text-muted">
          Đăng ký tài khoản Khách hàng để trải nghiệm mua sắm và ký gửi quần áo.
        </p>

        <div className="my-6 p-4 rounded-xl bg-slate-50 border border-border text-xs text-muted text-left">
          <p className="font-semibold text-ink mb-1">💡 Sẵn sàng kết nối tại CP7:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Đăng ký email xác thực OTP</li>
            <li>Họ tên, số điện thoại, mật khẩu chuẩn bảo mật</li>
            <li>Chuyển tiếp tự động sang màn hình kích hoạt OTP</li>
          </ul>
        </div>

        <div className="space-y-3">
          <Link to="/login">
            <Button variant="outline" className="w-full flex items-center justify-center gap-2">
              <ArrowLeft size={16} />
              Đã có tài khoản? Đăng nhập
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};

