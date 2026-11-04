import { ArrowDownRight, ArrowRight, ArrowUpRight, CircleUserRound, LogOut, Recycle, Shirt, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import fashionHero from '@/assets/images/fashion-campaign.jpg';
import './HomePage.css';

export function HomePage() {
  const { isAuthenticated, isStaffOrAdmin, user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError(false);
    try { await logout(); } catch { setLogoutError(true); } finally { setLoggingOut(false); }
  }

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-header__inner">
          <Link className="landing-logo" to="/" aria-label="OCS - Trang chủ">ocs<span>.</span></Link>
          <nav className="landing-nav" aria-label="Điều hướng chính">
            <Link to="/">Trang chủ</Link><Link to="/catalog">Khám phá</Link><Link to="/consign">Cách ký gửi</Link>
          </nav>
          <div className="landing-header__actions">
            {isAuthenticated ? <>
              <span className="landing-user"><CircleUserRound size={16} aria-hidden="true" /> {user?.fullName || user?.email}</span>
              {isStaffOrAdmin && <Link className="landing-header__login" to="/admin">Quản lý</Link>}
              <button className="landing-header__login" onClick={handleLogout} disabled={loggingOut}><LogOut size={15} aria-hidden="true" /> {loggingOut ? 'Đang thoát...' : 'Đăng xuất'}</button>
            </> : <Link className="landing-header__login" to="/login">Đăng nhập</Link>}
            <Link to="/consign" className="landing-button landing-button--small">Tìm hiểu ký gửi <ArrowUpRight size={15} aria-hidden="true" /></Link>
          </div>
        </div>
        {logoutError && <p className="landing-header__error" role="alert">Không thể đăng xuất. Vui lòng thử lại.</p>}
      </header>

      <main>
        <section className="landing-hero landing-container">
          <div className="landing-hero__copy">
            <span className="landing-eyebrow"><span /> SECONDHAND, FIRST CHOICE</span>
            <h1>Đồ đẹp.<br />Chuyện mới<span>.</span></h1>
            <p>Món đồ bạn từng yêu thích có thể bắt đầu một hành trình mới, cùng một người mới.</p>
            <div className="landing-hero__actions">
              <Link to="/catalog" className="landing-button">Khám phá sản phẩm <ArrowRight size={17} aria-hidden="true" /></Link>
              <Link to="/consign" className="landing-text-link">Tìm hiểu ký gửi <ArrowUpRight size={16} aria-hidden="true" /></Link>
            </div>
            <span className="landing-hero__note"><Recycle size={15} aria-hidden="true" /> Mặc theo cách của bạn, thêm một vòng đời mới.</span>
          </div>
          <div className="landing-hero__visual">
            <img src={fashionHero} alt="Thời trang thường ngày trong tông màu nhẹ nhàng" />
            <div className="landing-hero__visual-label"><span>THE OCS EDIT</span><ArrowDownRight size={18} aria-hidden="true" /></div>
          </div>
        </section>

        <section className="landing-discover landing-container" id="kham-pha">
          <div className="landing-section-heading"><div><span className="landing-eyebrow">EXPLORE OCS</span><h2>Mặc đẹp theo cách riêng.</h2></div><Link className="landing-text-link" to="/catalog">Xem danh mục <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
          <div className="landing-discover__grid">
            <Link className="landing-discover__card landing-discover__card--one" to="/catalog"><span className="landing-discover__number">01 / KHÁM PHÁ</span><Shirt size={31} strokeWidth={1.2} aria-hidden="true" /><div><h3>Tìm món đồ hợp bạn</h3><p>Những lựa chọn cho phong cách mỗi ngày.</p></div><ArrowUpRight className="landing-discover__arrow" size={19} aria-hidden="true" /></Link>
            <Link className="landing-discover__card landing-discover__card--two" to="/consign"><span className="landing-discover__number">02 / KÝ GỬI</span><Recycle size={31} strokeWidth={1.2} aria-hidden="true" /><div><h3>Trao đồ thêm hành trình</h3><p>Để những món đồ cũ tiếp tục được yêu thích.</p></div><ArrowUpRight className="landing-discover__arrow" size={19} aria-hidden="true" /></Link>
          </div>
        </section>

        <section className="landing-process landing-container" id="ky-gui">
          <div className="landing-process__intro"><span className="landing-eyebrow">HOW IT WORKS</span><h2>Ký gửi gọn gàng.<br />Bắt đầu thật dễ.</h2><Link to="/consign" className="landing-text-link">Tìm hiểu cách ký gửi <ArrowRight size={16} aria-hidden="true" /></Link></div>
          <div className="landing-process__steps"><div><span>01</span><h3>Chuẩn bị</h3><p>Chọn và làm sạch những món đồ bạn muốn ký gửi.</p></div><div><span>02</span><h3>Mang đến OCS</h3><p>Cùng cửa hàng kiểm tra và thỏa thuận thông tin.</p></div><div><span>03</span><h3>Theo dõi</h3><p>Theo dõi hành trình của những món đồ ký gửi.</p></div></div>
        </section>

        <section className="landing-banner landing-container"><div><span className="landing-eyebrow"><Sparkles size={14} aria-hidden="true" /> MỘT VÒNG ĐỜI MỚI</span><h2>Một lựa chọn nhỏ.<br />Thêm nhiều điều thú vị.</h2><p>Khám phá thời trang secondhand cùng OCS.</p></div><Link to="/catalog" className="landing-button">Khám phá ngay <ArrowUpRight size={16} aria-hidden="true" /></Link></section>
      </main>
      <footer className="landing-footer landing-container"><Link className="landing-logo" to="/">ocs<span>.</span></Link><p>Old Clothes Store · Thời trang cho những hành trình tiếp theo.</p><div><Link to="/catalog">Khám phá</Link><Link to="/consign">Ký gửi</Link></div><small>© {new Date().getFullYear()} OCS</small></footer>
    </div>
  );
}
