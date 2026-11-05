import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ClothingRailHero from '@/components/ui/product-rail-gallery';
import { railProducts } from '@/data/railProducts';

export default function ProductRailPreviewPage() {
  return (
    <main data-rail-demo className="relative flex min-h-svh w-full items-center justify-center bg-paper text-ink">
      <Link to="/ui-components" className="absolute left-4 top-4 z-20 rounded-full px-3 py-2 text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent">← UI Kit</Link>
      <ClothingRailHero
        items={railProducts}
        hanger="wood"
        eyebrow="THE OCS EDIT"
        heading="Mỗi món đồ, một câu chuyện mới."
        caption="Chạm hoặc di chuyển qua từng món đồ để khám phá."
        labels={{ front: 'Mặt trước', back: 'Mặt sau', close: 'Đóng', show: 'Xem' }}
        autoplay
        action={<Link to="/catalog" className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper">Khám phá danh mục <ArrowRight size={16} aria-hidden="true" /></Link>}
      />
    </main>
  );
}
