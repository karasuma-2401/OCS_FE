import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import streetStyle from '@/assets/images/auth-street-style.jpg';
import pinkStyle from '@/assets/images/auth-pink-style.jpg';
import cityStyle from '@/assets/images/auth-city-style.jpg';
import boutiqueStyle from '@/assets/images/auth-boutique-style.jpg';
import friendsStyle from '@/assets/images/auth-friends-style.jpg';
import './AuthLayout.css';

const slides = [
  { image: streetStyle, label: 'Phong cách dạo phố', title: ['Chọn điều bạn thích.', 'Mặc theo cách của bạn.'], caption: 'YOUR STYLE, YOUR STORY.' },
  { image: pinkStyle, label: 'Phong cách thường ngày', title: ['Thoải mái là chính.', 'Tự tin là bạn.'], caption: 'MADE FOR EVERYDAY.' },
  { image: cityStyle, label: 'Phong cách năng động', title: ['Sẵn sàng xuống phố.', 'Sẵn sàng là chính mình.'], caption: 'GOOD STYLE GOES AROUND.' },
  { image: boutiqueStyle, label: 'Khám phá đồ secondhand', title: ['Một chút tìm kiếm.', 'Một món đồ thật hợp.'], caption: 'FIND YOUR NEXT FAVORITE.' },
  { image: friendsStyle, label: 'Thời trang cùng bạn bè', title: ['Chuyện vui cùng bạn.', 'Phong cách theo mình.'], caption: 'BETTER TOGETHER.' },
];

export function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dialogRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const previousPath = useRef(location.pathname);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(media.matches);
    media.addEventListener('change', updatePreference);
    return () => media.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (isHovered || prefersReducedMotion) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActiveSlide((current) => (current + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [isHovered, prefersReducedMotion]);

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true });
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') navigate('/');
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  useLayoutEffect(() => {
    const authPaths = ['/login', '/register'];
    if (authPaths.includes(previousPath.current) && authPaths.includes(location.pathname) && previousPath.current !== location.pathname) {
      if (overlayRef.current) overlayRef.current.scrollTop = 0;
      if (viewRef.current) viewRef.current.scrollTop = 0;
      viewRef.current?.focus({ preventScroll: true });
    }
    previousPath.current = location.pathname;
  }, [location.pathname]);

  return (
    <div className="auth-layout">
      <div className="auth-background" aria-hidden="true" inert><HomePage /></div>
      <div ref={overlayRef} className="auth-overlay">
        <main ref={dialogRef} className="auth-dialog" role="dialog" aria-modal="true" aria-label="Tài khoản OCS" tabIndex={-1}>
          <section className="auth-visual" aria-label="Cảm hứng thời trang" aria-roledescription="carousel" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            {slides.map((slide, index) => (
              <img key={slide.image} src={slide.image} alt="" aria-hidden="true" className={`auth-visual__image${index === activeSlide ? ' is-active' : ''}`} />
            ))}
            <div className="auth-carousel__controls" aria-hidden="true">
              <div className="auth-carousel__indicators">
                {slides.map((slide, index) => (
                  <span key={slide.label} className={`auth-carousel__indicator${index === activeSlide ? ' is-active' : ''}`} />
                ))}
              </div>
            </div>
            {slides.map((slide, index) => (
              <div key={slide.label} className={`auth-visual__content${index === activeSlide ? ' is-active' : ''}`} aria-hidden={index !== activeSlide}>
                <p>{slide.title[0]}<br />{slide.title[1]}</p><small>{slide.caption}</small>
              </div>
            ))}
          </section>
          <section className="auth-panel" aria-label="Biểu mẫu tài khoản">
            <div className="auth-panel__top"><Link className="auth-wordmark" to="/">ocs<span>.</span></Link><Link to="/" className="auth-close" aria-label="Đóng và về trang chủ"><X size={19} /></Link></div>
            <div key={location.pathname} ref={viewRef} className={`auth-panel__view${location.pathname === '/register' ? ' auth-panel__view--register' : ''}`} tabIndex={-1}>
              <div className="auth-panel__view-content"><Outlet /></div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
