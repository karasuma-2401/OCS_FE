import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns2,
  Copy,
  List,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  Button,
  Card,
  DetailPanel,
  DetailSplitLayout,
  EmptyState,
  Input,
  SkeletonLoading,
} from '@/components/shared';
import { ContractPageLayout } from '@/components/shop/ContractPageLayout';
import { firstAllowedScreen } from '@/auth/permissions';
import { useAuth } from '@/context/AuthContext';
import { useNotificationCenter } from '@/context/NotificationContext';
import { useToast } from '@/context/ToastContext';
import type { Notification, NotificationCategory } from '@/types';
import { NotificationPushPopover } from '@/components/notifications/NotificationPushPopover';
import {
  NotificationSummaryStrip,
  type NotificationSummaryFilter,
} from '@/components/notifications/NotificationSummaryStrip';
import {
  extractNotificationHighlights,
  extractNotificationMetadata,
  formatHighlightChip,
  formatNotificationFullDateTime,
  formatNotificationRelativeTime,
  getNotificationActionLabel,
  getNotificationCategoryMeta,
  groupNotificationsByTime,
  isNotificationToday,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_FILTER_TABS,
  resolveNotificationCategory,
  resolveNotificationTargetLink,
} from '@/components/notifications/notificationMeta';

type ReadFilterKey = 'all' | 'unread' | 'today_unread' | 'read';
type ViewMode = 'split' | 'list';

