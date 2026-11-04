import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import denimJacket from '@/assets/images/demo-denim-jacket.jpg';
import retroShirt from '@/assets/images/demo-retro-shirt.jpg';
import straightJeans from '@/assets/images/demo-straight-jeans.jpg';
import './CustomerPages.css';

const sampleProducts = [
  { code: 'OCS-001', name: 'Áo khoác denim vintage', size: 'L', condition: '95%', price: '250.000 đ', status: 'Đang bán', image: denimJacket },
  { code: 'OCS-002', name: 'Áo thun retro graphic', size: 'M', condition: '90%', price: '120.000 đ', status: 'Đang bán', image: retroShirt },
  { code: 'OCS-003', name: 'Quần jean ống suông', size: '30', condition: '98%', price: '180.000 đ', status: 'Đang kiểm tra', image: straightJeans },
];

export function CatalogPage() {
  return (
    <div className="customer-page landing-container">
      <div className="customer-breadcrumb"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><span>Khám phá</span></div>
      <header className="customer-page__heading">
        <div><span className="landing-eyebrow"><span /> THE OCS COLLECTION</span><h1>Khám phá món đồ<br /><span>hợp với bạn.</span></h1><p>Những lựa chọn thú vị cho phong cách mỗi ngày.</p></div>
        <div className="customer-heading-note"><Sparkles size={18} aria-hidden="true" /><span>Chọn điều bạn thích.<br />Mặc theo cách của bạn.</span></div>
      </header>
      <section className="catalog-section" aria-labelledby="catalog-title">
        <div className="customer-section-heading"><div><span className="landing-eyebrow">THE OCS EDIT</span><h2 id="catalog-title">Một chút cảm hứng cho bạn.</h2></div><span className="catalog-demo-note">Sản phẩm và hình ảnh minh họa</span></div>
        <div className="catalog-grid">
          {sampleProducts.map((product) => <article className="product-card" key={product.code}>
            <div className="product-card__image"><img src={product.image} alt={`Ảnh minh họa ${product.name.toLowerCase()}`} /><span className="product-card__badge">Minh họa</span></div>
            <div className="product-card__details"><div className="product-card__title"><h3>{product.name}</h3><span className={product.status === 'Đang bán' ? 'product-status' : 'product-status product-status--muted'}>{product.status}</span></div><p>Size {product.size} <span aria-hidden="true">·</span> Tình trạng {product.condition}</p><div className="product-card__bottom"><strong>{product.price}</strong><span>{product.code}</span></div></div>
          </article>)}
        </div>
      </section>
      <section className="customer-cta"><div><span className="landing-eyebrow">CÙNG OCS</span><h2>Đồ đẹp cần một hành trình mới?</h2><p>Khám phá cách ký gửi cùng OCS.</p></div><Link to="/consign" className="landing-button">Tìm hiểu ký gửi <ArrowRight size={16} aria-hidden="true" /></Link></section>
    </div>
  );
}
