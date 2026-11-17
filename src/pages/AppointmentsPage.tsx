import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CalendarDays, History } from 'lucide-react';
import { ConsignBooking } from '@/components/customer/ConsignBooking';
import { MyBookings } from '@/components/customer/MyBookings';
import { useAuth } from '@/context/AuthContext';
import { PageHeaderCard } from '@/components/shared';

export function AppointmentsPage() {
  const { hasPermission } = useAuth();
  const canBook = hasPermission('appointments.create');
  const canRead = hasPermission('appointments.own.read');
  const [tab, setTab] = useState<'book' | 'history'>('book');
  const activeTab = canBook && (tab === 'book' || !canRead) ? 'book' : 'history';

  if (!canBook && !canRead) return <Navigate to="/unauthorized" replace />;

  return (
    <div className="landing-container mx-auto w-[min(calc(100%_-_5rem),1320px)] max-[850px]:w-[min(calc(100%_-_2.5rem),1320px)] py-8 sm:py-12">
      <h1 className="sr-only">Lịch hẹn ký gửi</h1>
      <div className="mb-6 [&_h2]:!mt-0 [&_h2]:!text-lg [&_h2]:!leading-normal [&_h2]:!tracking-normal">
        <PageHeaderCard
          icon={<CalendarDays size={22} aria-hidden="true" />}
          title="Lịch hẹn ký gửi"
          description="Đặt lịch hẹn mang đồ ký gửi tới cửa hàng và theo dõi các lịch hẹn của bạn."
          actions={
            <div
              className="inline-flex gap-1 rounded-xl border border-brand-pink-light bg-white p-1 shadow-2xs"
              role="group"
              aria-label="Lịch hẹn ký gửi"
            >
              {canBook && (
                <button
                  type="button"
                  aria-pressed={activeTab === 'book'}
                  onClick={() => setTab('book')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    activeTab === 'book'
                      ? 'bg-brand-pink-light text-brand-highlight shadow-2xs'
                      : 'text-text-secondary hover:text-brand-ink'
                  }`}
                >
                  <CalendarDays size={16} /> Đặt lịch
                </button>
              )}
              {canRead && (
                <button
                  type="button"
                  aria-pressed={activeTab === 'history'}
                  onClick={() => setTab('history')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    activeTab === 'history'
                      ? 'bg-brand-pink-light text-brand-highlight shadow-2xs'
                      : 'text-text-secondary hover:text-brand-ink'
                  }`}
                >
                  <History size={16} /> Lịch hẹn của tôi
                </button>
              )}
            </div>
          }
        />
      </div>

      {activeTab === 'book' ? (
        <ConsignBooking onViewHistory={canRead ? () => setTab('history') : undefined} />
      ) : (
        <MyBookings onNewBookingClick={canBook ? () => setTab('book') : undefined} />
      )}
    </div>
  );
}
