import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CalendarDays, History } from 'lucide-react';
import { ConsignBooking } from '@/components/customer/ConsignBooking';
import { MyBookings } from '@/components/customer/MyBookings';
import { useAuth } from '@/context/AuthContext';

export function AppointmentsPage() {
  const { hasPermission } = useAuth();
  const canBook = hasPermission('appointments.create');
  const canRead = hasPermission('appointments.own.read');
  const [tab, setTab] = useState<'book' | 'history'>('book');
  const activeTab = canBook && (tab === 'book' || !canRead) ? 'book' : 'history';
  if (!canBook && !canRead) return <Navigate to="/unauthorized" replace />;
  return (
    <div className="landing-container py-8">
      <h1 className="mb-5 text-2xl font-bold text-brand-ink">Lịch hẹn ký gửi</h1>
      <div className="mb-6 inline-flex gap-1 rounded-xl border border-brand-pink-light bg-white p-1" role="group" aria-label="Lịch hẹn ký gửi">
        {canBook && <button type="button" aria-pressed={activeTab === 'book'} onClick={() => setTab('book')} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === 'book' ? 'bg-brand-pink-light text-brand-highlight' : 'text-text-secondary'}`}><CalendarDays size={16} /> Đặt lịch</button>}
        {canRead && <button type="button" aria-pressed={activeTab === 'history'} onClick={() => setTab('history')} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === 'history' ? 'bg-brand-pink-light text-brand-highlight' : 'text-text-secondary'}`}><History size={16} /> Lịch hẹn của tôi</button>}
      </div>
      {activeTab === 'book' ? <ConsignBooking onViewHistory={canRead ? () => setTab('history') : undefined} /> : <MyBookings onNewBookingClick={canBook ? () => setTab('book') : undefined} />}
    </div>
  );
}
