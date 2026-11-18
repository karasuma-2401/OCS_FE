import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Clock, Info, Smartphone } from 'lucide-react';
import { notificationApi } from '@/api/notificationApi';
import type { Notification } from '@/types';
import { SkeletonLoading } from '@/components/shared/Skeleton';
import { useFcm } from '@/hooks/useFcm';
import { useAuth } from '@/context/AuthContext';

export function NotificationBell({
  align = 'right',
  placement = 'below',
  showLabel = false,
  collapsed = false,
}: {
  align?: 'left' | 'right';
  placement?: 'above' | 'below';
  showLabel?: boolean;
  collapsed?: boolean;
} = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, isStaffOrAdmin } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getMyNotifications(20);
      setNotifications(res.data);
      setUnreadCount(res.unreadCount);
      setError(null);
    } catch {
      setError('Không thể tải thông báo. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const {
    permission,
    status: fcmStatus,
    isPushActive,
    isFirebaseClientConfigured,
    isServerConfigured,
    loading: fcmLoading,
    error: fcmError,
    requestPermissionAndRegister,
  } = useFcm({
    enabled: Boolean(user?.id),
    userId: user?.id,
    onForegroundMessage: () => {
      fetchNotifications();
    },
  });

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 6000);
    const handleFocus = () => fetchNotifications();
    const handleCustomRefresh = () => fetchNotifications();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('ocs:notification:refresh', handleCustomRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('ocs:notification:refresh', handleCustomRefresh);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      setError('Không thể cập nhật thông báo. Vui lòng thử lại.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await fetchNotifications();
    } catch {
      setError('Không thể cập nhật thông báo. Vui lòng thử lại.');
    }
  };

  return (
    <div className={`relative ${showLabel ? 'w-full' : 'inline-block'}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className={
          showLabel
            ? `relative flex min-h-10 w-full shrink-0 cursor-pointer items-center justify-start gap-3 rounded-control px-3 text-left text-sm leading-5 font-medium text-text-secondary no-underline transition-colors duration-200 hover:bg-brand-pink-surface hover:text-brand-highlight ${
                isOpen ? 'bg-brand-pink-light !font-semibold !text-brand-highlight' : ''
              } ${collapsed ? 'lg:justify-center lg:px-0' : ''}`
            : 'relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-paper text-ink transition hover:border-accent hover:bg-surface-subtle'
        }
        title="Thông báo"
        aria-label="Thông báo"
        aria-expanded={isOpen}
      >
        <div className="relative flex items-center justify-center shrink-0">
          <Bell size={19} aria-hidden="true" />
          {unreadCount > 0 && showLabel && collapsed && (
            <span className="absolute -top-2 -right-3 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-state-danger px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>

        {unreadCount > 0 && !showLabel && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-state-danger px-1.5 text-[11px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {showLabel && (
          <>
            <span className={collapsed ? 'lg:hidden' : ''}>
              Thông báo
            </span>
            {unreadCount > 0 && !collapsed && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-state-danger px-1.5 text-xs font-bold text-white shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {isOpen && (
        <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} ${placement === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'} w-[min(20rem,calc(100vw-2rem))] sm:w-96 rounded-2xl border border-border bg-paper p-4 shadow-xl z-[120] animate-in fade-in zoom-in-95 duration-150`}>
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-ink">Thông báo hệ thống</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-state-danger/10 px-2 py-0.5 text-xs font-semibold text-state-danger">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs font-medium text-accent-dark hover:underline flex items-center gap-1"
              >
                <Check size={13} /> Đọc tất cả
              </button>
            )}
          </div>

          <div className="mt-2.5 rounded-xl border border-border/80 bg-surface-dashboard/70 p-2.5 text-xs">
            {!isFirebaseClientConfigured || (fcmStatus && !isServerConfigured) ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <Smartphone size={14} className="text-amber-500 shrink-0" />
                  <span className="text-[11px] font-medium text-amber-700">
                    FCM chưa cấu hình ({!isFirebaseClientConfigured ? 'thiếu .env web' : 'máy chủ chưa cấu hình'})
                  </span>
                </div>
              </div>
            ) : isPushActive ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <Smartphone size={14} className="text-green-600 shrink-0" />
                  <span className="text-[11px] font-semibold text-text-primary">
                    Đã bật thông báo đẩy
                    {fcmStatus?.registeredDeviceCount ? ` (${fcmStatus.registeredDeviceCount} thiết bị)` : ''}
                  </span>
                </div>
              </div>
            ) : permission !== 'granted' ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <Smartphone size={14} className="text-brand-highlight shrink-0" />
                  <span className="text-[11px] font-semibold">Nhận thông báo đẩy (FCM)</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await requestPermissionAndRegister();
                  }}
                  disabled={fcmLoading}
                  className="rounded-lg bg-brand-pink hover:bg-brand-pink-hover !text-white px-2.5 py-1 text-[11px] font-bold shadow-2xs transition active:scale-95 disabled:opacity-50"
                  style={{ color: '#FFFFFF' }}
                >
                  {fcmLoading ? 'Đang bật...' : 'Bật ngay'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <Smartphone size={14} className="text-amber-600 shrink-0" />
                  <span className="text-[11px] font-medium text-text-secondary">
                    Chưa kết nối thiết bị FCM
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await requestPermissionAndRegister();
                  }}
                  disabled={fcmLoading}
                  className="rounded-lg border border-border px-2 py-0.5 text-[11px] font-medium text-text-primary hover:bg-surface-subtle"
                >
                  {fcmLoading ? 'Đang kết nối...' : 'Thử lại'}
                </button>
              </div>
            )}
            {fcmError && (
              <p className="mt-1 text-[10px] text-state-danger">{fcmError}</p>
            )}
          </div>

          {error && <p role="alert" className="mt-3 text-xs text-state-danger">{error}</p>}
          <div className="mt-3 max-h-80 overflow-y-auto space-y-2.5 divide-y divide-border/50">
            {loading && notifications.length === 0 ? (
              <SkeletonLoading variant="list" count={3} label="Đang tải thông báo..." />
            ) : notifications.length === 0 && !error ? (
              <div className="py-8 text-center text-xs text-muted">
                <Info size={28} className="mx-auto mb-2 text-muted/60" />
                Chưa có thông báo nào.
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) handleMarkAsRead(n.id);
                    setIsOpen(false);
                    if (isStaffOrAdmin) {
                      navigate('/shop/consignment');
                    } else {
                      navigate('/appointments');
                    }
                  }}
                  className={`pt-2.5 first:pt-0 cursor-pointer rounded-lg p-2 transition ${
                    n.isRead ? 'opacity-70 hover:opacity-100 hover:bg-surface/50' : 'bg-brand-pink-surface/80 hover:bg-brand-pink-light/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs font-semibold ${n.isRead ? 'text-ink' : 'text-brand-highlight font-bold'}`}>
                      {n.title}
                    </p>
                    <span className="shrink-0 flex items-center gap-1 text-[10px] text-muted">
                      <Clock size={11} />
                      {new Date(n.sentAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                    {n.content}
                  </p>
                </div>
              ))
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
