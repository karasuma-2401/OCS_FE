import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import ShopNavBar, { type ShopNavId, type ShopNavItem } from '@/components/layout/Store/ShopNavBar';
import { useAuth } from '@/context/AuthContext';
import { Card, Button, Badge } from '@/components/shared';
import { ShoppingCart, Package, FileText, Users, DollarSign, BarChart3, Settings, LogOut, ArrowLeft } from 'lucide-react';
import { AppointmentManagement } from '@/components/shop/AppointmentManagement';
import { AccountManagement } from '@/components/shop/AccountManagement';
import { FunctionPermissions } from '@/components/shop/FunctionPermissions';
import { screenOrder, screenPaths, screenPermissions, screenRequirements } from '@/auth/permissions';

interface ShopDashboardPageProps {
  initialTab?: ShopNavId;
}

const tabTitles: Record<ShopNavId, { title: string; desc: string; icon: React.ReactNode }> = {
  pos: {
    title: 'POS Bán Hàng Trực Tiếp',
    desc: 'Tạo đơn hàng nhanh chóng, quét mã vạch sản phẩm và in hóa đơn bán lẻ tại quầy.',
    icon: <ShoppingCart size={24} className="text-accent" />,
  },
  inventory: {
    title: 'Quản Lý Kho Hàng & Kiểm Định',
    desc: 'Quản lý danh sách sản phẩm, trạng thái kiểm định, in nhãn barcode và cập nhật tình trạng hàng hóa.',
    icon: <Package size={24} className="text-accent" />,
  },
  consignment: {
    title: 'Tiếp Nhận Ký Gửi',
    desc: 'Lập hợp đồng ký gửi mới, phân loại đồ cũ và tính toán mức hoa hồng thỏa thuận với khách hàng.',
    icon: <FileText size={24} className="text-accent" />,
  },
  customers: {
    title: 'Danh Sách Khách Hàng & Người Ký Gửi',
    desc: 'Tra cứu thông tin hồ sơ khách hàng, lịch sử mua sắm và các hợp đồng ký gửi liên quan.',
    icon: <Users size={24} className="text-accent" />,
  },
  settlement: {
    title: 'Quyết Toán Tiền Ký Gửi',
    desc: 'Tổng hợp doanh số bán hàng từ đồ ký gửi và lập lệnh chi trả cho người gửi đồ định kỳ.',
    icon: <DollarSign size={24} className="text-accent" />,
  },
  reports: {
    title: 'Báo Cáo & Thống Kê Kinh Doanh',
    desc: 'Biểu đồ doanh thu theo ngày/tháng, tỷ lệ hàng bán thành công và phân tích sản phẩm bán chạy.',
    icon: <BarChart3 size={24} className="text-accent" />,
  },
  settings: {
    title: 'Cấu Hình Hệ Thống Cửa Hàng',
    desc: 'Thiết lập vai trò và quyền sử dụng các chức năng trong hệ thống.',
    icon: <Settings size={24} className="text-accent" />,
  },
  accounts: {
    title: 'Quản lý tài khoản',
    desc: 'Danh sách tài khoản và phân quyền nhân sự.',
    icon: <Users size={24} className="text-accent" />,
  },
};

