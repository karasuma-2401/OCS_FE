import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ChevronDown, CircleUserRound, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { NotificationBell } from '@/components/shared/NotificationBell';
import '@/pages/HomePage.css';
import { firstAllowedScreen } from '@/auth/permissions';

const links = [
  { to: '/', label: 'Trang chủ', end: true },
  { to: '/catalog', label: 'Khám phá', end: false },
  { to: '/consign', label: 'Cách ký gửi', end: false },
  { to: '/appointments', label: 'Lịch hẹn', end: false },
];

export function Navbar() {
  const { user, isAuthenticated, hasPermission, logout } = useAuth();
  const managementPath = firstAllowedScreen(user?.permissions ?? []);
  const visibleLinks = links.filter(link => link.to !== '/appointments' || !isAuthenticated
    || hasPermission('appointments.create') || hasPermission('appointments.own.read'));
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const accountMenuId = useId();

  useEffect(() => {
    if (!accountOpen) return;
    const handleOutside = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
        accountButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [accountOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError(false);
    try { await logout(); setMenuOpen(false); setAccountOpen(false); navigate('/'); } catch { setLogoutError(true); } finally { setLoggingOut(false); }
  }

  return (
    <header className="landing-header">
      <div className="landing-header__inner">
        <Link className="landing-logo" to="/" aria-label="OCS - Trang chủ" onClick={() => setMenuOpen(false)}>ocs<span>.</span></Link>
        <nav className="landing-nav" aria-label="Điều hướng chính">
          {visibleLinks.map((link) => <NavLink key={link.to} to={link.to} end={link.end}>{link.label}</NavLink>)}
          {hasPermission('screens.pos') && <Link to="/admin/pos">Web POS</Link>}
          {hasPermission('screens.inventory') && <Link to="/admin/products">Kho hàng</Link>}
        </nav>
        <div className="landing-header__actions">
          {isAuthenticated ? <>
            <NotificationBell />
            {managementPath && <Link className="landing-header__login landing-header__management" to={managementPath}>Quản lý</Link>}
            <div className="landing-account" ref={accountRef} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAccountOpen(false); }}>
              <button ref={accountButtonRef} type="button" className="landing-account__trigger" aria-label={`Tài khoản ${user?.fullName || user?.email || ''}`} aria-expanded={accountOpen} aria-controls={accountMenuId} onClick={() => setAccountOpen((open) => !open)}>
                <CircleUserRound size={19} aria-hidden="true" />
                <span className="landing-account__name">{user?.fullName || user?.email}</span>
                <ChevronDown size={15} aria-hidden="true" className={accountOpen ? 'landing-account__chevron is-open' : 'landing-account__chevron'} />
              </button>
              {accountOpen && <div id={accountMenuId} className="landing-account__menu">
                <Link to="/profile" className="landing-account__item" onClick={() => setAccountOpen(false)}><CircleUserRound size={17} aria-hidden="true" /> Hồ sơ cá nhân</Link>
                <button type="button" className="landing-account__item landing-account__logout" onClick={handleLogout} disabled={loggingOut}><LogOut size={17} aria-hidden="true" /> {loggingOut ? 'Đang thoát...' : 'Đăng xuất'}</button>
              </div>}
            </div>
          </> : <Link className="landing-header__login" to="/login">Đăng nhập</Link>}
          <Link to="/consign" className="landing-button landing-button--small">Tìm hiểu ký gửi <ArrowUpRight size={15} aria-hidden="true" /></Link>
          <button type="button" className="landing-menu-toggle" aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={menuOpen} aria-controls="customer-mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {menuOpen && <nav id="customer-mobile-menu" className="landing-mobile-nav" aria-label="Điều hướng di động">
        {visibleLinks.map((link) => <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setMenuOpen(false)}>{link.label}</NavLink>)}
        {hasPermission('screens.pos') && <Link to="/admin/pos" onClick={() => setMenuOpen(false)}>Web POS</Link>}
        {hasPermission('screens.inventory') && <Link to="/admin/products" onClick={() => setMenuOpen(false)}>Kho hàng</Link>}
        {managementPath && <Link to={managementPath} onClick={() => setMenuOpen(false)}>Quản lý</Link>}
      </nav>}
      {logoutError && <p className="landing-header__error" role="alert">Không thể đăng xuất. Vui lòng thử lại.</p>}
    </header>
  );
}
