import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ClothingRailHero from '@/components/ui/product-rail-gallery';
import { railProducts } from '@/data/railProducts';

export default function LandingRail() {
  return (
    <div className="landing-rail mb-20 overflow-hidden rounded-xl bg-paper landing-container mx-auto w-[min(calc(100%_-_5rem),1320px)] max-[850px]:w-[min(calc(100%_-_2.5rem),1320px)]">
      <ClothingRailHero
        items={railProducts}
        hanger="wood"
        eyebrow="THE OCS EDIT"
        heading="Mỗi món đồ, một câu chuyện mới."
        caption="Chạm hoặc di chuyển qua từng món đồ để khám phá."
        labels={{ front: 'Mặt trước', back: 'Mặt sau', close: 'Đóng', show: 'Xem' }}
        autoplay
        action={<Link to="/catalog" className={`
          landing-button inline-flex min-h-12 items-center justify-center gap-4 rounded-[7px] bg-button-pastel px-5
          py-[.8rem] text-[.8rem] font-bold text-[#332832] transition-[background,transform] duration-200
          hover:-translate-y-px hover:bg-button-pastel-hover
        `}>Khám phá danh mục <ArrowRight size={17} aria-hidden="true" /></Link>}
      />
    </div>
  );
}
