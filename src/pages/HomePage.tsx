import { ArrowDownRight, ArrowRight, ArrowUpRight, Recycle, Shirt, Sparkles } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CatalogProductCard } from '@/components/customer/CatalogProductCard';
import { LandingProcess } from '@/components/customer/LandingProcess';
import { getPublicProducts, type PublicProduct } from '@/api/products';
import fashionHero from '@/assets/images/fashion-campaign.jpg';
import './HomePage.css';
import './CustomerPages.css';

const LandingRail = lazy(() => import('@/components/customer/LandingRail'));

export function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<PublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    getPublicProducts({ page: 1, pageSize: 3, sort: 'newest' }, controller.signal)
      .then((res) => {
        setFeaturedProducts(res.items);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setError('Không thể tải danh sách sản phẩm nổi bật.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="landing">
      <Navbar />

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

        <Suspense fallback={<div className="landing-rail landing-rail--loading landing-container" aria-hidden="true" />}>
          <LandingRail />
        </Suspense>

        <section className="landing-featured landing-container" aria-labelledby="landing-featured-title">
          <div className="landing-section-heading">
            <div><span className="landing-eyebrow">THE OCS EDIT</span><h2 id="landing-featured-title">Một chút cảm hứng cho bạn.</h2><p>Những món đồ nhỏ, thêm nhiều cách thể hiện chính mình.</p></div>
            <Link className="landing-text-link" to="/catalog">Xem tất cả <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
          {isLoading ? (
            <div className="catalog-grid" aria-label="Đang tải sản phẩm nổi bật">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="catalog-skeleton-card">
                  <div className="catalog-skeleton-image" />
                  <div className="catalog-skeleton-line catalog-skeleton-line--short" />
                  <div className="catalog-skeleton-line catalog-skeleton-line--title" />
                  <div className="catalog-skeleton-line catalog-skeleton-line--price" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="catalog-error-state">
              <p>{error}</p>
              <Link to="/catalog" className="landing-button">Khám phá danh mục</Link>
            </div>
          ) : (
            <div className="catalog-grid">
              {featuredProducts.map((product) => (
                <CatalogProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        <LandingProcess />

        <section className="landing-banner landing-container"><div><span className="landing-eyebrow"><Sparkles size={14} aria-hidden="true" /> MỘT VÒNG ĐỜI MỚI</span><h2>Một lựa chọn nhỏ.<br />Thêm nhiều điều thú vị.</h2><p>Khám phá thời trang secondhand cùng OCS.</p></div><Link to="/catalog" className="landing-button">Khám phá ngay <ArrowUpRight size={16} aria-hidden="true" /></Link></section>
      </main>
      <Footer />
    </div>
  );
}
