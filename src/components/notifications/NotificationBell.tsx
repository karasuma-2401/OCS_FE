import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Check,
  Clock,
  Info,
  Smartphone,
} from 'lucide-react';
import { notificationApi } from '@/api/notificationApi';
import type { Notification } from '@/types';
import { SkeletonLoading } from '@/components/shared/Skeleton';
import { Badge } from '@/components/shared/Badge';
import { AlertBanner } from '@/components/shared/AlertBanner';
import { useFcm } from '@/hooks/useFcm';
import { useAuth } from '@/context/AuthContext';
import { useNotificationCenter } from '@/context/NotificationContext';
import {
  formatNotificationRelativeTime,
  getNotificationCategoryMeta,
  resolveNotificationTargetLink,
} from './notificationMeta';

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
  const center = useNotificationCenter();
  const { user, isStaffOrAdmin } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

  // Local fallback state when rendered outside NotificationProvider
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);
  const [localUnreadCount, setLocalUnreadCount] = useState(0);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const fetchLocalNotifications = async () => {
    try {
      setLocalLoading(true);
      const res = await notificationApi.getMyNotifications(30);
      setLocalNotifications(res.data);
      setLocalUnreadCount(res.unreadCount);
      setLocalError(null);
    } catch {
      setLocalError('Không thể tải thông báo. Vui lòng thử lại.');
    } finally {
      setLocalLoading(false);
    }
  };

  const fallbackFcm = useFcm({
    enabled: !center && Boolean(user?.id),
    userId: user?.id,
    onForegroundMessage: () => {
      if (!center) void fetchLocalNotifications();
    },
  });

  useEffect(() => {
    if (center) return;
    void fetchLocalNotifications();
    const interval = setInterval(fetchLocalNotifications, 8000);
    const handleFocus = () => void fetchLocalNotifications();
    const handleCustomRefresh = () => void fetchLocalNotifications();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('ocs:notification:refresh', handleCustomRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('ocs:notification:refresh', handleCustomRefresh);
    };
  }, [center]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const notifications = center ? center.notifications : localNotifications;
  const unreadCount = center ? center.unreadCount : localUnreadCount;
  const loading = center ? center.loading : localLoading;
  const error = center ? center.error : localError;
  const fcm = center ? center.fcm : fallbackFcm;

  const refreshNotifications = () => {
    if (center) {
      void center.fetchNotifications();
    } else {
      void fetchLocalNotifications();
    }
  };

  const handleMarkAsRead = async (id: string) => {
    if (center) {
      await center.markAsRead(id);
      return;
    }
    try {
      await notificationApi.markAsRead(id);
      setLocalNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setLocalUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      setLocalError('Không thể cập nhật thông báo. Vui lòng thử lại.');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (center) {
      await center.markAllAsRead();
      return;
    }
    try {
      await notificationApi.markAllAsRead();
      setLocalNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await fetchLocalNotifications();
    } catch {
      setLocalError('Không thể cập nhật thông báo. Vui lòng thử lại.');
    }
  };

  const filteredNotifications = useMemo(() => {
    const list =
      activeFilter === 'unread'
        ? notifications.filter((n) => !n.isRead)
        : notifications;
    return list.slice(0, 15);
  }, [notifications, activeFilter]);

  const inboxRoute = isStaffOrAdmin ? '/shop/notifications' : '/notifications';

  return (
    <div className={`relative ${showLabel ? 'w-full' : 'inline-block'}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (nextOpen) refreshNotifications();
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
            <span className={collapsed ? 'lg:hidden' : ''}>Thông báo</span>
            {unreadCount > 0 && !collapsed && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-state-danger px-1.5 text-xs font-bold text-white shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} ${
            placement === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
          } w-[min(22rem,calc(100vw-1.5rem))] sm:w-[25rem] rounded-2xl border border-border bg-paper shadow-2xl z-[140] overflow-hidden`}
        >
          {/* Header */}
          <div className="border-b border-border bg-white px-4 pt-3.5 pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink">Trung tâm thông báo</h3>
                {unreadCount > 0 && (
                  <Badge variant="danger">{unreadCount} mới</Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-highlight transition hover:bg-brand-pink-surface"
                >
                  <Check size={13} /> Đọc tất cả
                </button>
              )}
            </div>

            {/* Filter tabs */}
            <div className="mt-2.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  activeFilter === 'all'
                    ? 'bg-ink text-paper'
                    : 'bg-surface text-text-secondary hover:bg-surface-subtle'
                }`}
              >
                Tất cả ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('unread')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  activeFilter === 'unread'
                    ? 'bg-brand-highlight text-white'
                    : 'bg-surface text-text-secondary hover:bg-surface-subtle'
                }`}
              >
                Chưa đọc ({unreadCount})
              </button>
            </div>
          </div>

          {/* FCM Push Status Strip */}
          <div className="border-b border-border/70 bg-surface-dashboard/80 px-4 py-2 text-xs">
            {!fcm.isFirebaseClientConfigured || (fcm.status && !fcm.isServerConfigured) ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-state-warning-strong">
                  <Smartphone size={14} className="text-state-warning-icon shrink-0" />
                  <span className="text-[11px] font-medium">
                    FCM chưa cấu hình ({!fcm.isFirebaseClientConfigured ? 'thiếu .env web' : 'máy chủ chưa cấu hình'})
                  </span>
                </div>
              </div>
            ) : fcm.isPushActive ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-state-success-strong">
                  <Smartphone size={14} className="text-state-success-icon shrink-0" />
                  <span className="text-[11px] font-semibold">
                    Đã bật thông báo đẩy
                    {fcm.status?.registeredDeviceCount
                      ? ` (${fcm.status.registeredDeviceCount} thiết bị)`
                      : ''}
                  </span>
                </div>
              </div>
            ) : fcm.permission !== 'granted' ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <Smartphone size={14} className="text-brand-highlight shrink-0" />
                  <span className="text-[11px] font-semibold">Nhận thông báo đẩy (FCM)</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await fcm.requestPermissionAndRegister();
                  }}
                  disabled={fcm.loading}
                  className="rounded-lg bg-brand-pink hover:bg-brand-pink-hover !text-white px-2.5 py-1 text-[11px] font-bold shadow-2xs transition active:scale-95 disabled:opacity-50"
                  style={{ color: '#FFFFFF' }}
                >
                  {fcm.loading ? 'Đang bật...' : 'Bật ngay'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-state-warning-strong">
                  <Smartphone size={14} className="text-state-warning-icon shrink-0" />
                  <span className="text-[11px] font-medium">Chưa kết nối thiết bị FCM</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await fcm.requestPermissionAndRegister();
                  }}
                  disabled={fcm.loading}
                  className="rounded-lg border border-border bg-white px-2 py-0.5 text-[11px] font-semibold text-text-primary hover:bg-surface-subtle"
                >
                  {fcm.loading ? 'Đang kết nối...' : 'Thử lại'}
                </button>
              </div>
            )}
            {fcm.error && (
              <p className="mt-1 text-[11px] text-state-danger">{fcm.error}</p>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div className="px-3 pt-2.5">
              <AlertBanner variant="error" compact description={error} />
            </div>
          )}

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/50 px-2.5 py-2">
            {loading && notifications.length === 0 ? (
              <div className="p-2">
                <SkeletonLoading variant="list" count={3} label="Đang tải thông báo..." />
              </div>
            ) : filteredNotifications.length === 0 && !error ? (
              <div className="py-10 text-center text-xs text-muted">
                <Info size={28} className="mx-auto mb-2 text-muted/60" />
                {activeFilter === 'unread'
                  ? 'Bạn đã đọc hết tất cả thông báo.'
                  : 'Chưa có thông báo nào.'}
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const meta = getNotificationCategoryMeta(n);
                const targetLink = resolveNotificationTargetLink(n, isStaffOrAdmin);

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) void handleMarkAsRead(n.id);
                      setIsOpen(false);
                      navigate(targetLink);
                    }}
                    className={`group relative flex items-start gap-3 rounded-xl p-2.5 cursor-pointer transition ${
                      n.isRead
                        ? 'opacity-80 hover:opacity-100 hover:bg-surface/60'
                        : 'bg-brand-pink-surface/75 hover:bg-brand-pink-light/60'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${meta.iconBgClass}`}
                    >
                      {meta.renderIcon(16)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${meta.iconTextClass}`}>
                            {meta.label}
                          </span>
                          {!n.isRead && (
                            <span
                              className="h-2 w-2 rounded-full bg-state-danger"
                              title="Chưa đọc"
                            />
                          )}
                        </span>
                        <span className="shrink-0 flex items-center gap-1 text-[10px] text-muted">
                          <Clock size={10} />
                          {formatNotificationRelativeTime(n.sentAt)}
                        </span>
                      </div>

                      <p
                        className={`mt-0.5 text-xs leading-snug ${
                          n.isRead
                            ? 'font-semibold text-ink'
                            : 'font-bold text-brand-ink'
                        }`}
                      >
                        {n.title}
                      </p>

                      <p className="mt-1 line-clamp-2 text-xs text-text-secondary leading-relaxed">
                        {n.content}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer: View all notifications */}
          <div className="border-t border-border bg-white px-4 py-2.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate(inboxRoute);
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-surface/80 hover:bg-brand-pink-surface py-2 text-xs font-bold text-ink hover:text-brand-highlight transition"
            >
              <span>Xem tất cả thông báo</span>
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
