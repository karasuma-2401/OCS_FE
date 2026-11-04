import { ArrowRight, Check, PackageCheck, Recycle, Shirt } from 'lucide-react';
import { Link } from 'react-router-dom';
import './CustomerPages.css';

const steps = [
  { number: '01', title: 'Chọn và chuẩn bị', description: 'Chọn quần áo còn nguyên vẹn, đã giặt sạch, không rách hỏng hoặc ố màu.', icon: Shirt },
  { number: '02', title: 'Mang đồ đến OCS', description: 'Mang những món đồ bạn muốn ký gửi đến cửa hàng để được tiếp nhận.', icon: PackageCheck },
  { number: '03', title: 'Kiểm tra và thỏa thuận', description: 'Cùng cửa hàng kiểm tra tình trạng, thống nhất giá bán và thông tin ký gửi.', icon: Check },
  { number: '04', title: 'Theo dõi hành trình', description: 'Theo dõi tình trạng bán hàng và việc quyết toán các món đồ ký gửi.', icon: Recycle },
];

export function ConsignPage() {
  return (
    <div className="customer-page landing-container">
      <div className="customer-breadcrumb"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><span>Cách ký gửi</span></div>
      <header className="consign-hero"><div><span className="landing-eyebrow"><span /> HOW IT WORKS</span><h1>Ký gửi gọn gàng.<br /><span>Đồ đẹp tiếp tục hành trình.</span></h1><p>Bắt đầu từ những món đồ bạn từng yêu thích, cùng OCS tìm cho chúng một chủ nhân mới.</p><a className="landing-button" href="#cac-buoc">Khám phá các bước <ArrowRight size={16} aria-hidden="true" /></a></div><div className="consign-hero__art" aria-hidden="true"><div><Recycle size={58} strokeWidth={1} /><span>MORE LIFE<br />FOR EVERY LOOK.</span></div></div></header>
      <section id="cac-buoc" className="consign-steps" aria-labelledby="consign-title"><div className="customer-section-heading"><div><span className="landing-eyebrow">BẮT ĐẦU TỪ ĐÂY</span><h2 id="consign-title">Bốn bước thật đơn giản.</h2><p>Cùng xem hành trình của một món đồ tại OCS.</p></div></div><div className="consign-grid">{steps.map(({ number, title, description, icon: Icon }) => <article className="consign-step" key={number}><div className="consign-step__top"><span>{number}</span><Icon size={23} strokeWidth={1.5} aria-hidden="true" /></div><h3>{title}</h3><p>{description}</p></article>)}</div></section>
      <section className="consign-note"><div className="consign-note__icon"><Shirt size={28} strokeWidth={1.4} aria-hidden="true" /></div><div><span className="landing-eyebrow">CHUẨN BỊ TRƯỚC KHI KÝ GỬI</span><h2>Một chút chăm chút cho món đồ.</h2><p>Hãy chọn những món còn sạch đẹp và nguyên vẹn để sẵn sàng cho hành trình tiếp theo.</p></div></section>
      <section className="customer-cta"><div><span className="landing-eyebrow">KHÁM PHÁ THÊM</span><h2>Tìm cảm hứng cho tủ đồ của bạn.</h2><p>Khám phá những lựa chọn tại OCS.</p></div><Link to="/catalog" className="landing-button">Khám phá sản phẩm <ArrowRight size={16} aria-hidden="true" /></Link></section>
    </div>
  );
}
