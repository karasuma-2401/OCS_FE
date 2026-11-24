import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Check,
  Clock,
  Info,
  Lock,
  RefreshCw,
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
  extractNotificationHighlights,
  formatHighlightChip,
  formatNotificationRelativeTime,
  getNotificationCategoryMeta,
  groupNotificationsByTime,
  resolveNotificationTargetLink,
} from './notificationMeta';

export function NotificationBell({
  align = 'right',
  placement = 'below',
  showLabel = false,
  collapsed = false,
  active = false,
}: {
  align?: 'left' | 'right';
  placement?: 'above' | 'below';
  showLabel?: boolean;
  collapsed?: boolean;
  active?: boolean;
} = {}) {
  const center = useNotificationCenter();
  const { user, isStaffOrAdmin } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const [isBellRinging, setIsBellRinging] = useState(false);
  const prevUnreadRef = useRef<number>(0);

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
    if (center || !user?.id) return;
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
  }, [center, user?.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const notifications = center ? center.notifications : localNotifications;
  const unreadCount = center ? center.unreadCount : localUnreadCount;
  const loading = center ? center.loading : localLoading;
  const error = center ? center.error : localError;
  const fcm = center ? center.fcm : fallbackFcm;

  // Gentle bell swing micro-interaction whenever unread count increases
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setIsBellRinging(true);
      const timer = window.setTimeout(() => setIsBellRinging(false), 700);
      prevUnreadRef.current = unreadCount;
      return () => window.clearTimeout(timer);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  const refreshNotifications = () => {
    if (center) {
      void center.fetchNotifications();
    } else if (user?.id) {
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

  const groupedNotifications = useMemo(() => {
    if (activeFilter === 'unread') {
      return groupNotificationsByTime(notifications.filter((n) => !n.isRead).slice(0, 15));
    }
    const recent = notifications.slice(0, 15);
    const unreadRecent = recent.filter((n) => !n.isRead);
    const readRecent = recent.filter((n) => n.isRead);
    if (unreadRecent.length > 0 && readRecent.length > 0) {
      return [
        { key: 'priority_unread' as const, label: 'Mới chưa đọc', items: unreadRecent },
        ...groupNotificationsByTime(readRecent),
      ];
    }
    return groupNotificationsByTime(recent);
  }, [notifications, activeFilter]);

  const inboxRoute = isStaffOrAdmin ? '/shop/notifications' : '/notifications';
  const triggerAriaLabel =
    unreadCount > 0 ? `Thông báo (${unreadCount} chưa đọc)` : 'Thông báo';

  return (
    <div className={`relative ${showLabel ? 'w-full' : 'inline-block'}`} ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (nextOpen) refreshNotifications();
        }}
        className={
          showLabel
            ? `relative flex min-h-10 w-full shrink-0 cursor-pointer items-center justify-start gap-3 rounded-control px-3 text-left text-sm leading-5 no-underline transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight ${
                isOpen || active
                  ? 'bg-brand-pink-light font-semibold text-brand-highlight'
                  : 'font-medium text-text-secondary hover:bg-brand-pink-surface hover:text-brand-highlight'
              } ${collapsed ? 'lg:justify-center lg:px-0' : ''}`
            : `relative flex h-10 w-10 items-center justify-center rounded-xl border bg-paper text-ink transition hover:border-accent hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight ${
                isOpen || active ? 'border-brand-highlight bg-brand-pink-surface text-brand-highlight' : 'border-border'
              }`
        }
        title="Thông báo"
        aria-label={triggerAriaLabel}
        aria-current={active ? 'page' : undefined}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="relative flex items-center justify-center shrink-0">
          <Bell
            size={19}
            aria-hidden="true"
            className={isBellRinging ? 'origin-top animate-bell-swing motion-reduce:animate-none' : ''}
          />
          {unreadCount > 0 && showLabel && collapsed && (
            <span className="absolute -top-2 -right-3 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border-2 border-white bg-state-danger px-1 text-[10px] font-bold text-white shadow-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>

        {unreadCount > 0 && !showLabel && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-state-danger px-1.5 text-[11px] font-bold text-white shadow-xs">
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
          role="dialog"
          aria-label="Trung tâm thông báo"
          className={`fixed inset-x-3 top-16 z-[140] flex max-h-[calc(100dvh-5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-paper shadow-2xl sm:absolute sm:inset-x-auto sm:w-[25.5rem] sm:max-h-[calc(100dvh-6rem)] ${
            align === 'left' ? 'sm:left-0' : 'sm:right-0'
          } ${
            placement === 'above'
              ? 'sm:top-full sm:mt-2 lg:top-auto lg:bottom-full lg:mt-0 lg:mb-2'
              : 'sm:top-full sm:mt-2'
          }`}
        >
          {/* Header */}
          <div className="shrink-0 border-b border-border bg-white px-4 pt-3.5 pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink">Trung tâm thông báo</h3>
                {unreadCount > 0 && (
                  <Badge variant="brand">{unreadCount} mới</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={refreshNotifications}
                  disabled={loading}
                  aria-label="Làm mới thông báo"
                  title="Làm mới"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-surface-subtle hover:text-ink disabled:opacity-50"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
                </button>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="inline-flex min-h-7 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-highlight transition hover:bg-brand-pink-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight"
                  >
                    <Check size={13} aria-hidden="true" /> Đọc tất cả
                  </button>
                )}
              </div>
            </div>

            {/* Sliding segmented filter tabs */}
            <div className="relative mt-2.5 grid grid-cols-2 rounded-xl bg-surface p-1">
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-white shadow-2xs transition-transform duration-200 ease-out motion-reduce:transition-none ${
                  activeFilter === 'unread' ? 'translate-x-full' : 'translate-x-0'
                }`}
              />
              <button
                type="button"
                aria-pressed={activeFilter === 'all'}
                onClick={() => setActiveFilter('all')}
                className={`relative z-10 min-h-8 rounded-lg px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight ${
                  activeFilter === 'all'
                    ? 'text-ink'
                    : 'text-text-secondary hover:text-ink'
                }`}
              >
                Tất cả ({notifications.length})
              </button>
              <button
                type="button"
                aria-pressed={activeFilter === 'unread'}
                onClick={() => setActiveFilter('unread')}
                className={`relative z-10 min-h-8 rounded-lg px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight ${
                  activeFilter === 'unread'
                    ? 'text-brand-highlight'
                    : 'text-text-secondary hover:text-ink'
                }`}
              >
                Chưa đọc ({unreadCount})
              </button>
            </div>
          </div>

          {/* Push Status Strip */}
          <div className="shrink-0 border-b border-border/70 bg-surface-dashboard/80 px-4 py-2 text-xs">
            {!fcm.isFirebaseClientConfigured || (fcm.status && !fcm.isServerConfigured) ? (
              <div className="flex items-center gap-1.5 text-state-warning-strong">
                <Smartphone size={14} className="text-state-warning shrink-0" aria-hidden="true" />
                <span className="text-xs font-medium">
                  Thông báo đẩy trên thiết bị tạm thời chưa khả dụng
                </span>
              </div>
            ) : fcm.isPushActive ? (
              <div className="flex items-center gap-1.5 text-state-success-strong">
                <Smartphone size={14} className="text-state-success shrink-0" aria-hidden="true" />
                <span className="text-xs font-semibold">
                  Đã bật thông báo đẩy
                  {fcm.status?.registeredDeviceCount
                    ? ` (${fcm.status.registeredDeviceCount} thiết bị)`
                    : ''}
                </span>
              </div>
            ) : fcm.permission === 'denied' ? (
              <div className="flex items-start gap-2 text-state-warning-strong">
                <Lock size={14} className="mt-0.5 shrink-0 text-state-warning" aria-hidden="true" />
                <span className="text-xs leading-relaxed">
                  Trình duyệt đang chặn thông báo. Bấm biểu tượng ổ khóa trên thanh địa chỉ → Thông báo → <strong>Cho phép</strong> để mở lại.
                </span>
              </div>
            ) : fcm.permission !== 'granted' ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <Smartphone size={14} className="text-brand-highlight shrink-0" aria-hidden="true" />
                  <span className="text-xs font-semibold">Nhận thông báo đẩy</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await fcm.requestPermissionAndRegister();
                  }}
                  disabled={fcm.loading}
                  className="min-h-8 rounded-lg bg-brand-highlight hover:bg-brand-ink text-white px-3 py-1 text-xs font-bold shadow-2xs transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight disabled:opacity-50"
                >
                  {fcm.loading ? 'Đang bật...' : 'Bật ngay'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-state-warning-strong">
                  <Smartphone size={14} className="text-state-warning shrink-0" aria-hidden="true" />
                  <span className="text-xs font-medium">Chưa kết nối thiết bị nhận tin</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await fcm.requestPermissionAndRegister();
                  }}
                  disabled={fcm.loading}
                  className="min-h-8 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold text-text-primary hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight"
                >
                  {fcm.loading ? 'Đang kết nối...' : 'Thử lại'}
                </button>
              </div>
            )}
            {fcm.error && (
              <p className="mt-1 text-xs text-state-danger">{fcm.error}</p>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div className="shrink-0 px-3 pt-2.5">
              <AlertBanner
                variant="error"
                compact
                description={error}
                action={{
                  label: 'Thử lại',
                  onClick: refreshNotifications,
                }}
              />
            </div>
          )}

          {/* Editorial Timeline Grouped List */}
          <div className="shrink-0 h-0.5 w-full overflow-hidden bg-transparent" aria-hidden="true">
            {loading && notifications.length > 0 && (
              <div className="animate-inv-progress-indeterminate h-full w-1/3 bg-brand-highlight" />
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2">
            {loading && notifications.length === 0 ? (
              <div className="p-2">
                <SkeletonLoading variant="list" count={3} label="Đang tải thông báo..." />
              </div>
            ) : groupedNotifications.length === 0 && !error ? (
              <div className="py-10 text-center text-xs text-muted">
                <Info size={28} className="mx-auto mb-2 text-muted" aria-hidden="true" />
                {activeFilter === 'unread'
                  ? 'Bạn đã đọc hết tất cả thông báo.'
                  : 'Chưa có thông báo nào.'}
              </div>
            ) : (
              <div className="space-y-3">
                {groupedNotifications.map((group) => (
                  <div key={group.key}>
                    <div className="mb-1 flex items-center gap-2 px-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                        {group.label}
                      </span>
                      <span className="h-px flex-1 bg-border/60" aria-hidden="true" />
                    </div>
                    <div className="space-y-1">
                      {group.items.map((n) => {
                        const meta = getNotificationCategoryMeta(n);
                        const targetLink = resolveNotificationTargetLink(n, isStaffOrAdmin);
                        const highlights = extractNotificationHighlights(`${n.title} ${n.content}`);

                        return (
                          <div
                            key={n.id}
                            className={`group relative flex w-full items-start gap-1 rounded-xl transition ${
                              n.isRead
                                ? 'hover:bg-surface/70'
                                : 'bg-brand-pink-surface/75 hover:bg-brand-pink-light/60'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (!n.isRead) void handleMarkAsRead(n.id);
                                setIsOpen(false);
                                navigate(targetLink);
                              }}
                              className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-xl p-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight"
                            >
                              <div
                                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${meta.iconBgClass}`}
                              >
                                {meta.renderIcon(16)}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className={`text-xs font-bold ${meta.iconTextClass}`}>
                                      {meta.label}
                                    </span>
                                    {!n.isRead && (
                                      <span
                                        className="inline-flex h-2 w-2 rounded-full bg-brand-highlight"
                                        title="Chưa đọc"
                                      >
                                        <span className="sr-only">Chưa đọc</span>
                                      </span>
                                    )}
                                  </span>
                                  <span className="shrink-0 flex items-center gap-1 text-xs text-muted">
                                    <Clock size={11} aria-hidden="true" />
                                    {formatNotificationRelativeTime(n.sentAt)}
                                  </span>
                                </div>

                                <p
                                  className={`mt-0.5 line-clamp-2 break-words text-xs leading-snug ${
                                    n.isRead
                                      ? 'font-semibold text-ink'
                                      : 'font-bold text-brand-ink'
                                  }`}
                                >
                                  {n.title}
                                </p>

                                <p className="mt-1 line-clamp-2 break-words text-xs leading-relaxed text-text-secondary">
                                  {n.content}
                                </p>

                                {highlights.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                    {highlights.map((chip) => {
                                      const formatted = formatHighlightChip(chip);
                                      return (
                                        <span
                                          key={chip}
                                          title={chip}
                                          className="inline-flex items-center rounded-md border border-border/80 bg-white/90 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink"
                                        >
                                          {formatted.label}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </button>

                            {!n.isRead && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleMarkAsRead(n.id);
                                }}
                                title="Đánh dấu đã đọc"
                                aria-label={`Đánh dấu đã đọc: ${n.title}`}
                                className="mt-2.5 mr-2 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border/80 bg-white/90 text-muted opacity-90 transition hover:border-brand-highlight hover:text-brand-highlight focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight sm:opacity-0 sm:group-hover:opacity-100"
                              >
                                <Check size={13} aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer: View all notifications */}
          <div className="shrink-0 border-t border-border bg-white px-4 py-2.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate(inboxRoute);
              }}
              className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-surface/80 hover:bg-brand-pink-surface py-2 text-xs font-bold text-ink hover:text-brand-highlight transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight"
            >
              <span>
                {notifications.length > 15
                  ? `Xem tất cả ${notifications.length} thông báo`
                  : 'Xem tất cả thông báo'}
              </span>
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
