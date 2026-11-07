import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import streetStyle from '@/assets/images/auth-street-style.jpg';
import pinkStyle from '@/assets/images/auth-pink-style.jpg';
import cityStyle from '@/assets/images/auth-city-style.jpg';
import boutiqueStyle from '@/assets/images/auth-boutique-style.jpg';
import friendsStyle from '@/assets/images/auth-friends-style.jpg';

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
    <div className="min-h-screen font-sans text-[#2d2930]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true" inert><HomePage /></div>
      <div ref={overlayRef} className="fixed inset-0 z-[100] flex overflow-y-auto bg-[rgba(38,33,39,.4)] p-8 max-[700px]:p-4 [@media(max-height:520px)]:p-2">
        <main ref={dialogRef} className={`
          relative m-auto grid max-h-[calc(100dvh-4rem)] min-h-[min(610px,calc(100dvh-4rem))] w-[min(100%,940px)]
          grid-cols-2 grid-rows-[minmax(0,1fr)] rounded-[15px] bg-white p-[9px]
          shadow-[0_24px_90px_rgba(30,21,28,.2)] outline-none max-[700px]:max-h-[calc(100dvh-2rem)]
          max-[700px]:min-h-0 max-[700px]:max-w-[480px] max-[700px]:grid-cols-1
          max-[700px]:grid-rows-[auto_minmax(0,1fr)] max-[700px]:p-0
          [@media(max-height:520px)]:max-h-[calc(100dvh-1rem)] [@media(max-height:520px)]:min-h-0
        `} role="dialog" aria-modal="true" aria-label="Tài khoản OCS" tabIndex={-1}>
          <section className={`
            relative min-h-full overflow-hidden rounded-[10px] bg-[#d5b6b8] after:pointer-events-none after:absolute
            after:inset-x-0 after:top-[35%] after:bottom-0 after:bg-gradient-to-b after:from-transparent
            after:to-[rgba(35,29,34,.58)] after:content-[''] max-[700px]:mx-[7px] max-[700px]:mt-[7px]
            max-[700px]:h-[clamp(110px,20dvh,160px)] max-[700px]:min-h-0
            [@media(max-width:700px)_and_(max-height:520px)]:h-[90px]
            motion-reduce:[&_*]:![transition-duration:0.01ms] motion-reduce:[&_*]:![animation-duration:0.01ms]
          `} aria-label="Cảm hứng thời trang" aria-roledescription="carousel" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            {slides.map((slide, index) => (
              <img key={slide.image} src={slide.image} alt="" aria-hidden="true" className={`absolute inset-0 size-full object-cover object-center transition-opacity duration-[450ms] ease-in-out max-[700px]:object-[center_30%] ${index === activeSlide ? 'opacity-100' : 'opacity-0'}`} />
            ))}
            <div className="absolute inset-x-[1.4rem] top-[1.4rem] z-[2] flex items-center justify-between gap-4 max-[700px]:inset-x-[.8rem] max-[700px]:top-[.7rem]" aria-hidden="true">
              <div className="flex items-center gap-[.45rem]">
                {slides.map((slide, index) => (
                  <span key={slide.label} className={`flex h-5 w-8 items-center before:h-[3px] before:w-full before:rounded-[3px] before:transition-colors before:duration-200 before:content-[''] ${index === activeSlide ? 'before:bg-white' : 'before:bg-white/55'}`} />
                ))}
              </div>
            </div>
            {slides.map((slide, index) => (
              <div key={slide.label} className={`pointer-events-none absolute inset-x-8 bottom-[2.3rem] z-[1] text-white transition-[opacity,transform] duration-[450ms] ease-in-out max-[700px]:inset-x-[1.1rem] max-[700px]:bottom-4 [@media(max-width:700px)_and_(max-height:520px)]:hidden ${index === activeSlide ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`} aria-hidden={index !== activeSlide}>
                <p className="my-4 text-[clamp(1.45rem,2.1vw,2rem)] leading-[1.2] font-[650] tracking-[-.04em] max-[700px]:my-[.45rem] max-[700px]:text-[1.2rem]">{slide.title[0]}<br />{slide.title[1]}</p><small className="text-[.62rem] font-bold tracking-[.13em] opacity-80 max-[700px]:hidden">{slide.caption}</small>
              </div>
            ))}
          </section>
          <section className={`
            relative flex min-h-0 min-w-0 flex-col px-[clamp(1.5rem,2.5vw,2.25rem)] py-8 max-[700px]:px-5
            [@media(max-height:520px)]:py-4 motion-reduce:[&_*]:![transition-duration:0.01ms]
            motion-reduce:[&_*]:![animation-duration:0.01ms] [&_a:focus-visible]:rounded-[3px]
            [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-[3px]
            [&_a:focus-visible]:outline-[#b35a80]
          `} aria-label="Biểu mẫu tài khoản">
            <div className="mb-[2.2rem] flex flex-none items-center justify-between max-[700px]:mb-8 [@media(max-height:520px)]:mb-4"><Link className="text-[1.7rem] leading-none font-extrabold tracking-[-.09em] text-[#29252c] no-underline" to="/">ocs<span className="text-[#d988a5]">.</span></Link><Link to="/" className="grid size-8 place-items-center rounded-full border border-[#eee8eb] text-[#756a70] hover:bg-[#f9f2f4] hover:text-[#3d3139]" aria-label="Đóng và về trang chủ"><X size={19} /></Link></div>
            <div key={location.pathname} ref={viewRef} className={`-mr-2 flex min-h-0 min-w-0 flex-[1_1_auto] flex-col overflow-y-auto overscroll-contain pr-2 outline-none [scrollbar-width:thin] [scrollbar-color:#d6b4c0_transparent] forced-colors:[scrollbar-color:auto] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#d6b4c0] [&::-webkit-scrollbar-thumb:hover]:bg-[#bd899c] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-button]:hidden ${location.pathname === '/register' ? '[--auth-view-offset:12px]' : ''}`} tabIndex={-1}>
              <div className="my-auto animate-auth-view-enter"><Outlet /></div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