export const ShopDashboardPage: React.FC<ShopDashboardPageProps> = ({ initialTab = 'pos' }) => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const knownPaths = [
    '/admin', '/admin/pos', '/admin/products', '/admin/contracts', '/admin/customers',
    '/admin/settlement', '/admin/reports', '/admin/settings', '/admin/accounts',
    '/shop/pos', '/shop/kho', '/shop/ky-gui', '/shop/khach-hang', '/shop/quyet-toan',
    '/shop/bao-cao', '/shop/cau-hinh', '/shop/accounts',
  ];

  // Determine active tab from URL path if possible
  const getTabFromPath = (): ShopNavId => {
    if (location.pathname === '/admin/pos' || location.pathname === '/shop/pos') return 'pos';
    if (location.pathname.includes('/admin/products') || location.pathname.includes('/shop/kho')) return 'inventory';
    if (location.pathname.includes('/admin/contracts') || location.pathname.includes('/shop/ky-gui')) return 'consignment';
    if (location.pathname.includes('/admin/customers') || location.pathname.includes('/shop/khach-hang')) return 'customers';
    if (location.pathname.includes('/admin/settlement') || location.pathname.includes('/shop/quyet-toan')) return 'settlement';
    if (location.pathname.includes('/admin/reports') || location.pathname.includes('/shop/bao-cao')) return 'reports';
    if (location.pathname.includes('/admin/settings') || location.pathname.includes('/shop/cau-hinh')) return 'settings';
    if (location.pathname.includes('/admin/accounts') || location.pathname.includes('/shop/accounts')) return 'accounts';
    return initialTab;
  };

  const [activeTab, setActiveTab] = useState<ShopNavId>(getTabFromPath());
  const [logoutError, setLogoutError] = useState(false);

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  const handleNavigate = (item: ShopNavItem) => {
    setActiveTab(item.id);
    navigate(item.href);
  };

  const currentTabInfo = tabTitles[activeTab];
  const canOpenScreen = (id: ShopNavId) => {
    const required = screenRequirements[id];
    return hasPermission(screenPermissions[id]) && (!required || hasPermission(required));
  };
  const allowedItems = screenOrder.filter(canOpenScreen);
  const defaultScreen = allowedItems.length > 0 ? screenPaths[allowedItems[0]] : '/unauthorized';
  if (!knownPaths.includes(location.pathname)) {
    return <Navigate to="/unauthorized" replace />;
  }
  if (!canOpenScreen(activeTab)) {
    return <Navigate to={location.pathname === '/admin' ? defaultScreen : '/unauthorized'} replace />;
  }

  return (
    <div className="min-h-screen bg-surface-dashboard px-3 pt-[11px] pb-12">
      <ShopNavBar
        activeItem={activeTab}
        showAccounts={canOpenScreen('accounts')}
        allowedItems={allowedItems}
        profileName={user?.fullName || user?.email || 'Nhân viên'}
        onNavigate={handleNavigate}
        onProfileClick={() => navigate('/admin')}
      />

      <main className="max-w-7xl mx-auto p-6 text-text-primary">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-ink text-paper">
              {currentTabInfo.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Phân hệ Cửa hàng</span>
                <Badge variant="info">{user?.roles?.join(', ')}</Badge>
              </div>
              <h1 className="mt-1 text-2xl font-bold text-ink">{currentTabInfo.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/')} className="flex items-center gap-1.5">
              <ArrowLeft size={14} />
              Về trang chủ
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  await logout();
                  navigate('/');
                } catch {
                  setLogoutError(true);
                }
              }}
              className="text-danger hover:bg-danger-bg"
            >
              <LogOut size={14} className="mr-1" />
              Đăng xuất
            </Button>
          </div>
        </div>

        {logoutError && <p role="alert" className="mb-4 text-sm text-red-700">Không thể đăng xuất. Vui lòng thử lại.</p>}
        {activeTab === 'accounts' ? <AccountManagement /> : activeTab === 'consignment' ? <AppointmentManagement /> : activeTab === 'settings' ? <FunctionPermissions /> : <Card className="p-6 mb-6">
          <p className="text-sm text-muted">{currentTabInfo.desc}</p>
          <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center bg-white">
            <p className="text-sm font-semibold text-ink">
              Mô-đun {currentTabInfo.title} đang hoạt động trong phiên bản {user?.roles?.join('/')}.
            </p>
            <p className="mt-1 text-xs text-muted">
              Dữ liệu được xác thực an toàn qua phiên HttpOnly cookie và bảo vệ CSRF.
            </p>
          </div>
        </Card>}
      </main>
    </div>
  );
};

