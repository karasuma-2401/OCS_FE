import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ArrowUpRight, CircleUserRound, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import '@/pages/HomePage.css';

const links = [
  { to: '/', label: 'Trang chủ', end: true },
  { to: '/catalog', label: 'Khám phá', end: false },
  { to: '/consign', label: 'Cách ký gửi', end: false },
];

export function Navbar() {
  const { user, isAuthenticated, isStaffOrAdmin, hasRole, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError(false);
    try { await logout(); setMenuOpen(false); navigate('/'); } catch { setLogoutError(true); } finally { setLoggingOut(false); }
  }

  return (
    <header className="landing-header">
      <div className="landing-header__inner">
        <Link className="landing-logo" to="/" aria-label="OCS - Trang chủ" onClick={() => setMenuOpen(false)}>ocs<span>.</span></Link>
        <nav className="landing-nav" aria-label="Điều hướng chính">
          {links.map((link) => <NavLink key={link.to} to={link.to} end={link.end}>{link.label}</NavLink>)}
          {isStaffOrAdmin && <><Link to="/admin/pos">Web POS</Link><Link to="/admin/products">Kho hàng</Link></>}
        </nav>
        <div className="landing-header__actions">
          {isAuthenticated ? <>
            <span className="landing-user"><CircleUserRound size={16} aria-hidden="true" /> {user?.fullName || user?.email}</span>
            {isStaffOrAdmin && <Link className="landing-header__login landing-header__management" to="/admin">Quản lý</Link>}
            <button type="button" className="landing-header__login" onClick={handleLogout} disabled={loggingOut}><LogOut size={15} aria-hidden="true" /> {loggingOut ? 'Đang thoát...' : 'Đăng xuất'}</button>
          </> : <Link className="landing-header__login" to="/login">Đăng nhập</Link>}
          <Link to="/consign" className="landing-button landing-button--small">Tìm hiểu ký gửi <ArrowUpRight size={15} aria-hidden="true" /></Link>
          <button type="button" className="landing-menu-toggle" aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={menuOpen} aria-controls="customer-mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {menuOpen && <nav id="customer-mobile-menu" className="landing-mobile-nav" aria-label="Điều hướng di động">
        {links.map((link) => <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setMenuOpen(false)}>{link.label}</NavLink>)}
        {isStaffOrAdmin && <><Link to="/admin/pos" onClick={() => setMenuOpen(false)}>Web POS</Link><Link to="/admin/products" onClick={() => setMenuOpen(false)}>Kho hàng</Link>{(hasRole('Admin') || hasRole('Manager')) && <Link to="/admin" onClick={() => setMenuOpen(false)}>Quản lý</Link>}</>}
      </nav>}
      {logoutError && <p className="landing-header__error" role="alert">Không thể đăng xuất. Vui lòng thử lại.</p>}
    </header>
  );
}
