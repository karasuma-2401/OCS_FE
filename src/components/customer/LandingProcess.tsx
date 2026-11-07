import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { consignmentSteps } from '@/data/consignmentSteps';

export function LandingProcess() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (!('IntersectionObserver' in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.2 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={`
      landing-process group/process grid grid-cols-[minmax(210px,.7fr)_minmax(0,2fr)]
      gap-[clamp(2rem,4vw,4rem)] border-t border-[#e9e3e6] py-[4.5rem] max-[850px]:grid-cols-1
      max-[850px]:gap-8 max-[600px]:py-12 [&_h3]:m-0 [&_h3]:text-[.95rem] [&_h3]:font-bold [&_p]:mt-[.45rem]
      [&_p]:text-[.77rem] [&_p]:leading-[1.6] [&_p]:text-[#827880] landing-container mx-auto
      w-[min(calc(100%_-_5rem),1320px)] max-[850px]:w-[min(calc(100%_-_2.5rem),1320px)]
    `} id="ky-gui" aria-labelledby="landing-process-title" data-visible={visible ? 'true' : undefined}>
      <div className="landing-process__intro [&_.landing-text-link]:mt-7">
        <span className="landing-eyebrow inline-flex items-center gap-2 text-[.65rem] font-bold tracking-[.13em] text-[#9b7281] [&>span]:h-0.5 [&>span]:w-6 [&>span]:bg-[#dfa0b5]">HOW IT WORKS</span>
        <h2 id="landing-process-title">Ký gửi gọn gàng.<br />Bắt đầu thật dễ.</h2>
        <Link to="/consign" className="landing-text-link inline-flex items-center gap-2 text-[.8rem] font-bold text-[#39333c] hover:text-[#ae6580]">Tìm hiểu cách ký gửi <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <ol className={`
        landing-process__steps m-0 grid list-none grid-cols-4 items-start gap-5 p-0 max-[600px]:grid-cols-1
        max-[600px]:gap-[1.2rem] max-[600px]:[&_h3]:text-[.82rem] max-[600px]:[&_p]:text-[.7rem]
      `}>
        {consignmentSteps.map(({ number, title, description, icon: Icon }, index) => (
          <li key={number} className="landing-process__step relative min-w-0 max-[600px]:grid max-[600px]:grid-cols-[44px_minmax(0,1fr)] max-[600px]:gap-[1.1rem]" style={{ '--step-delay': `${index * 400}ms` } as CSSProperties}>
            {index < consignmentSteps.length - 1 && <span className={`
              landing-process__line group-data-[visible=true]/process:after:animate-process-line
              group-data-[visible=true]/process:after:[animation-delay:calc(var(--step-delay)+180ms)]
              max-[600px]:group-data-[visible=true]/process:after:animate-process-line-down
              motion-reduce:after:!animate-none motion-reduce:after:!scale-100 absolute top-[21px] -right-5 left-11
              h-0.5 bg-[#eadce1] after:absolute after:inset-0 after:origin-left after:scale-x-0 after:bg-[#d994ae]
              max-[600px]:top-11 max-[600px]:right-auto max-[600px]:-bottom-[1.2rem] max-[600px]:left-[21px]
              max-[600px]:h-auto max-[600px]:w-0.5 max-[600px]:after:origin-top max-[600px]:after:scale-x-100
              max-[600px]:after:scale-y-0
            `} aria-hidden="true" />}
            <div className={`
              landing-process__marker group-data-[visible=true]/process:animate-process-marker
              group-data-[visible=true]/process:[animation-delay:var(--step-delay)] motion-reduce:!animate-none
              relative z-[1] flex size-11 items-center justify-center rounded-full border border-[#ebcad5] bg-[#f8e8ee]
              text-[#aa6d84] [&_span]:absolute [&_span]:-right-2 [&_span]:-bottom-[5px] [&_span]:grid
              [&_span]:size-[21px] [&_span]:place-items-center [&_span]:rounded-full [&_span]:border-2
              [&_span]:border-[#f9f7f8] [&_span]:bg-[#dca4b7] [&_span]:text-[.54rem] [&_span]:font-bold
              [&_span]:text-white
            `} aria-hidden="true"><Icon size={19} strokeWidth={1.6} /><span>{number}</span></div>
            <div className="landing-process__copy mt-5 pr-[.3rem] max-[600px]:mt-[.15rem] max-[600px]:pr-0 max-[600px]:pb-2"><h3>{title}</h3><p>{description}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}
