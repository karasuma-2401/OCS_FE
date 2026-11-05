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
    <section ref={sectionRef} className="landing-process landing-container" id="ky-gui" aria-labelledby="landing-process-title" data-visible={visible ? 'true' : undefined}>
      <div className="landing-process__intro">
        <span className="landing-eyebrow">HOW IT WORKS</span>
        <h2 id="landing-process-title">Ký gửi gọn gàng.<br />Bắt đầu thật dễ.</h2>
        <Link to="/consign" className="landing-text-link">Tìm hiểu cách ký gửi <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <ol className="landing-process__steps">
        {consignmentSteps.map(({ number, title, description, icon: Icon }, index) => (
          <li key={number} className="landing-process__step" style={{ '--step-delay': `${index * 400}ms` } as CSSProperties}>
            {index < consignmentSteps.length - 1 && <span className="landing-process__line" aria-hidden="true" />}
            <div className="landing-process__marker" aria-hidden="true"><Icon size={19} strokeWidth={1.6} /><span>{number}</span></div>
            <div className="landing-process__copy"><h3>{title}</h3><p>{description}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}
