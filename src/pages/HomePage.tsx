import { ArrowDownRight, ArrowRight, ArrowUpRight, Recycle, Shirt, Sparkles } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CatalogProductCard } from '@/components/customer/CatalogProductCard';
import { ProductDetailModal } from '@/components/customer/ProductDetailModal';
import { LandingProcess } from '@/components/customer/LandingProcess';
import { SkeletonLoading } from '@/components/shared';
import { getPublicProducts, type PublicProduct } from '@/api/products';
import fashionHero from '@/assets/images/fashion-campaign.jpg';

const LandingRail = lazy(() => import('@/components/customer/LandingRail'));

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProductId = searchParams.get('product');

  const [featuredProducts, setFeaturedProducts] = useState<PublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function handleSelectProduct(product: PublicProduct) {
    const next = new URLSearchParams(searchParams);
    next.set('product', product.id);
    setSearchParams(next, { replace: true });
  }

  function handleCloseDetail() {
    const next = new URLSearchParams(searchParams);
    next.delete('product');
    setSearchParams(next, { replace: true });
  }

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    getPublicProducts({ page: 1, pageSize: 6, sort: 'newest' }, controller.signal)
      .then((res) => {
        // Ưu tiên hiển thị các sản phẩm có ảnh bìa đầy đủ trên trang chủ
        const withCover = res.items.filter((p) => Boolean(p.coverImageUrl));
        const withoutCover = res.items.filter((p) => !p.coverImageUrl);
        setFeaturedProducts([...withCover, ...withoutCover].slice(0, 3));
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
    <div className={`
      landing bg-[#f9f7f8] font-sans text-[#28252e] [&_a]:no-underline [&_a:focus-visible]:outline-2
      [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-[#bd6b8a]
      [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4
      [&_button:focus-visible]:outline-[#bd6b8a] [&_h2]:mt-3 [&_h2]:text-[clamp(1.7rem,2.8vw,2.55rem)]
      [&_h2]:leading-[1.16] [&_h2]:font-bold [&_h2]:tracking-[-.045em] motion-reduce:[&_*]:!duration-[0.01ms]
    `}>
      <Navbar />

      <main>
        <section className={`
          landing-hero grid min-h-[570px] grid-cols-[.82fr_1fr] items-stretch gap-[5%] pt-[30px]
          max-[850px]:min-h-0 max-[850px]:grid-cols-2 max-[850px]:gap-6 max-[600px]:flex max-[600px]:flex-col
          max-[600px]:pt-0 [&_h1]:mt-[1.7rem] [&_h1]:mb-[1.2rem] [&_h1]:text-[clamp(3.4rem,6.1vw,6.5rem)]
          [&_h1]:leading-[.98] [&_h1]:font-[750] [&_h1]:tracking-[-.07em]
          max-[600px]:[&_h1]:text-[clamp(3.4rem,14vw,5rem)] [&_h1_span]:text-[#df9db5] landing-container mx-auto
          w-[min(calc(100%_-_5rem),1320px)] max-[850px]:w-[min(calc(100%_-_2.5rem),1320px)]
        `}>
          <div className={`
            landing-hero__copy flex flex-col items-start justify-center py-16 pl-[5%] max-[850px]:pl-0
            max-[600px]:pt-[3.75rem] max-[600px]:pb-4 [&>p]:max-w-[345px] [&>p]:text-[.95rem] [&>p]:leading-[1.8]
            [&>p]:text-[#746d76]
          `}>
            <span className="landing-eyebrow inline-flex items-center gap-2 text-[.65rem] font-bold tracking-[.13em] text-[#9b7281] [&>span]:h-0.5 [&>span]:w-6 [&>span]:bg-[#dfa0b5]"><span /> SECONDHAND, FIRST CHOICE</span>
            <h1>Đồ đẹp.<br />Chuyện mới<span>.</span></h1>
            <p>Món đồ bạn từng yêu thích có thể bắt đầu một hành trình mới, cùng một người mới.</p>
            <div className="landing-hero__actions mt-8 flex flex-wrap items-center gap-[1.6rem]">
              <Link to="/catalog" className={`
                landing-button inline-flex min-h-12 items-center justify-center gap-4 rounded-[7px] bg-button-pastel px-5
                py-[.8rem] text-[.8rem] font-bold text-[#332832] transition-[background,transform] duration-200
                hover:-translate-y-px hover:bg-button-pastel-hover
              `}>Khám phá sản phẩm <ArrowRight size={17} aria-hidden="true" /></Link>
              <Link to="/consign" className="landing-text-link inline-flex items-center gap-2 text-[.8rem] font-bold text-[#39333c] hover:text-[#ae6580]">Tìm hiểu ký gửi <ArrowUpRight size={16} aria-hidden="true" /></Link>
            </div>
            <span className="landing-hero__note mt-16 inline-flex items-center gap-[.55rem] text-[.68rem] text-[#948790] max-[600px]:mt-8"><Recycle size={15} aria-hidden="true" /> Mặc theo cách của bạn, thêm một vòng đời mới.</span>
          </div>
          <div className={`
            landing-hero__visual relative min-h-[520px] overflow-hidden rounded-[125px_10px_10px_10px] bg-[#ead4d6]
            max-[850px]:min-h-[440px] max-[850px]:rounded-[80px_8px_8px_8px] max-[600px]:min-h-[380px]
            [&_img]:absolute [&_img]:inset-0 [&_img]:size-full [&_img]:object-cover [&_img]:object-top
          `}>
            <img src={fashionHero} alt="Thời trang thường ngày trong tông màu nhẹ nhàng" />
            <div className="landing-hero__visual-label absolute bottom-5 left-5 flex items-center gap-8 rounded bg-white/86 px-4 py-[.85rem] text-[.62rem] font-bold tracking-[.1em] text-[#4d4147]"><span>THE OCS EDIT</span><ArrowDownRight size={18} aria-hidden="true" /></div>
          </div>
        </section>

        <section className="landing-discover py-[90px] max-[600px]:py-16 landing-container mx-auto w-[min(calc(100%_-_5rem),1320px)] max-[850px]:w-[min(calc(100%_-_2.5rem),1320px)]" id="kham-pha">
          <div className="landing-section-heading mb-7 flex items-end justify-between gap-6 max-[600px]:flex-col max-[600px]:items-start"><div><span className="landing-eyebrow inline-flex items-center gap-2 text-[.65rem] font-bold tracking-[.13em] text-[#9b7281] [&>span]:h-0.5 [&>span]:w-6 [&>span]:bg-[#dfa0b5]">EXPLORE OCS</span><h2>Mặc đẹp theo cách riêng.</h2></div><Link className="landing-text-link inline-flex items-center gap-2 text-[.8rem] font-bold text-[#39333c] hover:text-[#ae6580]" to="/catalog">Xem danh mục <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
          <div className="landing-discover__grid grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
            <Link className={`
              landing-discover__card relative flex min-h-[220px] flex-col items-start justify-between gap-6
              rounded-[10px] p-6 text-[#504249] transition-transform duration-200 hover:-translate-y-[3px]
              max-[600px]:min-h-[190px] [&_h3]:m-0 [&_h3]:text-[.95rem] [&_h3]:font-bold [&_p]:mt-[.45rem]
              [&_p]:text-[.77rem] [&_p]:leading-[1.6] [&_p]:text-[#827880] landing-discover__card--one bg-[#f0e4e7]
            `} to="/catalog"><span className="landing-discover__number text-[.6rem] font-bold tracking-[.1em] text-[#947d86]">01 / KHÁM PHÁ</span><Shirt size={31} strokeWidth={1.2} aria-hidden="true" /><div><h3>Tìm món đồ hợp bạn</h3><p>Những lựa chọn cho phong cách mỗi ngày.</p></div><ArrowUpRight className="landing-discover__arrow absolute right-6 bottom-6" size={19} aria-hidden="true" /></Link>
            <Link className={`
              landing-discover__card relative flex min-h-[220px] flex-col items-start justify-between gap-6
              rounded-[10px] p-6 text-[#504249] transition-transform duration-200 hover:-translate-y-[3px]
              max-[600px]:min-h-[190px] [&_h3]:m-0 [&_h3]:text-[.95rem] [&_h3]:font-bold [&_p]:mt-[.45rem]
              [&_p]:text-[.77rem] [&_p]:leading-[1.6] [&_p]:text-[#827880] landing-discover__card--two bg-[#e9e7e6]
            `} to="/consign"><span className="landing-discover__number text-[.6rem] font-bold tracking-[.1em] text-[#947d86]">02 / KÝ GỬI</span><Recycle size={31} strokeWidth={1.2} aria-hidden="true" /><div><h3>Trao đồ thêm hành trình</h3><p>Để những món đồ cũ tiếp tục được yêu thích.</p></div><ArrowUpRight className="landing-discover__arrow absolute right-6 bottom-6" size={19} aria-hidden="true" /></Link>
          </div>
        </section>

        <Suspense fallback={<SkeletonLoading variant="rail" label="Đang tải bộ sưu tập..." className={`
          landing-rail mb-20 overflow-hidden rounded-xl bg-paper landing-rail--loading min-h-[32rem]
          landing-container mx-auto w-[min(calc(100%_-_5rem),1320px)]
          max-[850px]:w-[min(calc(100%_-_2.5rem),1320px)]
        `} />}>
          <LandingRail />
        </Suspense>

        <section className={`
          landing-featured pb-20 [&_.landing-section-heading]:mb-[.7rem] [&_.landing-section-heading_p]:mt-[.7rem]
          [&_.landing-section-heading_p]:text-[.8rem] [&_.landing-section-heading_p]:leading-[1.6]
          [&_.landing-section-heading_p]:text-[#827880] landing-container mx-auto w-[min(calc(100%_-_5rem),1320px)]
          max-[850px]:w-[min(calc(100%_-_2.5rem),1320px)]
        `} aria-labelledby="landing-featured-title">
          <div className="landing-section-heading mb-7 flex items-end justify-between gap-6 max-[600px]:flex-col max-[600px]:items-start">
            <div><span className="landing-eyebrow inline-flex items-center gap-2 text-[.65rem] font-bold tracking-[.13em] text-[#9b7281] [&>span]:h-0.5 [&>span]:w-6 [&>span]:bg-[#dfa0b5]">THE OCS EDIT</span><h2 id="landing-featured-title">Một chút cảm hứng cho bạn.</h2><p>Những món đồ nhỏ, thêm nhiều cách thể hiện chính mình.</p></div>
            <Link className="landing-text-link inline-flex items-center gap-2 text-[.8rem] font-bold text-[#39333c] hover:text-[#ae6580]" to="/catalog">Xem tất cả <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
          {isLoading ? (
            <SkeletonLoading variant="products" label="Đang tải sản phẩm nổi bật..." />
          ) : error ? (
            <div className={`
              catalog-error-state my-6 rounded-xl border border-[#f5d0d8] bg-[#fff8f9] px-6 py-12 text-center
              text-[#8e536a] [&_h3]:my-2 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-[#7a2e46] [&_p]:mb-4
              [&_p]:text-[.82rem] [&_p]:text-[#6a575f] [&_button]:cursor-pointer [&_button]:rounded-md
              [&_button]:border-0 [&_button]:bg-[#8e536a] [&_button]:px-[1.2rem] [&_button]:py-2
              [&_button]:text-[.8rem] [&_button]:font-semibold [&_button]:text-white [&_button:hover]:bg-[#733c51]
            `}>
              <p>{error}</p>
              <Link to="/catalog" className={`
                landing-button inline-flex min-h-12 items-center justify-center gap-4 rounded-[7px] bg-button-pastel px-5
                py-[.8rem] text-[.8rem] font-bold text-[#332832] transition-[background,transform] duration-200
                hover:-translate-y-px hover:bg-button-pastel-hover
              `}>Khám phá danh mục</Link>
            </div>
          ) : (
            <div className="catalog-grid grid grid-cols-3 gap-[1.15rem] max-[850px]:grid-cols-2 max-[600px]:gap-[.65rem]">
              {featuredProducts.map((product) => (
                <CatalogProductCard
                  key={product.id}
                  product={product}
                  onSelect={handleSelectProduct}
                />
              ))}
            </div>
          )}
        </section>

        <LandingProcess />

        <section className={`
          landing-banner flex min-h-[245px] items-center justify-between gap-8 rounded-[10px] bg-[#f0e1e5] px-16
          py-12 max-[600px]:flex-col max-[600px]:items-start max-[600px]:p-8 [&_p]:mt-3 [&_p]:text-[.82rem]
          [&_p]:text-[#7d7077] landing-container mx-auto w-[min(calc(100%_-_5rem),1320px)]
          max-[850px]:w-[min(calc(100%_-_2.5rem),1320px)]
        `}><div><span className="landing-eyebrow inline-flex items-center gap-2 text-[.65rem] font-bold tracking-[.13em] text-[#9b7281] [&>span]:h-0.5 [&>span]:w-6 [&>span]:bg-[#dfa0b5]"><Sparkles size={14} aria-hidden="true" /> MỘT VÒNG ĐỜI MỚI</span><h2>Một lựa chọn nhỏ.<br />Thêm nhiều điều thú vị.</h2><p>Khám phá thời trang secondhand cùng OCS.</p></div><Link to="/catalog" className={`
          landing-button inline-flex min-h-12 items-center justify-center gap-4 rounded-[7px] bg-button-pastel px-5
          py-[.8rem] text-[.8rem] font-bold text-[#332832] transition-[background,transform] duration-200
          hover:-translate-y-px hover:bg-button-pastel-hover
        `}>Khám phá ngay <ArrowUpRight size={16} aria-hidden="true" /></Link></section>
      </main>
      <Footer />

      <ProductDetailModal
        productId={selectedProductId}
        onClose={handleCloseDetail}
      />
    </div>
  );
}
