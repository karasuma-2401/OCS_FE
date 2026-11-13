import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ShopNavBar from '@/components/layout/shop/ShopNavBar';
import { useAuth } from '@/context/AuthContext';
import { screenOrder, screenPermissions, screenRequirements, type ShopNavId } from '@/auth/permissions';

export function ContractPageLayout({ title, description, backTo, backLabel = 'Quay lại', wide = false, children }: {
  title: string; description?: string; backTo?: string; backLabel?: string; wide?: boolean; children: ReactNode;
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
    <ShopNavBar activeItem="consignment" showAccounts={canOpen('accounts')} allowedItems={screenOrder.filter(canOpen)}
      showContractManagement={canManage} contractsActive={isManagement} onContracts={() => navigate('/shop/contracts')}
      profileName={user?.fullName || user?.email || 'Nhân viên'} onNavigate={item => navigate(item.href)}
      onProfileClick={() => navigate('/profile')} onHome={() => navigate('/')} loggingOut={loggingOut}
      onLogout={async () => { setLoggingOut(true); setLogoutError(false); try { await logout(); navigate('/'); } catch { setLogoutError(true); } finally { setLoggingOut(false); } }} />
    <main className={`mx-auto w-full min-w-0 flex-1 px-2 py-6 text-text-primary sm:px-6 ${wide ? 'max-w-none' : 'max-w-7xl'}`}>
      {backTo && <Link to={backTo} className="text-sm font-semibold text-brand-highlight hover:underline">← {backLabel}</Link>}
      <header className={`mb-6 ${backTo ? 'mt-4' : ''}`}><h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">{title}</h1>{description && <p className="mt-2 text-sm text-muted">{description}</p>}</header>
      {logoutError && <p role="alert" className="mb-4 text-sm text-state-danger">Không thể đăng xuất. Vui lòng thử lại.</p>}
      {children}
    </main>
  </div>;
}
