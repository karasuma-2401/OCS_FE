import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ChevronDown, CircleUserRound, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { NotificationBell } from '@/components/shared/NotificationBell';
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
    <header className="landing-header border-b border-[#f0eaed] bg-white">
      <div className={`
        landing-header__inner mx-auto flex h-[78px] w-[min(calc(100%_-_5rem),1320px)] items-center
        justify-between gap-8 max-[850px]:w-[min(calc(100%_-_2.5rem),1320px)] max-[600px]:h-[68px]
        max-[600px]:gap-[.6rem]
      `}>
        <Link className="landing-logo text-[2rem] leading-none font-extrabold tracking-[-.09em] text-[#27242c] [&_span]:text-[#d988a5]" to="/" aria-label="OCS - Trang chủ" onClick={() => setMenuOpen(false)}>ocs<span>.</span></Link>
        <nav className={`
          landing-nav flex items-center gap-[clamp(1.2rem,2.5vw,2.5rem)] max-[850px]:hidden [&_a]:text-[.78rem]
          [&_a]:font-semibold [&_a]:text-[#514b54] [&_a:hover]:text-[#ae6580]
          [&_a[aria-current=page]]:text-[#ae6580]
        `} aria-label="Điều hướng chính">
          {visibleLinks.map((link) => <NavLink key={link.to} to={link.to} end={link.end}>{link.label}</NavLink>)}
          {hasPermission('screens.pos') && <Link to="/admin/pos">Web POS</Link>}
          {hasPermission('screens.inventory') && <Link to="/admin/products">Kho hàng</Link>}
        </nav>
        <div className="landing-header__actions flex items-center gap-[clamp(1.2rem,2.5vw,2.5rem)] max-[600px]:gap-[.8rem] max-[600px]:[&_.landing-button]:hidden">
          {isAuthenticated ? <>
            <NotificationBell />
            {managementPath && <Link className={`
              landing-header__login inline-flex cursor-pointer items-center gap-[.4rem] border-0 bg-transparent
              text-[.78rem] font-semibold text-[#514b54] hover:text-[#ae6580] disabled:opacity-60
              landing-header__management max-[600px]:hidden
            `} to={managementPath}>Quản lý</Link>}
            <div className="landing-account relative shrink-0" ref={accountRef} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAccountOpen(false); }}>
              <button ref={accountButtonRef} type="button" className={`
                landing-account__trigger inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[10px] border
                border-[#eee6e9] bg-white px-[.65rem] py-2 text-[.78rem] font-semibold text-[#514b54]
                hover:border-[#ead2dc] hover:bg-[#fbf3f6] aria-expanded:border-[#ead2dc] aria-expanded:bg-[#fbf3f6]
              `} aria-label={`Tài khoản ${user?.fullName || user?.email || ''}`} aria-expanded={accountOpen} aria-controls={accountMenuId} onClick={() => setAccountOpen((open) => !open)}>
                <CircleUserRound size={19} aria-hidden="true" />
                <span className="landing-account__name max-w-[130px] truncate whitespace-nowrap max-[600px]:hidden">{user?.fullName || user?.email}</span>
                <ChevronDown size={15} aria-hidden="true" className={accountOpen ? 'landing-account__chevron transition-transform duration-200 rotate-180' : 'landing-account__chevron transition-transform duration-200'} />
              </button>
              {accountOpen && <div id={accountMenuId} className="landing-account__menu absolute top-[calc(100%+.55rem)] right-0 z-[60] w-[210px] rounded-xl border border-[#eee6e9] bg-white p-[.4rem] shadow-[0_12px_32px_rgba(56,37,48,.13)]">
                <Link to="/profile" className={`
                  landing-account__item flex w-full cursor-pointer items-center gap-[.7rem] rounded-lg border-0
                  bg-transparent px-3 py-[.8rem] text-left text-[.8rem] font-semibold text-[#514b54] hover:bg-[#fbf3f6]
                  hover:text-[#ae6580] disabled:cursor-wait disabled:opacity-60
                `} onClick={() => setAccountOpen(false)}><CircleUserRound size={17} aria-hidden="true" /> Hồ sơ cá nhân</Link>
                <button type="button" className={`
                  landing-account__item flex w-full cursor-pointer items-center gap-[.7rem] rounded-lg border-0
                  bg-transparent px-3 py-[.8rem] text-left text-[.8rem] font-semibold text-[#514b54] hover:bg-[#fbf3f6]
                  hover:text-[#ae6580] disabled:cursor-wait disabled:opacity-60 landing-account__logout rounded-t-none
                  border-t border-[#f0eaed]
                `} onClick={handleLogout} disabled={loggingOut}><LogOut size={17} aria-hidden="true" /> {loggingOut ? 'Đang thoát...' : 'Đăng xuất'}</button>
              </div>}
            </div>
          </> : <Link className={`
            landing-header__login inline-flex cursor-pointer items-center gap-[.4rem] border-0 bg-transparent
            text-[.78rem] font-semibold text-[#514b54] hover:text-[#ae6580] disabled:opacity-60
          `} to="/login">Đăng nhập</Link>}
          <Link to="/consign" className={`
            landing-button inline-flex min-h-12 items-center justify-center gap-4 rounded-[7px] bg-button-pastel px-5
            py-[.8rem] text-[.8rem] font-bold text-[#332832] transition-[background,transform] duration-200
            hover:-translate-y-px hover:bg-button-pastel-hover landing-button--small !min-h-10 !px-4 !py-[.65rem]
            !text-[.73rem]
          `}>Tìm hiểu ký gửi <ArrowUpRight size={15} aria-hidden="true" /></Link>
          <button type="button" className="landing-menu-toggle hidden size-[38px] cursor-pointer items-center justify-center rounded-lg border border-[#eee6e9] bg-white text-[#514b54] max-[850px]:inline-flex" aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={menuOpen} aria-controls="customer-mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {menuOpen && <nav id="customer-mobile-menu" className={`
        landing-mobile-nav mx-auto hidden w-[min(calc(100%_-_2.5rem),1320px)] gap-[.2rem] pb-4 max-[850px]:grid
        [&_a]:px-[.3rem] [&_a]:py-[.7rem] [&_a]:text-[.85rem] [&_a]:font-semibold [&_a]:text-[#514b54]
        [&_a[aria-current=page]]:text-[#ae6580]
      `} aria-label="Điều hướng di động">
        {visibleLinks.map((link) => <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setMenuOpen(false)}>{link.label}</NavLink>)}
        {hasPermission('screens.pos') && <Link to="/admin/pos" onClick={() => setMenuOpen(false)}>Web POS</Link>}
        {hasPermission('screens.inventory') && <Link to="/admin/products" onClick={() => setMenuOpen(false)}>Kho hàng</Link>}
        {managementPath && <Link to={managementPath} onClick={() => setMenuOpen(false)}>Quản lý</Link>}
      </nav>}
      {logoutError && <p className="landing-header__error pb-2 text-center text-[.8rem] text-[#a3223c]" role="alert">Không thể đăng xuất. Vui lòng thử lại.</p>}
    </header>
  );
}
