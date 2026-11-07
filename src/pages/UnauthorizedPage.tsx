import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function UnauthorizedPage() {
  const { user } = useAuth();
  return <div className={`
    customer-state grid min-h-[65vh] place-items-center py-16 [&_h1]:my-3
    [&_h1]:text-[clamp(2rem,4vw,2.7rem)] [&_h1]:font-bold [&_h1]:tracking-[-.05em] [&_h1]:text-[#302a32]
    [&_p]:text-[.85rem] [&_p]:leading-[1.7] [&_p]:text-[#8a8087] [&_.landing-button]:mt-7 landing-container
    mx-auto w-[min(calc(100%_-_5rem),1320px)] max-[850px]:w-[min(calc(100%_-_2.5rem),1320px)]
  `}><div className="customer-state__card w-[min(100%,480px)] rounded-[14px] border border-[#efe7eb] bg-white px-10 py-14 text-center"><div className="customer-state__icon mx-auto mb-6 grid size-[60px] shrink-0 place-items-center rounded-[15px] bg-[#f9edf1] text-[#b8738d]"><ShieldAlert size={27} aria-hidden="true" /></div><span className="landing-eyebrow inline-flex items-center gap-2 text-[.65rem] font-bold tracking-[.13em] text-[#9b7281] [&>span]:h-0.5 [&>span]:w-6 [&>span]:bg-[#dfa0b5]">403 / TRUY CẬP</span><h1>Chưa thể truy cập.</h1><p>Tài khoản {user?.email || 'của bạn'} không có quyền truy cập vào trang này.</p><p className="customer-state__detail !mt-2 !text-xs">Vai trò hiện tại: {user?.roles?.join(', ') || 'Chưa phân quyền'}</p><Link to="/" className={`
    landing-button inline-flex min-h-12 items-center justify-center gap-4 rounded-[7px] bg-button-pastel px-5
    py-[.8rem] text-[.8rem] font-bold text-[#332832] transition-[background,transform] duration-200
    hover:-translate-y-px hover:bg-button-pastel-hover
  `}><ArrowLeft size={16} aria-hidden="true" /> Về trang chủ</Link></div></div>;
}
