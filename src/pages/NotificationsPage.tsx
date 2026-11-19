import React, { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  Clock,
  Lock,
  RefreshCw,
  Search,
  Send,
  Smartphone,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  Button,
  Card,
  EmptyState,
  SkeletonLoading,
} from '@/components/shared';
import { ContractPageLayout } from '@/components/shop/ContractPageLayout';
import { useAuth } from '@/context/AuthContext';
import { useNotificationCenter } from '@/context/NotificationContext';
import { useToast } from '@/context/ToastContext';
import type { NotificationCategory } from '@/types';
import {
  extractNotificationHighlights,
  formatNotificationRelativeTime,
  getNotificationCategoryMeta,
  groupNotificationsByTime,
  NOTIFICATION_FILTER_TABS,
  resolveNotificationCategory,
  resolveNotificationTargetLink,
} from '@/components/notifications/notificationMeta';

export const NotificationsPage: React.FC = () => {
  const { isStaffOrAdmin } = useAuth();
  const center = useNotificationCenter();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | NotificationCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [testCategory, setTestCategory] = useState<NotificationCategory>('Appointment');
  const [sendingTest, setSendingTest] = useState(false);

  const notifications = center?.notifications ?? [];
  const unreadCount = center?.unreadCount ?? 0;
  const loading = center?.loading ?? false;
  const error = center?.error ?? null;
  const fcm = center?.fcm;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: notifications.length };
    for (const item of notifications) {
      const cat = resolveNotificationCategory(item);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return notifications.filter((item) => {
      if (readFilter === 'unread' && item.isRead) return false;
      if (readFilter === 'read' && !item.isRead) return false;
      const cat = resolveNotificationCategory(item);
      if (categoryFilter !== 'ALL' && cat !== categoryFilter) return false;
      if (keyword) {
        const text = `${item.title} ${item.content}`.toLowerCase();
        if (!text.includes(keyword)) return false;
      }
      return true;
    });
  }, [notifications, readFilter, categoryFilter, searchQuery]);

  const groupedNotifications = useMemo(
    () => groupNotificationsByTime(filteredNotifications),
    [filteredNotifications],
  );

  if (isStaffOrAdmin && location.pathname === '/notifications') {
    return <Navigate to="/shop/notifications" replace />;
  }

  const showDeveloperTestControls = isStaffOrAdmin || import.meta.env.DEV;

  const handleSendTest = async () => {
    if (!center) return;
    setSendingTest(true);
    try {
      const created = await center.fcm.sendTestNotification(testCategory);
      const meta = getNotificationCategoryMeta({
        category: testCategory,
        type: created.type,
        title: created.title,
        content: created.content,
      });
      toast.show({
        variant: meta.toastVariant,
        tag: meta.label,
        title: created.title,
        description: created.content,
        action: {
          label: 'Mở trang đích',
          onClick: () =>
            navigate(
              resolveNotificationTargetLink(
                { ...created, category: testCategory },
                isStaffOrAdmin,
              ),
            ),
        },
      });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Không thể gửi thông báo thử nghiệm.',
      );
    } finally {
      setSendingTest(false);
    }
  };

  const content = (
    <div className="space-y-5">
      {/* Device Push & Test Controls Card */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                fcm?.isPushActive
                  ? 'bg-state-success-muted text-state-success'
                  : fcm?.permission === 'denied'
                    ? 'bg-state-warning-muted text-state-warning'
                    : 'bg-brand-pink-surface text-brand-highlight'
              }`}
            >
              {fcm?.permission === 'denied' ? (
                <Lock size={20} aria-hidden="true" />
              ) : (
                <Smartphone size={21} aria-hidden="true" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-ink">
                  Thông báo đẩy trên trình duyệt
                </h2>
                {fcm?.isPushActive ? (
                  <Badge variant="success">
                    Đang hoạt động
                    {fcm.status?.registeredDeviceCount
                      ? ` (${fcm.status.registeredDeviceCount} thiết bị)`
                      : ''}
                  </Badge>
                ) : fcm?.permission === 'denied' ? (
                  <Badge variant="warning">Đang bị trình duyệt chặn</Badge>
                ) : !fcm?.isFirebaseClientConfigured ||
                  (fcm?.status && !fcm.isServerConfigured) ? (
                  <Badge variant="warning">Tạm thời chưa khả dụng</Badge>
                ) : (
                  <Badge variant="neutral">Đang tắt trên trình duyệt này</Badge>
                )}
              </div>
              {fcm?.permission === 'denied' ? (
                <p className="mt-1 text-xs text-state-warning-strong leading-relaxed">
                  Bạn đã chặn quyền thông báo trước đó. Hãy bấm vào biểu tượng ổ khóa trên thanh địa chỉ trình duyệt → <strong>Thông báo</strong> → chọn <strong>Cho phép</strong> rồi tải lại trang.
                </p>
              ) : (
                <p className="mt-1 text-xs text-text-secondary">
                  Nhận thông báo thời gian thực ngay cả khi bạn đang mở tab khác
                  hoặc thu nhỏ trình duyệt.
                </p>
              )}
              {fcm?.error && (
                <p className="mt-1 text-xs font-medium text-state-danger">
                  {fcm.error}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {fcm &&
              !fcm.isPushActive &&
              fcm.permission !== 'denied' &&
              fcm.isFirebaseClientConfigured &&
              fcm.isServerConfigured && (
                <Button
                  size="sm"
                  loading={fcm.loading}
                  onClick={() => void fcm.requestPermissionAndRegister()}
                >
                  Bật thông báo đẩy
                </Button>
              )}

            {showDeveloperTestControls && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface/60 p-1">
                <select
                  aria-label="Chọn loại thông báo thử nghiệm"
                  value={testCategory}
                  onChange={(e) =>
                    setTestCategory(e.target.value as NotificationCategory)
                  }
                  className="min-h-8 rounded-lg border border-border/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight"
                >
                  <option value="Appointment">Thử: Lịch hẹn</option>
                  <option value="Consignment">Thử: Ký gửi</option>
                  <option value="Buyout">Thử: Thu mua</option>
                  <option value="Payment">Thử: Thanh toán</option>
                  <option value="Promotion">Thử: Ưu đãi</option>
                  <option value="System">Thử: Hệ thống</option>
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  loading={sendingTest}
                  startIcon={<Send size={13} aria-hidden="true" />}
                  onClick={() => void handleSendTest()}
                >
                  Gửi thử
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Filters & Search Toolbar */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Read/Unread pills */}
            <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-surface p-1">
              <button
                type="button"
                aria-pressed={readFilter === 'all'}
                onClick={() => setReadFilter('all')}
                className={`min-h-8 rounded-lg px-3 py-1.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight ${
                  readFilter === 'all'
                    ? 'bg-white text-ink shadow-2xs'
                    : 'text-text-secondary hover:text-ink'
                }`}
              >
                Tất cả ({notifications.length})
              </button>
              <button
                type="button"
                aria-pressed={readFilter === 'unread'}
                onClick={() => setReadFilter('unread')}
                className={`min-h-8 rounded-lg px-3 py-1.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight ${
                  readFilter === 'unread'
                    ? 'bg-brand-highlight text-white shadow-2xs'
                    : 'text-text-secondary hover:text-ink'
                }`}
              >
                Chưa đọc ({unreadCount})
              </button>
              <button
                type="button"
                aria-pressed={readFilter === 'read'}
                onClick={() => setReadFilter('read')}
                className={`min-h-8 rounded-lg px-3 py-1.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight ${
                  readFilter === 'read'
                    ? 'bg-white text-ink shadow-2xs'
                    : 'text-text-secondary hover:text-ink'
                }`}
              >
                Đã đọc ({Math.max(0, notifications.length - unreadCount)})
              </button>
            </div>

            {/* Search + Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[14rem] flex-1 sm:w-64 sm:flex-none">
                <Search
                  size={15}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo mã phiếu, nội dung..."
                  aria-label="Tìm kiếm thông báo"
                  className="min-h-9 w-full rounded-xl border border-border bg-white py-1.5 pr-3 pl-9 text-xs text-ink placeholder:text-muted focus-visible:border-brand-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight"
                />
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => void center?.fetchNotifications(100)}
                loading={loading}
                startIcon={<RefreshCw size={14} aria-hidden="true" />}
              >
                Làm mới
              </Button>

              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void center?.markAllAsRead()}
                  startIcon={<CheckCheck size={14} aria-hidden="true" />}
                >
                  Đọc tất cả
                </Button>
              )}
            </div>
          </div>

          {/* Business Category filter tabs */}
          <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto border-t border-border/60 pt-3 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {NOTIFICATION_FILTER_TABS.map((tab) => {
              const active = categoryFilter === tab.key;
              const count = categoryCounts[tab.key] ?? 0;
              return (
                <button
                  key={tab.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategoryFilter(tab.key)}
                  className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight ${
                    active
                      ? 'border-ink bg-ink text-paper shadow-2xs'
                      : 'border-border bg-white text-text-secondary hover:border-brand-pink hover:bg-brand-pink-surface/40'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-surface text-text-muted'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Error Alert Banner */}
      {error && (
        <AlertBanner
          variant="error"
          title="Không thể đồng bộ thông báo"
          description={error}
          action={{
            label: 'Thử lại',
            onClick: () => void center?.fetchNotifications(100),
          }}
        />
      )}

      {/* Editorial Timeline Notification Feed */}
      <Card className="p-4 sm:p-5">
        {loading && notifications.length === 0 ? (
          <SkeletonLoading
            variant="list"
            count={5}
            label="Đang tải danh sách thông báo..."
          />
        ) : groupedNotifications.length === 0 ? (
          <EmptyState
            title={
              searchQuery || categoryFilter !== 'ALL' || readFilter !== 'all'
                ? 'Không tìm thấy thông báo phù hợp'
                : 'Chưa có thông báo nào'
            }
            description={
              searchQuery || categoryFilter !== 'ALL' || readFilter !== 'all'
                ? 'Thử đổi bộ lọc danh mục hoặc từ khóa tìm kiếm để xem các thông báo khác.'
                : 'Khi có lịch hẹn mới, cập nhật hợp đồng ký gửi, thu mua hoặc thanh toán, thông báo sẽ xuất hiện tại đây.'
            }
            action={
              searchQuery || categoryFilter !== 'ALL' || readFilter !== 'all' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setReadFilter('all');
                    setCategoryFilter('ALL');
                    setSearchQuery('');
                  }}
                >
                  Xóa bộ lọc
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-6">
            {groupedNotifications.map((group) => (
              <section key={group.key} aria-label={group.label}>
                <div className="mb-2.5 flex items-center gap-3 px-1">
                  <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted">
                    {group.label}
                  </h2>
                  <span className="h-px flex-1 bg-border/70" aria-hidden="true" />
                  <span className="text-xs font-semibold text-muted">
                    {group.items.length} tin
                  </span>
                </div>

                <div className="divide-y divide-border/60">
                  {group.items.map((item) => {
                    const meta = getNotificationCategoryMeta(item);
                    const targetLink = resolveNotificationTargetLink(
                      item,
                      isStaffOrAdmin,
                    );
                    const highlights = extractNotificationHighlights(
                      `${item.title} ${item.content}`,
                    );

                    return (
                      <article
                        key={item.id}
                        className={`my-1 flex flex-col gap-3 rounded-xl px-3.5 py-3.5 transition sm:flex-row sm:items-start sm:justify-between ${
                          item.isRead
                            ? 'hover:bg-surface/40'
                            : 'bg-brand-pink-surface/60 hover:bg-brand-pink-light/40'
                        }`}
                      >
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <div
                            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${meta.iconBgClass}`}
                          >
                            {meta.renderIcon(18)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                              {!item.isRead && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-brand-pink-light px-2.5 py-0.5 text-xs font-bold text-brand-highlight">
                                  <span
                                    className="h-1.5 w-1.5 rounded-full bg-brand-highlight"
                                    aria-hidden="true"
                                  />
                                  Chưa đọc
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 text-xs text-muted">
                                <Clock size={12} aria-hidden="true" />
                                {formatNotificationRelativeTime(item.sentAt)}
                              </span>
                            </div>

                            <h3
                              className={`mt-1.5 break-words text-sm sm:text-base leading-snug ${
                                item.isRead
                                  ? 'font-semibold text-ink'
                                  : 'font-bold text-brand-ink'
                              }`}
                            >
                              {item.title}
                            </h3>

                            <p className="mt-1 break-words text-xs sm:text-sm text-text-secondary leading-relaxed">
                              {item.content}
                            </p>

                            {highlights.length > 0 && (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {highlights.map((chip) => (
                                  <span
                                    key={chip}
                                    className="inline-flex items-center rounded-md border border-border bg-white px-2 py-0.5 font-mono text-xs font-semibold text-ink"
                                  >
                                    {chip}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                          {!item.isRead && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void center?.markAsRead(item.id)}
                              startIcon={<Check size={14} aria-hidden="true" />}
                            >
                              Đã đọc
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (!item.isRead) void center?.markAsRead(item.id);
                              navigate(targetLink);
                            }}
                            endIcon={<ArrowRight size={13} aria-hidden="true" />}
                          >
                            Xem chi tiết
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  if (isStaffOrAdmin) {
    return (
      <ContractPageLayout
        title="Trung Tâm Thông Báo Hệ Thống"
        description="Theo dõi thông báo lịch hẹn, hợp đồng ký gửi, thu mua và thanh toán theo thời gian thực."
        icon={<Bell size={22} aria-hidden="true" />}
      >
        {content}
      </ContractPageLayout>
    );
  }

  return (
    <div className="mx-auto w-[min(calc(100%_-_2.5rem),1120px)] py-8 sm:py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-pink-surface text-brand-highlight">
            <Bell size={23} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-highlight">
              TRUNG TÂM THÔNG BÁO OCS
            </p>
            <h1 className="mt-0.5 text-2xl font-extrabold text-brand-ink">
              Thông báo của bạn
            </h1>
          </div>
        </div>
      </div>
      {content}
    </div>
  );
};

export default NotificationsPage;
