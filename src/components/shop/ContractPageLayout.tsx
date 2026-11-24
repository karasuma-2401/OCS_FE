import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import ShopNavBar from '@/components/layout/shop/ShopNavBar';
import { PageHeaderCard } from '@/components/shared/PageHeaderCard';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuth } from '@/context/AuthContext';
import { screenOrder, screenPermissions, screenRequirements, type ShopNavId } from '@/auth/permissions';

export function ContractPageLayout({
  title,
  description,
  backTo,
  backLabel = 'Quay lại',
  wide = false,
  activeItem = 'consignment',
  icon,
  headerActions,
  children,
}: {
  title?: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
  wide?: boolean;
  activeItem?: ShopNavId | null;
  icon?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  const { user, logout, hasPermission, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const canManage = hasRole('Admin') || hasRole('Manager');
  const isManagement = canManage && location.pathname.startsWith('/shop/contracts') && location.pathname !== '/shop/contracts/new';
  const isNotificationsRoute = location.pathname === '/shop/notifications' || location.pathname === '/admin/notifications';
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const canOpen = (id: ShopNavId) => hasPermission(screenPermissions[id]) && (!screenRequirements[id] || hasPermission(screenRequirements[id]));
  return <div className="flex min-h-screen flex-col gap-4 bg-surface-dashboard px-3 pb-12 pt-[11px] lg:flex-row lg:items-start print:m-0 print:p-0 print:block print:bg-white print:min-h-0">
    <div className="print:hidden">
      <ShopNavBar activeItem={isNotificationsRoute ? null : activeItem} showAccounts={canOpen('accounts')} allowedItems={screenOrder.filter(canOpen)}
        showContractManagement={canManage} contractsActive={isManagement} onContracts={() => navigate('/shop/contracts')}
        actions={<NotificationBell align="left" placement="above" showLabel active={isNotificationsRoute} />}
        profileName={user?.fullName || user?.email || 'Nhân viên'} onNavigate={item => navigate(item.href)}
        onProfileClick={() => navigate('/profile')} onHome={() => navigate('/')} loggingOut={loggingOut}
        onLogout={async () => { setLoggingOut(true); setLogoutError(false); try { await logout(); navigate('/'); } catch { setLogoutError(true); } finally { setLoggingOut(false); } }} />
    </div>
    <main className={`mx-auto w-full max-w-7xl min-w-0 flex-1 p-4 sm:p-6 text-text-primary print:m-0 print:p-0 print:w-full print:max-w-none ${wide ? '!max-w-none' : ''}`}>
      {title && <h1 className="sr-only">{title}</h1>}
      {backTo && (
        <div className="mb-4 print:hidden">
          <Link to={backTo} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-highlight hover:underline">
            ← {backLabel}
          </Link>
        </div>
      )}
      {title && (
        <div className="mb-6 print:hidden">
          <PageHeaderCard
            icon={icon ?? <FileText size={22} aria-hidden="true" />}
            title={title}
            description={description ?? ''}
            actions={headerActions}
          />
        </div>
      )}
      {logoutError && <p role="alert" className="mb-4 text-sm text-state-danger print:hidden">Không thể đăng xuất. Vui lòng thử lại.</p>}
      {children}
    </main>
  </div>;
}
