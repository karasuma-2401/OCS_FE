import { ArrowRight, Recycle, Shirt } from 'lucide-react';
import { Link } from 'react-router-dom';
import { consignmentSteps } from '@/data/consignmentSteps';

const questions = [
  { question: 'Mình cần chuẩn bị đồ như thế nào?', answer: 'Hãy chọn quần áo còn nguyên vẹn, đã giặt sạch, không rách hỏng hoặc ố màu trước khi mang đến cửa hàng.' },
  { question: 'Giá bán được xác định như thế nào?', answer: 'Bạn và cửa hàng sẽ cùng kiểm tra tình trạng món đồ và thống nhất giá bán khi tiếp nhận.' },
  { question: 'Mình có cần tài khoản để tìm hiểu trước không?', answer: 'Không cần. Bạn có thể xem hướng dẫn và khám phá sản phẩm trước khi đăng nhập.' },
  { question: 'Làm thế nào để đặt lịch ký gửi?', answer: 'Chọn “Đặt lịch ký gửi” để đến trang lịch hẹn. Nếu chưa đăng nhập, bạn sẽ được hướng dẫn đăng nhập trước khi tiếp tục.' },
];

export function ConsignPage() {
  return (
    <div className={`
      customer-page pt-8 pb-20 max-[600px]:pt-6 max-[600px]:pb-12 [&_h1]:mt-5 [&_h1]:mb-4
      [&_h1]:text-[clamp(2.8rem,5vw,5rem)] [&_h1]:leading-[1.05] [&_h1]:font-[750] [&_h1]:tracking-[-.065em]
      [&_h1]:text-[#29252d] [&_h1_span]:text-[#b97891] landing-container mx-auto
      w-[min(calc(100%_-_5rem),1320px)] max-[850px]:w-[min(calc(100%_-_2.5rem),1320px)]
    `}>
      <div className="customer-breadcrumb flex items-center gap-[.65rem] text-[.72rem] text-[#9c8e96] [&_a]:text-[#81747d] [&_a:hover]:text-[#ae6580]"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><span>Cách ký gửi</span></div>
      <header className={`
        consign-hero mt-10 grid min-h-[390px] grid-cols-[1.1fr_.9fr] overflow-hidden rounded-xl bg-[#f1e5e8]
        max-[850px]:grid-cols-[1fr_.65fr] max-[600px]:grid-cols-1 [&>div:first-child]:self-center
        [&>div:first-child]:px-[clamp(2rem,4vw,4rem)] [&>div:first-child]:py-16
        max-[600px]:[&>div:first-child]:px-7 max-[600px]:[&>div:first-child]:py-12
        [&_h1]:!text-[clamp(2.5rem,4.3vw,4.2rem)] [&_.landing-button]:mt-[1.7rem] [&>div>p]:max-w-[430px]
        [&>div>p]:text-[.9rem] [&>div>p]:leading-[1.8] [&>div>p]:text-[#817780]
      `}><div><span className="landing-eyebrow inline-flex items-center gap-2 text-[.65rem] font-bold tracking-[.13em] text-[#9b7281] [&>span]:h-0.5 [&>span]:w-6 [&>span]:bg-[#dfa0b5]"><span /> HOW IT WORKS</span><h1>Ký gửi gọn gàng.<br /><span>Đồ đẹp tiếp tục hành trình.</span></h1><p>Bắt đầu từ những món đồ bạn từng yêu thích, cùng OCS tìm cho chúng một chủ nhân mới.</p><a className={`
        landing-button inline-flex min-h-12 items-center justify-center gap-4 rounded-[7px] bg-button-pastel px-5
        py-[.8rem] text-[.8rem] font-bold text-[#332832] transition-[background,transform] duration-200
        hover:-translate-y-px hover:bg-button-pastel-hover
      `} href="#cac-buoc">Khám phá các bước <ArrowRight size={16} aria-hidden="true" /></a></div><div className={`
        consign-hero__art grid min-h-[300px] place-items-center bg-[#e9d6dc] max-[600px]:min-h-[180px]
        [&>div]:flex [&>div]:aspect-square [&>div]:w-[min(58%,250px)] [&>div]:flex-col [&>div]:items-center
        [&>div]:justify-center [&>div]:gap-6 [&>div]:rounded-full [&>div]:border
        [&>div]:border-[rgba(152,106,123,.35)] [&>div]:text-center [&>div]:text-[#a56f83]
        max-[600px]:[&>div]:w-[145px] max-[600px]:[&>div]:gap-2 [&_span]:text-[.63rem] [&_span]:leading-[1.6]
        [&_span]:font-bold [&_span]:tracking-[.13em] max-[600px]:[&_svg]:size-10
      `} aria-hidden="true"><div><Recycle size={58} strokeWidth={1} /><span>MORE LIFE<br />FOR EVERY LOOK.</span></div></div></header>
      <section id="cac-buoc" className="consign-steps py-20 max-[600px]:py-14" aria-labelledby="consign-title"><div className={`
        customer-section-heading mb-[1.7rem] flex items-end justify-between gap-4 max-[600px]:flex-col
        max-[600px]:items-start [&_h2]:!mt-[.65rem] [&_h2]:!text-[clamp(1.45rem,2.3vw,2rem)]
        [&_h2]:!tracking-[-.045em] [&_h2]:text-[#302a32] [&_p]:mt-[.55rem] [&_p]:text-[.8rem]
        [&_p]:text-[#8a8087]
      `}><div><span className="landing-eyebrow inline-flex items-center gap-2 text-[.65rem] font-bold tracking-[.13em] text-[#9b7281] [&>span]:h-0.5 [&>span]:w-6 [&>span]:bg-[#dfa0b5]">BẮT ĐẦU TỪ ĐÂY</span><h2 id="consign-title">Bốn bước thật đơn giản.</h2><p>Cùng xem hành trình của một món đồ tại OCS.</p></div></div><div className="consign-grid grid grid-cols-4 gap-4 max-[850px]:grid-cols-2 max-[600px]:gap-[.65rem]">{consignmentSteps.map(({ number, title, description, icon: Icon }) => <article className={`
        consign-step min-h-[210px] rounded-[10px] border border-[#efe7eb] bg-white p-6 max-[600px]:min-h-[190px]
        max-[600px]:p-[1.1rem] [&_h3]:text-[.9rem] [&_h3]:font-bold [&_h3]:text-[#3d333c] [&_p]:mt-[.6rem]
        [&_p]:text-xs [&_p]:leading-[1.7] [&_p]:text-[#90848b]
      `} key={number}><div className={`
        consign-step__top mb-10 flex items-center justify-between text-[#be8197] max-[600px]:mb-6 [&_span]:grid
        [&_span]:size-[34px] [&_span]:place-items-center [&_span]:rounded-full [&_span]:bg-[#f8ebef]
        [&_span]:text-[.68rem] [&_span]:font-bold
      `}><span>{number}</span><Icon size={23} strokeWidth={1.5} aria-hidden="true" /></div><h3>{title}</h3><p>{description}</p></article>)}</div></section>
      <section className={`
        consign-note mb-[4.5rem] flex items-center gap-6 rounded-xl border border-[#f0e8ec] bg-white px-10
        py-[2.2rem] max-[600px]:mb-12 max-[600px]:items-start max-[600px]:gap-4 max-[600px]:p-6
        [&_h2]:!mt-[.65rem] [&_h2]:!text-[clamp(1.45rem,2.3vw,2rem)] [&_h2]:!tracking-[-.045em]
        [&_h2]:text-[#302a32] [&_p]:mt-2 [&_p]:text-[.8rem] [&_p]:leading-[1.7] [&_p]:text-[#90848b]
      `}><div className="consign-note__icon grid size-[60px] shrink-0 place-items-center rounded-[15px] bg-[#f9edf1] text-[#b8738d] max-[600px]:size-11"><Shirt size={28} strokeWidth={1.4} aria-hidden="true" /></div><div><span className="landing-eyebrow inline-flex items-center gap-2 text-[.65rem] font-bold tracking-[.13em] text-[#9b7281] [&>span]:h-0.5 [&>span]:w-6 [&>span]:bg-[#dfa0b5]">CHUẨN BỊ TRƯỚC KHI KÝ GỬI</span><h2>Một chút chăm chút cho món đồ.</h2><p>Hãy chọn những món còn sạch đẹp và nguyên vẹn để sẵn sàng cho hành trình tiếp theo.</p></div></section>
      <section className={`
        consign-faq grid grid-cols-[.8fr_1.2fr] gap-[clamp(2rem,6vw,6rem)] pt-4 pb-20 max-[850px]:grid-cols-1
        max-[850px]:gap-8 max-[600px]:pb-12 [&_h2]:!mt-3 [&_h2]:!text-[clamp(1.6rem,2.6vw,2.25rem)]
        [&_h2]:!tracking-[-.045em] [&_h2]:text-[#302a32]
      `} aria-labelledby="consign-faq-title">
        <div className="consign-faq__intro [&_p]:mt-[.8rem] [&_p]:text-[.8rem] [&_p]:leading-[1.7] [&_p]:text-[#827880]"><span className="landing-eyebrow inline-flex items-center gap-2 text-[.65rem] font-bold tracking-[.13em] text-[#9b7281] [&>span]:h-0.5 [&>span]:w-6 [&>span]:bg-[#dfa0b5]">CÙNG BẠN BẮT ĐẦU</span><h2 id="consign-faq-title">Bạn đang thắc mắc?</h2><p>Một vài điều nhỏ để hành trình ký gửi của bạn dễ dàng hơn.</p></div>
        <div className={`
          consign-faq__list border-t border-[#e9dfe4] [&_details]:border-b [&_details]:border-[#e9dfe4]
          [&_summary]:flex [&_summary]:cursor-pointer [&_summary]:list-none [&_summary]:items-center
          [&_summary]:justify-between [&_summary]:gap-4 [&_summary]:py-[1.2rem] [&_summary]:text-[.85rem]
          [&_summary]:font-bold [&_summary]:text-[#40353d] [&_summary:focus-visible]:outline-2
          [&_summary:focus-visible]:outline-offset-[3px] [&_summary:focus-visible]:outline-[#bd6b8a]
          [&_summary::-webkit-details-marker]:hidden [&_summary_span]:text-xl [&_summary_span]:font-normal
          [&_summary_span]:text-[#b97891] [&_summary_span]:transition-transform [&_summary_span]:duration-200
          motion-reduce:[&_summary_span]:transition-none [&_details[open]_summary_span]:rotate-45
          [&_details_p]:pr-8 [&_details_p]:pb-[1.2rem] [&_details_p]:text-[.78rem] [&_details_p]:leading-[1.75]
          [&_details_p]:text-[#827880]
        `}>{questions.map(({ question, answer }) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
      </section>
      <section className={`
        consign-booking mb-4 flex items-center justify-between gap-8 rounded-xl border border-[#eee5e9] bg-white
        p-12 max-[600px]:flex-col max-[600px]:items-start max-[600px]:p-8 [&_h2]:!mt-3
        [&_h2]:!text-[clamp(1.6rem,2.6vw,2.25rem)] [&_h2]:!tracking-[-.045em] [&_h2]:text-[#302a32]
        [&_p]:mt-[.8rem] [&_p]:text-[.8rem] [&_p]:leading-[1.7] [&_p]:text-[#827880] [&_.landing-button]:shrink-0
      `}><div><span className="landing-eyebrow inline-flex items-center gap-2 text-[.65rem] font-bold tracking-[.13em] text-[#9b7281] [&>span]:h-0.5 [&>span]:w-6 [&>span]:bg-[#dfa0b5]">SẴN SÀNG BẮT ĐẦU?</span><h2>Trao món đồ thêm một hành trình.</h2><p>Chọn thời gian phù hợp để mang những món đồ bạn yêu thích đến OCS.</p></div><Link to="/appointments" className={`
        landing-button inline-flex min-h-12 items-center justify-center gap-4 rounded-[7px] bg-button-pastel px-5
        py-[.8rem] text-[.8rem] font-bold text-[#332832] transition-[background,transform] duration-200
        hover:-translate-y-px hover:bg-button-pastel-hover
      `}>Đặt lịch ký gửi <ArrowRight size={16} aria-hidden="true" /></Link></section>
      <section className={`
        customer-cta flex items-center justify-between gap-8 rounded-xl bg-[#f0e1e5] px-12 py-11
        max-[600px]:flex-col max-[600px]:items-start max-[600px]:p-8 [&_h2]:!mt-[.65rem]
        [&_h2]:!text-[clamp(1.45rem,2.3vw,2rem)] [&_h2]:!tracking-[-.045em] [&_h2]:text-[#302a32] [&_p]:mt-2
        [&_p]:text-[.8rem] [&_p]:text-[#8a7b83]
      `}><div><span className="landing-eyebrow inline-flex items-center gap-2 text-[.65rem] font-bold tracking-[.13em] text-[#9b7281] [&>span]:h-0.5 [&>span]:w-6 [&>span]:bg-[#dfa0b5]">KHÁM PHÁ THÊM</span><h2>Tìm cảm hứng cho tủ đồ của bạn.</h2><p>Khám phá những lựa chọn tại OCS.</p></div><Link to="/catalog" className={`
        landing-button inline-flex min-h-12 items-center justify-center gap-4 rounded-[7px] bg-button-pastel px-5
        py-[.8rem] text-[.8rem] font-bold text-[#332832] transition-[background,transform] duration-200
        hover:-translate-y-px hover:bg-button-pastel-hover
      `}>Khám phá sản phẩm <ArrowRight size={16} aria-hidden="true" /></Link></section>
    </div>
  );
}
