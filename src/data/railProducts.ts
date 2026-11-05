import type { RailGarment } from '@/components/ui/product-rail-gallery';
import denimJacket from '@/assets/images/rail-denim-jacket.png';
import denimJacketSide from '@/assets/images/rail-denim-jacket-side.png';
import creamShirt from '@/assets/images/rail-cream-shirt.png';
import creamShirtSide from '@/assets/images/rail-cream-shirt-side.png';
import oliveCardigan from '@/assets/images/rail-olive-cardigan.png';
import oliveCardiganSide from '@/assets/images/rail-olive-cardigan-side.png';
import roseSweatshirt from '@/assets/images/rail-rose-sweatshirt.png';
import roseSweatshirtSide from '@/assets/images/rail-rose-sweatshirt-side.png';
import blueShirt from '@/assets/images/rail-blue-shirt.png';
import blueShirtSide from '@/assets/images/rail-blue-shirt-side.png';
import creamTee from '@/assets/images/rail-cream-tee.png';
import creamTeeSide from '@/assets/images/rail-cream-tee-side.png';
import burgundyKnit from '@/assets/images/rail-burgundy-knit.png';
import burgundyKnitSide from '@/assets/images/rail-burgundy-knit-side.png';
import brownJacket from '@/assets/images/rail-brown-jacket.png';
import brownJacketSide from '@/assets/images/rail-brown-jacket-side.png';
import sandCoat from '@/assets/images/rail-sand-coat.png';
import sandCoatSide from '@/assets/images/rail-sand-coat-side.png';

// Concept images for the landing page, not live inventory.
export const railProducts: RailGarment[] = [
  { id: 'denim-jacket', name: 'Áo khoác denim', kind: 'jacket', color: '#7390a1', image: denimJacket, sideImage: denimJacketSide, description: 'Một chút cổ điển cho những ngày bạn muốn mặc thật thoải mái.', details: ['Denim', 'Dáng thoải mái'] },
  { id: 'cream-shirt', name: 'Áo sơ mi màu kem', kind: 'shirt', color: '#e4d9c7', image: creamShirt, sideImage: creamShirtSide, description: 'Dễ kết hợp, nhẹ nhàng và phù hợp với nhiều dịp.', details: ['Sơ mi', 'Màu kem'] },
  { id: 'olive-cardigan', name: 'Áo cardigan xanh olive', kind: 'knit', color: '#899071', image: oliveCardigan, sideImage: oliveCardiganSide, description: 'Một lớp áo mềm mại cho những ngày cần thêm chút ấm áp.', details: ['Áo len', 'Xanh olive'] },
  { id: 'rose-sweatshirt', name: 'Áo sweatshirt hồng đất', kind: 'knit', color: '#c9989b', image: roseSweatshirt, sideImage: roseSweatshirtSide, description: 'Phom dáng thư giãn với sắc màu dịu dàng.', details: ['Sweatshirt', 'Hồng đất'] },
  { id: 'blue-shirt', name: 'Áo sơ mi xanh nhạt', kind: 'shirt', color: '#a8c3d0', image: blueShirt, sideImage: blueShirtSide, flipSideImage: true, description: 'Một chiếc sơ mi nhẹ nhàng cho phong cách thường ngày.', details: ['Sơ mi', 'Xanh nhạt'] },
  { id: 'cream-tee', name: 'Áo thun trắng kem', kind: 'tee', color: '#eee9de', image: creamTee, sideImage: creamTeeSide, description: 'Một lựa chọn đơn giản và dễ mặc mỗi ngày.', details: ['Áo thun', 'Trắng kem'] },
  { id: 'burgundy-knit', name: 'Áo len đỏ rượu', kind: 'knit', color: '#6f1e30', image: burgundyKnit, sideImage: burgundyKnitSide, description: 'Sắc đỏ trầm và chất len mềm cho những ngày se lạnh.', details: ['Áo len', 'Đỏ rượu'] },
  { id: 'brown-jacket', name: 'Áo khoác nhung nâu', kind: 'jacket', color: '#76543f', image: brownJacket, sideImage: brownJacketSide, description: 'Chất liệu nhung tăm mang chút ấm áp và nét cổ điển.', details: ['Nhung tăm', 'Nâu'] },
  { id: 'sand-coat', name: 'Áo trench coat màu be', kind: 'coat', color: '#c4ae91', image: sandCoat, sideImage: sandCoatSide, flipSideImage: true, description: 'Dáng áo khoác dài cổ điển với đai thắt eo.', details: ['Trench coat', 'Màu be'] },
];
