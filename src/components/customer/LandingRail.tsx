import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ClothingRailHero from '@/components/ui/product-rail-gallery';
import { railProducts } from '@/data/railProducts';

export default function LandingRail() {
  return (
    <div className="landing-rail landing-container">
      <ClothingRailHero
        items={railProducts}
        hanger="wood"
        eyebrow="THE OCS EDIT"
        heading="Mỗi món đồ, một câu chuyện mới."
        caption="Chạm hoặc di chuyển qua từng món đồ để khám phá."
        labels={{ front: 'Mặt trước', back: 'Mặt sau', close: 'Đóng', show: 'Xem' }}
        autoplay
        action={<Link to="/catalog" className="landing-button">Khám phá danh mục <ArrowRight size={17} aria-hidden="true" /></Link>}
      />
    </div>
  );
}
