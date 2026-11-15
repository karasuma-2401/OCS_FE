import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import ShopNavBar from '@/components/layout/shop/ShopNavBar';
import { PageHeaderCard } from '@/components/shared/PageHeaderCard';
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
  activeItem?: ShopNavId;
  icon?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  const { user, logout, hasPermission, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const canManage = hasRole('Admin') || hasRole('Manager');
  const isManagement = canManage && location.pathname.startsWith('/shop/contracts') && location.pathname !== '/shop/contracts/new';
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const canOpen = (id: ShopNavId) => hasPermission(screenPermissions[id]) && (!screenRequirements[id] || hasPermission(screenRequirements[id]));
  return <div className="flex min-h-screen flex-col gap-4 bg-surface-dashboard px-3 pb-12 pt-[11px] lg:flex-row lg:items-start">
    <ShopNavBar activeItem={activeItem} showAccounts={canOpen('accounts')} allowedItems={screenOrder.filter(canOpen)}
      showContractManagement={canManage} contractsActive={isManagement} onContracts={() => navigate('/shop/contracts')}
      profileName={user?.fullName || user?.email || 'Nhân viên'} onNavigate={item => navigate(item.href)}
      onProfileClick={() => navigate('/profile')} onHome={() => navigate('/')} loggingOut={loggingOut}
      onLogout={async () => { setLoggingOut(true); setLogoutError(false); try { await logout(); navigate('/'); } catch { setLogoutError(true); } finally { setLoggingOut(false); } }} />
    <main className={`mx-auto w-full max-w-7xl min-w-0 flex-1 p-6 text-text-primary ${wide ? '!max-w-none' : ''}`}>
      {backTo && (
        <div className="mb-4">
          <Link to={backTo} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-highlight hover:underline">
            ← {backLabel}
          </Link>
        </div>
      )}
      {title && (
        <div className="mb-6">
          <PageHeaderCard
            icon={icon ?? <FileText size={22} aria-hidden="true" />}
            title={title}
            description={description ?? ''}
            actions={headerActions}
          />
        </div>
      )}
      {logoutError && <p role="alert" className="mb-4 text-sm text-state-danger">Không thể đăng xuất. Vui lòng thử lại.</p>}
      {children}
    </main>
  </div>;
}
