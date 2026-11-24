import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { MessagePayload } from 'firebase/messaging';
import { notificationApi, type FcmStatusResponse, type TestNotificationResponse } from '@/api/notificationApi';
import type { Notification } from '@/types';
import { useFcm } from '@/hooks/useFcm';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  getNotificationCategoryMeta,
  resolveNotificationTargetLink,
} from '@/components/notifications/notificationMeta';

export interface NotificationCenterContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  currentLimit: number;
  canLoadMore: boolean;
  fetchNotifications: (limit?: number) => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fcm: {
    fcmToken: string | null;
    permission: NotificationPermission;
    status: FcmStatusResponse | null;
    isPushActive: boolean;
    isFirebaseClientConfigured: boolean;
    isServerConfigured: boolean;
    loading: boolean;
    error: string | null;
    requestPermissionAndRegister: () => Promise<string | null>;
    unregister: () => Promise<void>;
    sendTestNotification: (category?: string) => Promise<TestNotificationResponse>;
    refreshStatus: () => Promise<FcmStatusResponse | null>;
  };
}

const NotificationCenterContext = createContext<NotificationCenterContextValue | null>(null);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isStaffOrAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentLimit, setCurrentLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notificationsRef = React.useRef<Notification[]>(notifications);
  notificationsRef.current = notifications;
  const limitRef = React.useRef(50);
  const toastRef = React.useRef(toast);
  toastRef.current = toast;

  const markAsRead = useCallback(
    async (id: string) => {
      const wasUnread = notificationsRef.current.some(
        (n) => n.id === id && !n.isRead,
      );
      if (wasUnread) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      try {
        await notificationApi.markAsRead(id);
      } catch {
        if (wasUnread) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)),
          );
          setUnreadCount((count) => count + 1);
        }
        toastRef.current.error('Không thể cập nhật thông báo. Vui lòng thử lại.');
      }
    },
    [],
  );

  const fetchNotifications = useCallback(
    async (limit?: number) => {
      if (!user?.id) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      const nextLimit = limit !== undefined ? Math.min(200, Math.max(1, limit)) : limitRef.current;
      limitRef.current = nextLimit;
      setCurrentLimit(nextLimit);
      try {
        setLoading(true);
        const res = await notificationApi.getMyNotifications(nextLimit);
        setNotifications(res.data);
        setUnreadCount(res.unreadCount);
        setError(null);
      } catch {
        setError('Không thể tải thông báo. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    },
    [user?.id],
  );

  const loadMore = useCallback(async () => {
    const nextLimit = Math.min(200, limitRef.current + 50);
    if (nextLimit <= limitRef.current) return;
    await fetchNotifications(nextLimit);
  }, [fetchNotifications]);

  const handleForegroundMessage = useCallback(
    (payload: MessagePayload) => {
      void fetchNotifications();

      const notificationId = payload.data?.notificationId;
      const title =
        payload.notification?.title ||
        payload.data?.title ||
        'Thông báo mới từ OCS';
      const content =
        payload.notification?.body ||
        payload.data?.body ||
        'Bạn vừa nhận được một thông báo mới.';
      const category = payload.data?.category;
      const link = payload.data?.link || payload.data?.url;

      const meta = getNotificationCategoryMeta({
        category,
        type: payload.data?.type ?? 0,
        title,
        content,
      });

      const targetLink = resolveNotificationTargetLink(
        {
          link,
          category,
          type: payload.data?.type ?? 0,
          title,
          content,
        },
        isStaffOrAdmin,
      );

      const isSamePage =
        typeof window !== 'undefined' && window.location.pathname === targetLink;

      toastRef.current.show({
        id: notificationId ? `ocs-noti-${notificationId}` : undefined,
        variant: meta.toastVariant,
        tag: meta.label,
        title,
        description: content,
        duration: 5500,
        action:
          targetLink && !isSamePage
            ? {
                label: 'Xem ngay',
                onClick: () => {
                  if (notificationId) void markAsRead(notificationId);
                  navigate(targetLink);
                },
              }
            : notificationId
              ? {
                  label: 'Đánh dấu đã đọc',
                  onClick: () => {
                    void markAsRead(notificationId);
                  },
                }
              : undefined,
      });
    },
    [fetchNotifications, isStaffOrAdmin, markAsRead, navigate],
  );

  const fcmHook = useFcm({
    enabled: Boolean(user?.id),
    userId: user?.id,
    onForegroundMessage: handleForegroundMessage,
  });

  const sendCategoryTestNotification = useCallback(
    async (category?: string): Promise<TestNotificationResponse> => {
      const noti = await notificationApi.sendTestNotification(category);
      await fcmHook.refreshStatus();
      await fetchNotifications();
      return noti;
    },
    [fcmHook, fetchNotifications],
  );

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      return;
    }

    void fetchNotifications();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchNotifications();
      }
    }, 8000);

    const handleFocus = () => void fetchNotifications();
    const handleCustomRefresh = () => void fetchNotifications();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('ocs:notification:refresh', handleCustomRefresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('ocs:notification:refresh', handleCustomRefresh);
    };
  }, [user?.id, fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toastRef.current.success('Đã đánh dấu đọc tất cả thông báo.');
    } catch {
      toastRef.current.error('Không thể cập nhật thông báo. Vui lòng thử lại.');
    }
  }, []);

  const canLoadMore = notifications.length >= currentLimit && currentLimit < 200;

  const value = useMemo<NotificationCenterContextValue>(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      currentLimit,
      canLoadMore,
      fetchNotifications,
      loadMore,
      markAsRead,
      markAllAsRead,
      fcm: {
        fcmToken: fcmHook.fcmToken,
        permission: fcmHook.permission,
        status: fcmHook.status,
        isPushActive: fcmHook.isPushActive,
        isFirebaseClientConfigured: fcmHook.isFirebaseClientConfigured,
        isServerConfigured: fcmHook.isServerConfigured,
        loading: fcmHook.loading,
        error: fcmHook.error,
        requestPermissionAndRegister: fcmHook.requestPermissionAndRegister,
        unregister: fcmHook.unregister,
        sendTestNotification: sendCategoryTestNotification,
        refreshStatus: fcmHook.refreshStatus,
      },
    }),
    [
      notifications,
      unreadCount,
      loading,
      error,
      currentLimit,
      canLoadMore,
      fetchNotifications,
      loadMore,
      markAsRead,
      markAllAsRead,
      fcmHook,
      sendCategoryTestNotification,
    ],
  );

  return (
    <NotificationCenterContext.Provider value={value}>
      {children}
    </NotificationCenterContext.Provider>
  );
};

export function useNotificationCenter(): NotificationCenterContextValue | null {
  return useContext(NotificationCenterContext);
}
