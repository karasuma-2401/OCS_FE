import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="landing-footer landing-container">
      <Link className="landing-logo" to="/" aria-label="OCS - Trang chủ">ocs<span>.</span></Link>
      <p>Old Clothes Store · Thời trang cho những hành trình tiếp theo.</p>
      <div><Link to="/catalog">Khám phá</Link><Link to="/consign">Ký gửi</Link></div>
      <small>© {new Date().getFullYear()} OCS</small>
    </footer>
  );
}
