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
  fetchNotifications: (limit?: number) => Promise<void>;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(
    async (limit = 50) => {
      if (!user?.id) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      try {
        setLoading(true);
        const res = await notificationApi.getMyNotifications(limit);
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

  const handleForegroundMessage = useCallback(
    (payload: MessagePayload) => {
      void fetchNotifications();

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

      toast.show({
        variant: meta.toastVariant,
        title,
        description: content,
        duration: 5500,
        action: targetLink
          ? {
              label: 'Xem ngay',
              onClick: () => navigate(targetLink),
            }
          : undefined,
      });
    },
    [fetchNotifications, isStaffOrAdmin, navigate, toast],
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

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await notificationApi.markAsRead(id);
        setNotifications((prev) =>
          prev.map((n) => {
            if (n.id === id && !n.isRead) {
              setUnreadCount((count) => Math.max(0, count - 1));
              return { ...n, isRead: true };
            }
            return n;
          }),
        );
      } catch {
        setError('Không thể cập nhật trạng thái thông báo.');
        toast.error('Không thể cập nhật thông báo. Vui lòng thử lại.');
      }
    },
    [toast],
  );

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu đọc tất cả thông báo.');
    } catch {
      setError('Không thể cập nhật thông báo. Vui lòng thử lại.');
      toast.error('Không thể cập nhật thông báo. Vui lòng thử lại.');
    }
  }, [toast]);

  const value = useMemo<NotificationCenterContextValue>(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      fetchNotifications,
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
      fetchNotifications,
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
