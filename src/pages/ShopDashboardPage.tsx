import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, Receipt, Users } from 'lucide-react';
import ShopNavBar, { type ShopNavItem } from '@/components/layout/shop/ShopNavBar';
import { useAuth } from '@/context/AuthContext';
import { Card, PageHeaderCard } from '@/components/shared';
import { AppointmentManagement } from '@/components/shop/AppointmentManagement';
import { AccountManagement } from '@/components/shop/AccountManagement';
import { FunctionPermissions } from '@/components/shop/FunctionPermissions';
import { InventoryManagement } from '@/components/shop/InventoryManagement';
import { PosVietQrWorkspace } from '@/components/shop/pos/PosVietQrWorkspace';
import { screenByPath, screenOrder, screenPaths, screenPermissions, screenRequirements, type ShopNavId } from '@/auth/permissions';

interface ShopDashboardPageProps {
  initialTab?: ShopNavId;
}

const tabTitles: Record<ShopNavId, { title: string; desc: string }> = {
  pos: {
    title: 'POS Bán Hàng Trực Tiếp',
    desc: 'Tạo đơn hàng nhanh chóng, quét mã vạch sản phẩm và in hóa đơn bán lẻ tại quầy.',
  },
  inventory: {
    title: 'Quản Lý Kho Hàng & Kiểm Định',
    desc: 'Quản lý danh sách sản phẩm, trạng thái kiểm định, in nhãn barcode và cập nhật tình trạng hàng hóa.',
  },
  consignment: {
    title: 'Tiếp Nhận Ký Gửi',
    desc: 'Lập hợp đồng ký gửi mới, phân loại đồ cũ và tính toán mức hoa hồng thỏa thuận với khách hàng.',
  },
  customers: {
    title: 'Danh Sách Khách Hàng & Người Ký Gửi',
    desc: 'Tra cứu thông tin hồ sơ khách hàng, lịch sử mua sắm và các hợp đồng ký gửi liên quan.',
  },
  settlement: {
    title: 'Quyết Toán Tiền Ký Gửi',
    desc: 'Tổng hợp doanh số bán hàng từ đồ ký gửi và lập lệnh chi trả cho người gửi đồ định kỳ.',
  },
  reports: {
    title: 'Báo Cáo & Thống Kê Kinh Doanh',
    desc: 'Biểu đồ doanh thu theo ngày/tháng, tỷ lệ hàng bán thành công và phân tích sản phẩm bán chạy.',
  },
  settings: {
    title: 'Cấu Hình Hệ Thống Cửa Hàng',
    desc: 'Thiết lập vai trò và quyền sử dụng các chức năng trong hệ thống.',
  },
  accounts: {
    title: 'Quản lý tài khoản',
    desc: 'Danh sách tài khoản và phân quyền nhân sự.',
  },
};

export const ShopDashboardPage: React.FC<ShopDashboardPageProps> = ({ initialTab = 'pos' }) => {
  const { user, logout, hasPermission, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const getTabFromPath = (): ShopNavId => screenByPath[location.pathname] ?? initialTab;

  const [activeTab, setActiveTab] = useState<ShopNavId>(getTabFromPath());
  const [logoutError, setLogoutError] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
  if (!Object.hasOwn(screenByPath, location.pathname)) {
    return <Navigate to="/unauthorized" replace />;
  }
  if (!canOpenScreen(activeTab)) {
    return <Navigate to={location.pathname === '/admin' ? defaultScreen : '/unauthorized'} replace />;
  }

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-surface-dashboard px-3 pt-[11px] pb-12 lg:flex-row lg:items-start">
      <ShopNavBar
        activeItem={activeTab}
        showAccounts={canOpenScreen('accounts')}
        allowedItems={allowedItems}
        showContractManagement={hasRole('Admin') || hasRole('Manager')}
        onContracts={() => navigate('/shop/contracts')}
        profileName={user?.fullName || user?.email || 'Nhân viên'}
        onNavigate={handleNavigate}
        onProfileClick={() => navigate('/profile')}
        onHome={() => navigate('/')}
        loggingOut={loggingOut}
        onLogout={async () => {
          setLoggingOut(true);
          setLogoutError(false);
          try {
            await logout();
            navigate('/');
          } catch {
            setLogoutError(true);
          } finally {
            setLoggingOut(false);
          }
        }}
      />

      <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 p-6 text-text-primary">
        {activeTab !== 'consignment' && <h1 className="sr-only">{currentTabInfo.title}</h1>}

        {logoutError && <p role="alert" className="mb-4 text-sm text-red-700">Không thể đăng xuất. Vui lòng thử lại.</p>}
        {activeTab === 'accounts' ? <AccountManagement /> : activeTab === 'consignment' ? <AppointmentManagement /> : activeTab === 'inventory' ? <InventoryManagement /> : activeTab === 'pos' ? <PosVietQrWorkspace /> : activeTab === 'settings' ? <FunctionPermissions /> : <>
          <PageHeaderCard
            icon={activeTab === 'customers' ? <Users size={24} aria-hidden="true" /> : activeTab === 'settlement' ? <Receipt size={24} aria-hidden="true" /> : <BarChart3 size={24} aria-hidden="true" />}
            title={currentTabInfo.title}
            description={currentTabInfo.desc}
          />
          <Card className="mt-5 p-6">
            <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center">
              <p className="text-sm font-semibold text-ink">
                Mô-đun {currentTabInfo.title} đang hoạt động trong phiên bản {user?.roles?.join('/')} .
              </p>
              <p className="mt-1 text-xs text-muted">
                Dữ liệu được xác thực an toàn qua phiên HttpOnly cookie và bảo vệ CSRF.
              </p>
            </div>
          </Card>
        </>}
      </main>
    </div>
  );
};
