import denimJacket from '@/assets/images/demo-denim-jacket.jpg';
import denimJacketSide from '@/assets/images/demo-denim-jacket-side.png';
import denimJacketBack from '@/assets/images/demo-denim-jacket-back.png';
import retroShirt from '@/assets/images/demo-retro-shirt.jpg';
import retroShirtSide from '@/assets/images/demo-retro-shirt-side.png';
import retroShirtBack from '@/assets/images/demo-retro-shirt-back.png';
import straightJeans from '@/assets/images/demo-straight-jeans.jpg';
import straightJeansSide from '@/assets/images/demo-straight-jeans-side.png';
import straightJeansBack from '@/assets/images/demo-straight-jeans-back.png';

export interface CatalogProduct {
  code: string;
  name: string;
  category: string;
  size: string;
  condition: string;
  price: number;
  status: 'Đang bán' | 'Đang kiểm tra';
  image: string;
  images?: { src: string; label: string }[];
  description: string;
}

// Dữ liệu minh họa cho đến khi API công khai cung cấp đầy đủ ảnh và thông tin sản phẩm.
export const catalogProducts: CatalogProduct[] = [
  { code: 'OCS-001', name: 'Áo khoác denim vintage', category: 'Áo khoác', size: 'L', condition: '95%', price: 250000, status: 'Đang bán', image: denimJacket, images: [{ src: denimJacket, label: 'Mặt trước' }, { src: denimJacketSide, label: 'Mặt bên' }, { src: denimJacketBack, label: 'Mặt sau' }], description: 'Một chiếc áo khoác denim mang cảm hứng cổ điển, dễ kết hợp cho những ngày thường.' },
  { code: 'OCS-002', name: 'Áo thun retro graphic', category: 'Áo thun', size: 'M', condition: '90%', price: 120000, status: 'Đang bán', image: retroShirt, images: [{ src: retroShirt, label: 'Mặt trước' }, { src: retroShirtSide, label: 'Mặt bên' }, { src: retroShirtBack, label: 'Mặt sau' }], description: 'Áo thun họa tiết retro, thêm một điểm nhấn cho trang phục hằng ngày.' },
  { code: 'OCS-003', name: 'Quần jean ống suông', category: 'Quần', size: '30', condition: '98%', price: 180000, status: 'Đang kiểm tra', image: straightJeans, images: [{ src: straightJeans, label: 'Mặt trước' }, { src: straightJeansSide, label: 'Mặt bên' }, { src: straightJeansBack, label: 'Mặt sau' }], description: 'Quần jean dáng suông với phong cách giản dị và dễ phối.' },
];

export const formatCatalogPrice = (price: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
