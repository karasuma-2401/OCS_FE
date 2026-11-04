import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import './CustomerPages.css';

export function UnauthorizedPage() {
  const { user } = useAuth();
  return <div className="customer-state landing-container"><div className="customer-state__card"><div className="customer-state__icon"><ShieldAlert size={27} aria-hidden="true" /></div><span className="landing-eyebrow">403 / TRUY CẬP</span><h1>Chưa thể truy cập.</h1><p>Tài khoản {user?.email || 'của bạn'} không có quyền truy cập vào trang này.</p><p className="customer-state__detail">Vai trò hiện tại: {user?.roles?.join(', ') || 'Chưa phân quyền'}</p><Link to="/" className="landing-button"><ArrowLeft size={16} aria-hidden="true" /> Về trang chủ</Link></div></div>;
}
