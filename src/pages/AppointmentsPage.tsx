import { useState } from 'react';
import { CalendarDays, History } from 'lucide-react';
import { ConsignBooking } from '@/components/customer/ConsignBooking';
import { MyBookings } from '@/components/customer/MyBookings';

export function AppointmentsPage() {
  const [tab, setTab] = useState<'book' | 'history'>('book');
  return (
    <div className="landing-container py-8">
      <h1 className="mb-5 text-2xl font-bold text-brand-ink">Lịch hẹn ký gửi</h1>
      <div className="mb-6 inline-flex gap-1 rounded-xl border border-brand-pink-light bg-white p-1" role="group" aria-label="Lịch hẹn ký gửi">
        <button type="button" aria-pressed={tab === 'book'} onClick={() => setTab('book')} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'book' ? 'bg-brand-pink-light text-brand-highlight' : 'text-text-secondary'}`}><CalendarDays size={16} /> Đặt lịch</button>
        <button type="button" aria-pressed={tab === 'history'} onClick={() => setTab('history')} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'history' ? 'bg-brand-pink-light text-brand-highlight' : 'text-text-secondary'}`}><History size={16} /> Lịch hẹn của tôi</button>
      </div>
      {tab === 'book' ? <ConsignBooking onViewHistory={() => setTab('history')} /> : <MyBookings onNewBookingClick={() => setTab('book')} />}
    </div>
  );
}
