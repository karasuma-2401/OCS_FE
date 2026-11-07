import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className={`
      landing-footer flex items-center gap-8 py-14 text-[.73rem] text-[#8c8188] max-[600px]:flex-wrap
      max-[600px]:gap-4 max-[600px]:py-10 [&>p]:flex-1 max-[600px]:[&>p]:basis-[70%] [&>div]:flex [&>div]:gap-6
      [&>div_a]:text-[#625963] [&_small]:text-[.7rem] landing-container mx-auto
      w-[min(calc(100%_-_5rem),1320px)] max-[850px]:w-[min(calc(100%_-_2.5rem),1320px)]
    `}>
      <Link className="landing-logo text-[2rem] leading-none font-extrabold tracking-[-.09em] text-[#27242c] [&_span]:text-[#d988a5]" to="/" aria-label="OCS - Trang chủ">ocs<span>.</span></Link>
      <p>Old Clothes Store · Thời trang cho những hành trình tiếp theo.</p>
      <div><Link to="/catalog">Khám phá</Link><Link to="/consign">Ký gửi</Link></div>
      <small>© {new Date().getFullYear()} OCS</small>
    </footer>
  );
}
