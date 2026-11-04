import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import './CustomerPages.css';

export function NotFoundPage() {
  return <div className="customer-state landing-container"><div className="customer-state__card"><div className="customer-state__icon"><Compass size={27} aria-hidden="true" /></div><span className="landing-eyebrow">404 / KHÔNG TÌM THẤY</span><h1>Trang này đi đâu rồi?</h1><p>Đường dẫn bạn tìm không tồn tại hoặc đã được chuyển sang địa chỉ khác.</p><Link to="/" className="landing-button"><ArrowLeft size={16} aria-hidden="true" /> Về trang chủ</Link></div></div>;
}
