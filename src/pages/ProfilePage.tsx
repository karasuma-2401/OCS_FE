import { CircleUserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function ProfilePage() {
  const { user } = useAuth();
  const fields = [
    { label: 'Họ và tên', value: user?.fullName },
    { label: 'Email', value: user?.email },
    { label: 'Số điện thoại', value: user?.phoneNumber },
    ...(user?.username ? [{ label: 'Tên đăng nhập', value: user.username }] : []),
  ];

  return (
    <div className="landing-container mx-auto w-[min(calc(100%_-_5rem),1320px)] max-[850px]:w-[min(calc(100%_-_2.5rem),1320px)] min-h-[60vh] py-10 sm:py-16">
      <Link to="/" className="landing-text-link inline-flex items-center gap-2 text-[.8rem] font-bold text-[#39333c] hover:text-[#ae6580]">← Trang chủ</Link>
      <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-brand-pink-light bg-white p-6 sm:p-10">
        <div className="flex items-center gap-4 border-b border-brand-pink-light pb-6">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-pink-surface text-brand-highlight"><CircleUserRound size={27} aria-hidden="true" /></span>
          <div><p className="text-xs font-semibold tracking-widest text-brand-highlight">TÀI KHOẢN CỦA BẠN</p><h1 className="mt-1 text-2xl font-bold text-brand-ink">Hồ sơ cá nhân</h1></div>
        </div>
        <dl className="mt-2 divide-y divide-brand-pink-light">
          {fields.map(({ label, value }) => <div key={label} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4"><dt className="text-sm text-text-muted">{label}</dt><dd className="break-words text-sm font-semibold text-brand-ink">{value || 'Chưa cập nhật'}</dd></div>)}
        </dl>
      </div>
    </div>
  );
}
