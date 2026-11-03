import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Store, Sparkles, ShieldCheck } from 'lucide-react';
import { Button, Card } from '@/components/shared';
import { useAuth } from '@/context/AuthContext';

export const HomePage: React.FC = () => {
  const { isAuthenticated, isStaffOrAdmin, user } = useAuth();

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 text-accent-dark text-xs font-bold mb-4">
          <Sparkles size={14} />
          Nền tảng Ký gửi & Thời trang Bền vững
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-ink tracking-tight">
          Trao cuộc đời mới cho quần áo cũ cùng OCS
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted">
          Minh bạch từng sản phẩm, định giá thông minh và quản lý ký gửi toàn diện từ trực tiếp đến trực tuyến.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link to="/catalog">
            <Button size="lg" className="flex items-center gap-2">
              <ShoppingBag size={18} />
              Khám phá sản phẩm
            </Button>
          </Link>
          <Link to="/consign">
            <Button variant="outline" size="lg">
              Cách thức ký gửi
            </Button>
          </Link>
        </div>
      </div>

      {/* Gateway Cards */}
      <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
        <Card className="p-6 transition hover:shadow-lg border-2 hover:border-accent">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-pink-light text-brand-highlight mb-4">
            <ShoppingBag size={24} />
          </div>
          <h2 className="text-xl font-bold text-ink">Dành cho Khách hàng</h2>
          <p className="mt-2 text-sm text-muted">
            Khám phá các sản phẩm quần áo vintage, retro độc bản đã được kiểm định chất lượng, hoặc theo dõi các đợt ký gửi của bạn.
          </p>
          <div className="mt-6 flex items-center justify-between">
            <Link to="/catalog" className="text-sm font-bold text-accent-dark flex items-center gap-1.5 hover:underline">
              Xem sản phẩm
              <ArrowRight size={16} />
            </Link>
          </div>
        </Card>

        <Card className="p-6 transition hover:shadow-lg border-2 hover:border-accent">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-state-warning-soft text-accent-dark mb-4">
            <Store size={24} />
          </div>
          <h2 className="text-xl font-bold text-ink">Phân hệ Cửa hàng & Quản lý</h2>
          <p className="mt-2 text-sm text-muted">
            Dành cho Nhân viên và Quản lý thực hiện bán hàng POS, quản lý kiểm định kho, quyết toán ký gửi và báo cáo kinh doanh.
          </p>
          <div className="mt-6 flex items-center justify-between">
            <Link to="/admin" className="text-sm font-bold text-accent-dark flex items-center gap-1.5 hover:underline">
              {isAuthenticated && isStaffOrAdmin ? 'Vào trang quản trị' : 'Yêu cầu đăng nhập quản trị'}
              <ArrowRight size={16} />
            </Link>
            {!isAuthenticated && (
              <span className="text-xs text-muted flex items-center gap-1">
                <ShieldCheck size={14} />
                Bảo vệ bởi hệ thống Auth
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* Active User Status bar if logged in */}
      {isAuthenticated && (
        <div className="mt-12 max-w-4xl mx-auto p-4 rounded-xl border border-accent/30 bg-accent/5 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-semibold text-ink">Đang đăng nhập: </span>
            <span className="text-muted">{user?.fullName || user?.email}</span>
            <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold bg-accent text-ink">
              {user?.roles?.join(', ')}
            </span>
          </div>
          {isStaffOrAdmin && (
            <Link to="/admin/pos">
              <Button size="sm">Mở Web POS</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