export const NotificationsPage: React.FC = () => {
  const { user, isStaffOrAdmin } = useAuth();
  const center = useNotificationCenter();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [readFilter, setReadFilter] = useState<ReadFilterKey>('all');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | NotificationCategory>('ALL');
  const [summaryPreset, setSummaryPreset] = useState<NotificationSummaryFilter | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspectorDismissed, setInspectorDismissed] = useState(false);
  const [fadingReadIds, setFadingReadIds] = useState<Record<string, boolean>>({});
  const [togglingPush, setTogglingPush] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const detailPanelRef = useRef<HTMLElement | null>(null);

  // Sliding pill measurement for ReadFilter tabs
  const tabTrackRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef<Partial<Record<ReadFilterKey, HTMLButtonElement | null>>>({});
  const [sliderStyle, setSliderStyle] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    ready: boolean;
  }>({ left: 0, top: 0, width: 0, height: 0, ready: false });

  const notifications = useMemo(() => center?.notifications ?? [], [center?.notifications]);
  const unreadCount = center?.unreadCount ?? 0;
  const loading = center?.loading ?? false;
  const error = center?.error ?? null;
  const fcm = center?.fcm;

  const { todayUnreadCount, opsCount, financeCount, unreadCategories } = useMemo(() => {
    let todayUnread = 0;
    let ops = 0;
    let finance = 0;
    const unreadSet = new Set<NotificationCategory>();

    for (const item of notifications) {
      const cat = resolveNotificationCategory(item);
      if (!item.isRead) {
        unreadSet.add(cat);
        if (isNotificationToday(item.sentAt)) todayUnread += 1;
      }
      if (cat === 'Appointment' || cat === 'Consignment') ops += 1;
      if (cat === 'Buyout' || cat === 'Payment') finance += 1;
    }

    return {
      todayUnreadCount: todayUnread,
      opsCount: ops,
      financeCount: finance,
      unreadCategories: unreadSet,
    };
  }, [notifications]);

  const readTabs = useMemo<Array<{ key: ReadFilterKey; label: string; count: number }>>(
    () => [
      { key: 'all', label: 'Tất cả', count: notifications.length },
      { key: 'unread', label: 'Chưa đọc', count: unreadCount },
      { key: 'today_unread', label: 'Hôm nay chưa đọc', count: todayUnreadCount },
      { key: 'read', label: 'Đã đọc', count: Math.max(0, notifications.length - unreadCount) },
    ],
    [notifications.length, unreadCount, todayUnreadCount],
  );

  // Keep sliding pill synchronized across responsive layouts & count updates
  useLayoutEffect(() => {
    const updateSlider = () => {
      const btn = tabButtonRefs.current[readFilter];
      const track = tabTrackRef.current;
      if (!btn || !track) return;
      setSliderStyle({
        left: btn.offsetLeft,
        top: btn.offsetTop,
        width: btn.offsetWidth,
        height: btn.offsetHeight,
        ready: true,
      });
    };

    updateSlider();
    if (typeof ResizeObserver === 'undefined' || !tabTrackRef.current) return;
    const observer = new ResizeObserver(updateSlider);
    observer.observe(tabTrackRef.current);
    return () => observer.disconnect();
  }, [readFilter, notifications.length, unreadCount, todayUnreadCount]);

  // Scoped list by Read filter (keeps category counts aligned with read tab)
  const statusScopedNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (readFilter === 'unread') return !item.isRead;
      if (readFilter === 'today_unread') return !item.isRead && isNotificationToday(item.sentAt);
      if (readFilter === 'read') return item.isRead;
      return true;
    });
  }, [notifications, readFilter]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: statusScopedNotifications.length };
    for (const item of statusScopedNotifications) {
      const cat = resolveNotificationCategory(item);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [statusScopedNotifications]);

  const filteredNotifications = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return statusScopedNotifications.filter((item) => {
      const cat = resolveNotificationCategory(item);
      if (summaryPreset === 'ops' && cat !== 'Appointment' && cat !== 'Consignment') {
        return false;
      }
      if (summaryPreset === 'finance' && cat !== 'Buyout' && cat !== 'Payment') {
        return false;
      }
      if (categoryFilter !== 'ALL' && cat !== categoryFilter) return false;
      if (keyword) {
        const text = `${item.title} ${item.content}`.toLowerCase();
        if (!text.includes(keyword)) return false;
      }
      return true;
    });
  }, [statusScopedNotifications, summaryPreset, categoryFilter, searchQuery]);

  const groupedNotifications = useMemo(
    () => groupNotificationsByTime(filteredNotifications),
    [filteredNotifications],
  );

  const selectedNotification = useMemo<Notification | null>(() => {
    if (viewMode !== 'split' || inspectorDismissed || filteredNotifications.length === 0) {
      return null;
    }
    return filteredNotifications.find((n) => n.id === selectedId) ?? filteredNotifications[0] ?? null;
  }, [viewMode, inspectorDismissed, filteredNotifications, selectedId]);

  const selectedIndex = useMemo(
    () => (selectedNotification ? filteredNotifications.findIndex((n) => n.id === selectedNotification.id) : -1),
    [filteredNotifications, selectedNotification],
  );

  // Keep active summary strip card synchronized with manual filter changes
  const activeSummaryCard: NotificationSummaryFilter | null = useMemo(() => {
    if (summaryPreset) return summaryPreset;
    if (readFilter === 'today_unread' && categoryFilter === 'ALL') return 'today_unread';
    if (readFilter === 'unread' && categoryFilter === 'ALL') return 'unread';
    return null;
  }, [summaryPreset, readFilter, categoryFilter]);

  const handleSummaryCardSelect = (card: NotificationSummaryFilter) => {
    if (activeSummaryCard === card) {
      setSummaryPreset(null);
      setReadFilter('all');
      setCategoryFilter('ALL');
      return;
    }

    if (card === 'today_unread') {
      setSummaryPreset(null);
      setReadFilter('today_unread');
      setCategoryFilter('ALL');
    } else if (card === 'unread') {
      setSummaryPreset(null);
      setReadFilter('unread');
      setCategoryFilter('ALL');
    } else {
      setSummaryPreset(card);
      setReadFilter('all');
      setCategoryFilter('ALL');
    }
  };

  const handleResetFilters = () => {
    setReadFilter('all');
    setCategoryFilter('ALL');
    setSummaryPreset(null);
    setSearchQuery('');
  };

  const handleMarkItemReadSmooth = useCallback(
    (itemId: string) => {
      if (!center) return;
      if (readFilter === 'unread' || readFilter === 'today_unread') {
        setFadingReadIds((prev) => ({ ...prev, [itemId]: true }));
        window.setTimeout(() => {
          void center.markAsRead(itemId);
          setFadingReadIds((prev) => {
            const next = { ...prev };
            delete next[itemId];
            return next;
          });
        }, 180);
      } else {
        void center.markAsRead(itemId);
      }
    },
    [center, readFilter],
  );

  const handleSelectItem = useCallback(
    (item: Notification) => {
      const targetLink = resolveNotificationTargetLink(item, isStaffOrAdmin);
      if (viewMode === 'list') {
        if (!item.isRead) void center?.markAsRead(item.id);
        if (targetLink && targetLink !== location.pathname) {
          navigate(targetLink);
        } else {
          setViewMode('split');
          setInspectorDismissed(false);
          setSelectedId(item.id);
        }
        return;
      }

      setInspectorDismissed(false);
      setSelectedId(item.id);
      if (!item.isRead) {
        void center?.markAsRead(item.id);
      }
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        window.requestAnimationFrame(() => {
          detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
    },
    [viewMode, center, isStaffOrAdmin, navigate, location.pathname],
  );

  const handleOpenItemTarget = useCallback(
    (item: Notification) => {
      if (!item.isRead) void center?.markAsRead(item.id);
      const targetLink = resolveNotificationTargetLink(item, isStaffOrAdmin);
      if (targetLink && targetLink !== location.pathname) {
        navigate(targetLink);
      } else {
        setViewMode('split');
        setInspectorDismissed(false);
        setSelectedId(item.id);
      }
    },
    [center, isStaffOrAdmin, navigate, location.pathname],
  );

  const handleStepInspector = useCallback(
    (delta: -1 | 1) => {
      if (filteredNotifications.length === 0) return;
      const baseIdx = selectedIndex >= 0 ? selectedIndex : 0;
      const nextIdx = Math.max(0, Math.min(filteredNotifications.length - 1, baseIdx + delta));
      const nextItem = filteredNotifications[nextIdx];
      if (!nextItem) return;
      setInspectorDismissed(false);
      setSelectedId(nextItem.id);
      if (!nextItem.isRead) void center?.markAsRead(nextItem.id);
    },
    [filteredNotifications, selectedIndex, center],
  );

  // Keyboard shortcuts: `/` searches, `ArrowUp`/`ArrowDown` steps through inbox, `Enter` navigates
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(target?.isContentEditable);

      if (event.key === '/' && !isEditable && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        searchContainerRef.current?.querySelector('input')?.focus();
        return;
      }

      if (isEditable || filteredNotifications.length === 0) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const delta: -1 | 1 = event.key === 'ArrowDown' ? 1 : -1;
        if (viewMode !== 'split') setViewMode('split');
        const nextIdx =
          selectedIndex < 0
            ? 0
            : Math.max(0, Math.min(filteredNotifications.length - 1, selectedIndex + delta));
        const nextItem = filteredNotifications[nextIdx];
        if (nextItem) {
          setInspectorDismissed(false);
          setSelectedId(nextItem.id);
          if (!nextItem.isRead) void center?.markAsRead(nextItem.id);
        }
      } else if (event.key === 'Enter' && selectedNotification && tag !== 'BUTTON' && tag !== 'A') {
        event.preventDefault();
        handleOpenItemTarget(selectedNotification);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredNotifications, selectedIndex, selectedNotification, viewMode, center, handleOpenItemTarget]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  if (isStaffOrAdmin && location.pathname === '/notifications') {
    return <Navigate to="/shop/notifications" replace />;
  }

  const hasFilterOverride = Boolean(
    searchQuery.trim() || categoryFilter !== 'ALL' || readFilter !== 'all' || summaryPreset,
  );

  const handleTogglePush = async (enable: boolean) => {
    if (!fcm) return;
    setTogglingPush(true);
    try {
      if (enable) {
        const token = await fcm.requestPermissionAndRegister();
        if (token) toast.success('Đã bật thông báo đẩy trên trình duyệt này.');
      } else {
        await fcm.unregister();
        toast.success('Đã tắt thông báo đẩy trên thiết bị này.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái thông báo đẩy.');
    } finally {
      setTogglingPush(false);
    }
  };

  const handleCopyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard?.writeText(value);
      setCopiedKey(key);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedKey(null), 1500);
      toast.success(`Đã sao chép ${value}`);
    } catch {
      toast.error('Không thể sao chép vào clipboard.');
    }
  };

  const emptyStateCopy = useMemo(() => {
    if (searchQuery.trim() || categoryFilter !== 'ALL' || summaryPreset) {
      return {
        title: 'Không tìm thấy thông báo phù hợp',
        description: 'Thử đổi nhóm tóm tắt, danh mục hoặc từ khóa để xem các thông báo khác.',
        showReset: true,
      };
    }
    if (readFilter === 'unread') {
      return {
        title: 'Bạn đã đọc hết tất cả thông báo',
        description: 'Mọi cập nhật quan trọng đều đã được đánh dấu đã đọc.',
        showReset: true,
      };
    }
    if (readFilter === 'today_unread') {
      return {
        title: 'Không có tin chưa đọc nào trong hôm nay',
        description: 'Bạn đã xử lý xong các thông báo mới phát sinh hôm nay.',
        showReset: true,
      };
    }
    if (readFilter === 'read') {
      return {
        title: 'Chưa có thông báo nào được đánh dấu đã đọc',
        description: 'Khi bạn xem hoặc đánh dấu đã đọc một thông báo, lịch sử sẽ lưu tại đây.',
        showReset: true,
      };
    }
    return {
      title: 'Chưa có thông báo nào',
      description: 'Khi có lịch hẹn mới, cập nhật hợp đồng ký gửi, thu mua hoặc thanh toán, thông báo sẽ xuất hiện tại đây.',
      showReset: false,
    };
  }, [searchQuery, categoryFilter, summaryPreset, readFilter]);

  const splitOpen = viewMode === 'split' && selectedNotification !== null;

  const inspectorMeta = selectedNotification
    ? getNotificationCategoryMeta(selectedNotification)
    : null;
  const inspectorTargetLink = selectedNotification
    ? resolveNotificationTargetLink(selectedNotification, isStaffOrAdmin)
    : '';
  const inspectorExtracted = selectedNotification
    ? extractNotificationMetadata(`${selectedNotification.title} ${selectedNotification.content}`)
    : { codes: [], amounts: [] };

  const headerControls = (
    <div className="flex flex-wrap items-center gap-2">
      <NotificationPushPopover
        fcm={fcm}
        toggling={togglingPush}
        onTogglePush={handleTogglePush}
      />
      {unreadCount > 0 && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void center?.markAllAsRead()}
          startIcon={<CheckCheck size={14} aria-hidden="true" />}
        >
          Đọc tất cả ({unreadCount})
        </Button>
      )}
    </div>
  );

  const content = (
    <div className="space-y-4">
      {/* 4-Card Interactive Editorial Summary Strip */}
      <NotificationSummaryStrip
        todayUnreadCount={todayUnreadCount}
        unreadCount={unreadCount}
        opsCount={opsCount}
        financeCount={financeCount}
        activeFilter={activeSummaryCard}
        onSelectFilter={handleSummaryCardSelect}
      />

      {/* Unified Inbox Toolbar */}
      <Card>
        <div className="flex flex-col gap-3">
          {/* Hàng 1: Tìm kiếm rộng + Làm mới + Chế độ xem (cùng chiều cao ~42px, không bị rớt dòng lửng) */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div ref={searchContainerRef} className="min-w-0 flex-1">
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo mã phiếu, tiêu đề hoặc nội dung... (phím /)"
                aria-label="Tìm kiếm thông báo"
                startAdornment={<Search size={15} aria-hidden="true" />}
                endAdornment={
                  searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Xóa từ khóa tìm kiếm"
                      className="rounded p-0.5 text-muted transition hover:bg-surface-subtle hover:text-ink"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  ) : undefined
                }
              />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                onClick={() => void center?.fetchNotifications()}
                loading={loading}
                startIcon={<RefreshCw size={15} aria-hidden="true" />}
              >
                Làm mới
              </Button>

              {/* View Mode Switcher với pill trượt phẳng, khớp chiều cao nút & input */}
              <div
                role="group"
                aria-label="Chế độ hiển thị"
                className="relative hidden lg:grid grid-cols-2 rounded-xl border border-border bg-surface p-1"
              >
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-white shadow-2xs transition-transform duration-200 ease-out motion-reduce:transition-none ${
                    viewMode === 'list' ? 'translate-x-full' : 'translate-x-0'
                  }`}
                />
                <button
                  type="button"
                  aria-pressed={viewMode === 'split'}
                  onClick={() => {
                    setViewMode('split');
                    setInspectorDismissed(false);
                  }}
                  title="Chế độ chia đôi xem nhanh"
                  className={`relative z-10 inline-flex h-8 cursor-pointer select-none items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight ${
                    viewMode === 'split'
                      ? 'text-ink'
                      : 'text-text-secondary hover:text-ink'
                  }`}
                >
                  <Columns2 size={14} aria-hidden="true" />
                  <span>Xem nhanh</span>
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === 'list'}
                  onClick={() => {
                    setViewMode('list');
                  }}
                  title="Chế độ danh sách rộng"
                  className={`relative z-10 inline-flex h-8 cursor-pointer select-none items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight ${
                    viewMode === 'list'
                      ? 'text-ink'
                      : 'text-text-secondary hover:text-ink'
                  }`}
                >
                  <List size={14} aria-hidden="true" />
                  <span>Danh sách</span>
                </button>
              </div>
            </div>
          </div>

          {/* Hàng 2: Thanh tab trạng thái đọc trên 1 hàng gọn + thống kê kết quả */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              ref={tabTrackRef}
              className="relative inline-flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-xl bg-surface p-1 [scrollbar-width:none]"
            >
              {sliderStyle.ready && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 left-0 rounded-lg bg-white shadow-2xs transition-all duration-200 ease-out motion-reduce:transition-none"
                  style={{
                    transform: `translate(${sliderStyle.left}px, ${sliderStyle.top}px)`,
                    width: `${sliderStyle.width}px`,
                    height: `${sliderStyle.height}px`,
                  }}
                />
              )}
              {readTabs.map((tab) => {
                const isActive = readFilter === tab.key && !summaryPreset;
                return (
                  <button
                    key={tab.key}
                    ref={(el) => {
                      tabButtonRefs.current[tab.key] = el;
                    }}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      setSummaryPreset(null);
                      setReadFilter(tab.key);
                    }}
                    className={`relative z-10 inline-flex min-h-8 cursor-pointer select-none shrink-0 items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-colors whitespace-nowrap focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight ${
                      isActive
                        ? tab.key === 'unread' || tab.key === 'today_unread'
                          ? 'text-brand-highlight'
                          : 'text-ink'
                        : 'text-text-secondary hover:text-ink'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                        isActive
                          ? tab.key === 'unread' || tab.key === 'today_unread'
                            ? 'bg-brand-pink-light text-brand-highlight'
                            : 'bg-surface text-ink'
                          : 'bg-paper/80 text-muted'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="tabular-nums">
                Hiển thị <strong className="text-ink">{filteredNotifications.length}</strong> / {notifications.length} tin
              </span>
              {hasFilterOverride && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="cursor-pointer font-semibold text-brand-highlight hover:underline whitespace-nowrap"
                >
                  Đặt lại
                </button>
              )}
            </div>
          </div>

          {/* Business Category filter pills */}
          <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto border-t border-border/60 pt-3 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {NOTIFICATION_FILTER_TABS.map((tab) => {
              const active = categoryFilter === tab.key && !summaryPreset;
              const count = categoryCounts[tab.key] ?? 0;
              const hasUnreadInCategory =
                tab.key !== 'ALL' && unreadCategories.has(tab.key);
              const icon =
                tab.key === 'ALL' ? (
                  <Bell size={13} aria-hidden="true" />
                ) : (
                  NOTIFICATION_CATEGORIES[tab.key].renderIcon(13)
                );

              return (
                <button
                  key={tab.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setSummaryPreset(null);
                    setCategoryFilter(tab.key);
                  }}
                  className={`inline-flex min-h-8 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight ${
                    active
                      ? 'border-ink bg-ink text-paper shadow-2xs'
                      : 'border-border bg-white text-text-secondary hover:border-brand-highlight/60 hover:bg-brand-pink-surface/50 hover:text-ink'
                  }`}
                >
                  {icon}
                  <span>{tab.label}</span>
                  {hasUnreadInCategory && !active && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-brand-highlight"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
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

            {summaryPreset && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="ml-auto inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1 rounded-xl border border-brand-highlight/50 bg-brand-pink-surface px-2.5 py-1 text-xs font-semibold text-brand-ink transition hover:bg-brand-pink-light"
              >
                <span>
                  Nhóm: {summaryPreset === 'ops' ? 'Lịch hẹn & Ký gửi' : 'Thu mua & Thanh toán'}
                </span>
                <X size={12} aria-hidden="true" />
              </button>
            )}
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
            onClick: () => void center?.fetchNotifications(),
          }}
        />
      )}

      {/* Smart Split-Pane Inbox: Left Vertical Timeline Feed + Right Quick Preview Panel */}
      <DetailSplitLayout open={splitOpen}>
        <Card className="overflow-hidden p-0">
          <div className="h-0.5 w-full overflow-hidden bg-transparent" aria-hidden="true">
            {loading && notifications.length > 0 && (
              <div className="animate-inv-progress-indeterminate h-full w-1/3 bg-brand-highlight" />
            )}
          </div>

          <div className="p-4 sm:p-5">
            {loading && notifications.length === 0 ? (
              <SkeletonLoading
                variant="list"
                count={5}
                label="Đang tải danh sách thông báo..."
              />
            ) : groupedNotifications.length === 0 ? (
              <EmptyState
                title={emptyStateCopy.title}
                description={emptyStateCopy.description}
                action={
                  emptyStateCopy.showReset && hasFilterOverride ? (
                    <Button size="sm" variant="outline" onClick={handleResetFilters}>
                      Xem tất cả thông báo
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-6">
                {groupedNotifications.map((group) => (
                  <section key={group.key} aria-label={group.label}>
                    <div className="mb-3 flex items-center gap-3 px-1">
                      <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted">
                        {group.label}
                      </h2>
                      <span className="h-px flex-1 bg-border/70" aria-hidden="true" />
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold text-muted">
                        {group.items.length} tin
                      </span>
                    </div>

                    {/* Vertical Timeline Feed */}
                    <div className="relative space-y-2 border-l border-border/80 pl-4 ml-3 sm:ml-4 sm:pl-5">
                      {group.items.map((item) => {
                        const meta = getNotificationCategoryMeta(item);
                        const highlights = extractNotificationHighlights(
                          `${item.title} ${item.content}`,
                        );
                        const isSelected = viewMode === 'split' && selectedNotification?.id === item.id;
                        const isFading = Boolean(fadingReadIds[item.id]);

                        return (
                          <article
                            key={item.id}
                            onClick={() => handleSelectItem(item)}
                            onDoubleClick={() => handleOpenItemTarget(item)}
                            title={
                              viewMode === 'split'
                                ? 'Nhấp để xem nhanh · Nhấp đúp để mở trang xử lý'
                                : 'Nhấp để mở trang xử lý'
                            }
                            className={`group relative flex cursor-pointer flex-col gap-3 rounded-xl border p-3.5 transition-all duration-200 sm:flex-row sm:items-stretch sm:justify-between ${
                              isFading ? 'opacity-40 scale-[0.99]' : ''
                            } ${
                              isSelected
                                ? 'border-brand-highlight bg-brand-pink-surface shadow-[inset_3px_0_0_0_var(--color-brand-highlight)]'
                                : !item.isRead
                                  ? 'border-brand-pink-light bg-brand-pink-surface/60 shadow-[inset_3px_0_0_0_var(--color-brand-highlight)] hover:bg-brand-pink-light/45'
                                  : 'border-border/70 bg-paper hover:border-border hover:bg-surface/50'
                            }`}
                          >
                            {/* Timeline dot on the vertical axis */}
                            <span
                              aria-hidden="true"
                              className={`absolute -left-[21px] top-5 h-2.5 w-2.5 rounded-full border-2 border-paper sm:-left-[25px] ${
                                !item.isRead || isSelected
                                  ? 'bg-brand-highlight'
                                  : 'bg-border'
                              }`}
                            />

                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <div
                                title={meta.label}
                                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.iconBgClass}`}
                              >
                                {meta.renderIcon(17)}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2 sm:block">
                                  <h3 className="min-w-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectItem(item);
                                      }}
                                      className={`text-left break-words text-sm leading-snug transition-colors group-hover:text-brand-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight ${
                                        item.isRead
                                          ? 'font-semibold text-ink'
                                          : 'font-bold text-brand-ink'
                                      }`}
                                    >
                                      {item.title}
                                    </button>
                                  </h3>

                                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted sm:hidden">
                                    {!item.isRead && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-pink-light px-2 py-0.5 text-[11px] font-bold text-brand-highlight">
                                        <span
                                          className="h-1.5 w-1.5 rounded-full bg-brand-highlight"
                                          aria-hidden="true"
                                        />
                                        Mới
                                      </span>
                                    )}
                                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                      <Clock size={11} aria-hidden="true" />
                                      {formatNotificationRelativeTime(item.sentAt)}
                                    </span>
                                  </div>
                                </div>

                                <p
                                  className={`mt-1 break-words text-xs leading-relaxed text-text-secondary ${
                                    splitOpen ? 'line-clamp-2' : 'sm:text-sm'
                                  }`}
                                >
                                  {item.content}
                                </p>

                                {highlights.length > 0 && (
                                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    {highlights.map((chip, idx) => {
                                      const formatted = formatHighlightChip(chip);
                                      const key = `list-${item.id}-${idx}`;
                                      const isCopied = copiedKey === key;

                                      if (!formatted.isCode) {
                                        return (
                                          <span
                                            key={chip}
                                            className="inline-flex items-center rounded-md border border-border bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-ink"
                                          >
                                            {formatted.label}
                                          </span>
                                        );
                                      }

                                      return (
                                        <button
                                          key={chip}
                                          type="button"
                                          title={`Nhấn để sao chép ${formatted.copyValue}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            void handleCopyValue(key, formatted.copyValue);
                                          }}
                                          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-ink transition hover:border-brand-highlight"
                                        >
                                          <span>{formatted.label}</span>
                                          {isCopied ? (
                                            <Check size={11} className="text-state-success" aria-hidden="true" />
                                          ) : (
                                            <Copy size={11} className="text-muted" aria-hidden="true" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div
                              className="flex shrink-0 items-center justify-end gap-1.5 sm:flex-col sm:items-end sm:justify-between"
                              onClick={(e) => e.stopPropagation()}
                              onDoubleClick={(e) => e.stopPropagation()}
                            >
                              <div className="hidden items-center gap-2 text-xs text-muted sm:flex">
                                {!item.isRead && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-pink-light px-2 py-0.5 text-[11px] font-bold text-brand-highlight">
                                    <span
                                      className="h-1.5 w-1.5 rounded-full bg-brand-highlight"
                                      aria-hidden="true"
                                    />
                                    Mới
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                  <Clock size={11} aria-hidden="true" />
                                  {formatNotificationRelativeTime(item.sentAt)}
                                </span>
                              </div>

                              {(!item.isRead || !splitOpen) && (
                                <div className="flex items-center gap-1.5">
                                  {!item.isRead && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleMarkItemReadSmooth(item.id)}
                                      startIcon={<Check size={13} aria-hidden="true" />}
                                    >
                                      Đã đọc
                                    </Button>
                                  )}
                                  {!splitOpen && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenItemTarget(item)}
                                      endIcon={<ArrowRight size={13} aria-hidden="true" />}
                                    >
                                      Xem chi tiết
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}

                {center?.canLoadMore && (
                  <div className="flex flex-col items-center gap-2 border-t border-border/60 pt-5">
                    <p className="text-xs text-muted">
                      Đang hiển thị {notifications.length} thông báo gần nhất
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      loading={loading}
                      onClick={() => void center.loadMore()}
                    >
                      Tải thêm thông báo (tối đa 200 tin)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Right Slide-In Quick Inspector Panel */}
        {splitOpen && selectedNotification && inspectorMeta && (
          <DetailPanel
            panelRef={detailPanelRef}
            title="Chi tiết thông báo"
            description={
              formatNotificationFullDateTime(selectedNotification.sentAt) ||
              formatNotificationRelativeTime(selectedNotification.sentAt)
            }
            onClose={() => setInspectorDismissed(true)}
            className="animate-inv-panel-in border border-border shadow-sm"
          >
            <div className="flex min-h-[25rem] flex-col justify-between p-5">
              <div className="space-y-5">
                {/* Hero: Icon danh mục + Tiêu đề + Trạng thái */}
                <div className="flex items-start gap-3.5">
                  <span
                    className={`inline-flex size-11 shrink-0 items-center justify-center rounded-2xl ${inspectorMeta.iconBgClass}`}
                  >
                    {inspectorMeta.renderIcon(20)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <h4 className="break-words text-base font-bold leading-snug text-brand-ink">
                      {selectedNotification.title}
                    </h4>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant={inspectorMeta.badgeVariant}>{inspectorMeta.label}</Badge>
                      {!selectedNotification.isRead ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-pink-light px-2 py-0.5 text-[11px] font-bold text-brand-highlight">
                          <span className="h-1.5 w-1.5 rounded-full bg-brand-highlight" aria-hidden="true" />
                          Chưa đọc
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-muted">Đã đọc</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nội dung thông báo trên nền trắng sạch, đường nhấn mảnh bên trái */}
                <div className="border-t border-border/60 pt-4">
                  <p className="border-l-2 border-brand-pink-light pl-3.5 text-sm leading-relaxed text-ink">
                    {selectedNotification.content}
                  </p>
                </div>

                {/* Thông tin trích xuất dạng dòng thoáng theo chuẩn InventoryDetailPanel */}
                {(inspectorExtracted.codes.length > 0 || inspectorExtracted.amounts.length > 0) && (
                  <dl className="space-y-2.5 border-t border-border/60 pt-4 text-sm">
                    {inspectorExtracted.codes.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <dt className="text-xs font-medium text-text-secondary">Mã tham chiếu</dt>
                        <dd className="flex flex-wrap justify-end gap-1.5">
                          {inspectorExtracted.codes.map((code, idx) => {
                            const formatted = formatHighlightChip(code);
                            const key = `detail-${selectedNotification.id}-${idx}`;
                            const isCopied = copiedKey === key;
                            return (
                              <button
                                key={code}
                                type="button"
                                onClick={() => void handleCopyValue(key, formatted.copyValue)}
                                title={`Sao chép ${formatted.copyValue}`}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-surface-dashboard px-2.5 py-1 font-mono text-xs font-semibold text-brand-ink transition hover:bg-brand-pink-light hover:text-brand-highlight focus-visible:outline-2 focus-visible:outline-brand-highlight"
                              >
                                <span>{formatted.label}</span>
                                {isCopied ? (
                                  <Check size={12} className="text-state-success" aria-hidden="true" />
                                ) : (
                                  <Copy size={11} className="text-muted" aria-hidden="true" />
                                )}
                              </button>
                            );
                          })}
                        </dd>
                      </div>
                    )}

                    {inspectorExtracted.amounts.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <dt className="text-xs font-medium text-text-secondary">Giá trị ghi nhận</dt>
                        <dd className="flex flex-wrap justify-end gap-2">
                          {inspectorExtracted.amounts.map((amount) => (
                            <span
                              key={amount}
                              className="text-base font-bold tabular-nums text-brand-highlight"
                            >
                              {amount}
                            </span>
                          ))}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>

              {/* Chân panel cố định vị trí: Hành động + Tin trước / Tin tiếp */}
              <div className="mt-6 space-y-3 border-t border-border/60 pt-4">
                {((inspectorTargetLink && inspectorTargetLink !== location.pathname) ||
                  !selectedNotification.isRead) && (
                  <div className="flex flex-col gap-2">
                    {inspectorTargetLink && inspectorTargetLink !== location.pathname && (
                      <Button
                        className="w-full"
                        onClick={() => handleOpenItemTarget(selectedNotification)}
                        endIcon={<ArrowRight size={15} aria-hidden="true" />}
                      >
                        {getNotificationActionLabel(
                          resolveNotificationCategory(selectedNotification),
                          isStaffOrAdmin,
                        )}
                      </Button>
                    )}

                    {!selectedNotification.isRead && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => void center?.markAsRead(selectedNotification.id)}
                        startIcon={<Check size={14} aria-hidden="true" />}
                      >
                        Đánh dấu đã đọc
                      </Button>
                    )}
                  </div>
                )}

                {filteredNotifications.length > 1 && selectedIndex >= 0 && (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      disabled={selectedIndex <= 0}
                      onClick={() => handleStepInspector(-1)}
                      className="inline-flex min-h-8 cursor-pointer select-none items-center gap-1 rounded-lg px-2.5 py-1 font-semibold text-ink transition-colors hover:bg-brand-pink-surface hover:text-brand-highlight focus:outline-none focus-visible:outline-2 focus-visible:outline-brand-highlight disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-ink"
                    >
                      <ChevronLeft size={14} aria-hidden="true" />
                      <span>Tin trước</span>
                    </button>

                    <span className="text-xs font-medium tabular-nums text-muted">
                      {selectedIndex + 1} / {filteredNotifications.length}
                    </span>

                    <button
                      type="button"
                      disabled={selectedIndex >= filteredNotifications.length - 1}
                      onClick={() => handleStepInspector(1)}
                      className="inline-flex min-h-8 cursor-pointer select-none items-center gap-1 rounded-lg px-2.5 py-1 font-semibold text-ink transition-colors hover:bg-brand-pink-surface hover:text-brand-highlight focus:outline-none focus-visible:outline-2 focus-visible:outline-brand-highlight disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-ink"
                    >
                      <span>Tin tiếp</span>
                      <ChevronRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </DetailPanel>
        )}
      </DetailSplitLayout>
    </div>
  );

  if (isStaffOrAdmin) {
    const fallbackWorkspace = firstAllowedScreen(user?.permissions ?? []) ?? '/';
    return (
      <ContractPageLayout
        activeItem={null}
        backTo={fallbackWorkspace}
        backLabel="Trang làm việc"
        title="Trung Tâm Thông Báo Hệ Thống"
        description="Theo dõi thông báo lịch hẹn, hợp đồng ký gửi, thu mua và thanh toán theo thời gian thực."
        icon={<Bell size={22} aria-hidden="true" />}
        headerActions={headerControls}
      >
        {content}
      </ContractPageLayout>
    );
  }

  return (
    <div className="mx-auto w-[min(calc(100%_-_2.5rem),1180px)] py-8 sm:py-12">
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
        {headerControls}
      </div>
      {content}
    </div>
  );
};

export default NotificationsPage;
