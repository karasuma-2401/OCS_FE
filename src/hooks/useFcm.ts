import { useEffect, useState, useCallback, useRef } from 'react';
import { getToken, onMessage, type MessagePayload } from 'firebase/messaging';
import {
  getFirebaseMessagingInstance,
  isFirebaseClientConfigured,
  firebaseVapidKey,
} from '@/config/firebase';
import { notificationApi, type FcmStatusResponse } from '@/api/notificationApi';

export interface UseFcmOptions {
  enabled?: boolean;
  userId?: string;
  onForegroundMessage?: (payload: MessagePayload) => void;
}

export function useFcm(options: UseFcmOptions = {}) {
  const { enabled = true, userId, onForegroundMessage } = options;
  const [fcmToken, setFcmToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const active = localStorage.getItem('ocs_active_fcm_token');
      // Loại bỏ hoàn toàn token giả dev nếu từng lưu trước đây
      if (active && active.startsWith('web-dev-')) {
        localStorage.removeItem('ocs_active_fcm_token');
        return null;
      }
      return active;
    }
    return null;
  });

  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default',
  );
  const [status, setStatus] = useState<FcmStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Xóa sạch các token giả dev cũ trong localStorage khi khởi tạo
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ocs_dev_fcm_token');
      const active = localStorage.getItem('ocs_active_fcm_token');
      if (active && active.startsWith('web-dev-')) {
        localStorage.removeItem('ocs_active_fcm_token');
      }
    }
  }, []);

  // Đăng ký Service Worker vào trình duyệt
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js', { scope: '/' })
      .then((reg) => {
        reg.update().catch(() => {});
      })
      .catch((err) => {
        console.warn('Không thể cài đặt Service Worker:', err);
      });
  }, []);

  // Lấy trạng thái cấu hình và số thiết bị từ Backend
  const refreshStatus = useCallback(async () => {
    try {
      const serverStatus = await notificationApi.getFcmStatus();
      setStatus(serverStatus);
      return serverStatus;
    } catch {
      return null;
    }
  }, []);

  // Yêu cầu quyền thông báo và đăng ký token FCM THẬT với Backend
  const requestPermissionAndRegister = useCallback(async (): Promise<string | null> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setError('Trình duyệt không hỗ trợ thông báo đẩy.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setError('Quyền thông báo chưa được cấp bởi người dùng.');
        return null;
      }

      if (!isFirebaseClientConfigured) {
        setError('Firebase Client chưa được cấu hình (thiếu biến môi trường VITE_FIREBASE_*).');
        return null;
      }

      // Đảm bảo Service Worker đã sẵn sàng
      let swRegistration: ServiceWorkerRegistration | undefined;
      if ('serviceWorker' in navigator) {
        try {
          swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
          const readyReg = await navigator.serviceWorker.ready;
          if (readyReg) {
            swRegistration = readyReg;
          }
        } catch {
          // SW registration failed
        }
      }

      const messaging = await getFirebaseMessagingInstance();
      if (!messaging) {
        setError('Không thể khởi tạo Firebase Messaging trên trình duyệt.');
        return null;
      }

      // Lấy token FCM THẬT từ Google Firebase Push Service (không tạo token giả web-dev-)
      const token = await getToken(messaging, {
        vapidKey: firebaseVapidKey,
        serviceWorkerRegistration: swRegistration,
      });

      if (!token) {
        setError('Không nhận được mã thiết bị FCM từ Firebase.');
        return null;
      }

      setFcmToken(token);
      localStorage.setItem('ocs_active_fcm_token', token);
      if (userId) {
        localStorage.setItem(`ocs_fcm_synced_${userId}`, token);
      }

      // Đăng ký token thật lên Backend
      await notificationApi.registerFcmToken(token, 'Web');
      await refreshStatus();

      return token;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể đăng ký token thông báo.';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refreshStatus, userId]);

  // Hủy đăng ký token của thiết bị hiện tại
  const unregister = useCallback(async () => {
    const targetToken = fcmToken || localStorage.getItem('ocs_active_fcm_token');
    if (!targetToken) return;
    try {
      await notificationApi.unregisterFcmToken(targetToken);
    } catch {
      // Ignore network errors on unregister
    } finally {
      localStorage.removeItem('ocs_active_fcm_token');
      if (userId) {
        localStorage.removeItem(`ocs_fcm_synced_${userId}`);
      }
      setFcmToken(null);
      await refreshStatus();
    }
  }, [fcmToken, refreshStatus, userId]);

  // Gửi thông báo thử nghiệm từ máy chủ
  const sendTestNotification = useCallback(async () => {
    try {
      const noti = await notificationApi.sendTestNotification();
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(noti.title, {
          body: noti.content,
          icon: '/mascot-logo.png',
        });
      }
      await refreshStatus();
      return noti;
    } catch {
      throw new Error('Không thể gửi thông báo thử nghiệm.');
    }
  }, [refreshStatus]);

  // Lắng nghe thông báo khi ứng dụng đang mở (Foreground)
  useEffect(() => {
    if (!enabled || !isFirebaseClientConfigured) return;

    let isMounted = true;

    async function setupListener() {
      const messaging = await getFirebaseMessagingInstance();
      if (!messaging || !isMounted) return;

      const unsub = onMessage(messaging, (payload) => {
        if (onForegroundMessage) {
          onForegroundMessage(payload);
        } else if ('Notification' in window && Notification.permission === 'granted') {
          const title = payload.notification?.title || payload.data?.title || 'OCS - Thông báo mới';
          const body = payload.notification?.body || payload.data?.body || '';
          new Notification(title, {
            body,
            icon: '/mascot-logo.png',
          });
        }
      });

      unsubscribeRef.current = unsub;
    }

    setupListener();

    return () => {
      isMounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [enabled, onForegroundMessage]);

  // Tự động kiểm tra và đồng bộ token THẬT nếu quyền đã cấp và client đã cấu hình
  useEffect(() => {
    if (!enabled) return;

    void refreshStatus();

    if (
      isFirebaseClientConfigured &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      const syncedTokenForUser = userId
        ? localStorage.getItem(`ocs_fcm_synced_${userId}`)
        : null;

      // Chỉ tự động sync nếu chưa sync cho account hiện tại hoặc chưa có token trong state
      if (!syncedTokenForUser || !fcmToken) {
        void requestPermissionAndRegister();
      }
    }
  }, [enabled, userId, fcmToken, refreshStatus, requestPermissionAndRegister]);

  // Tính toán trạng thái thông báo đẩy thực tế
  const isPushActive = Boolean(
    permission === 'granted' &&
      fcmToken &&
      !fcmToken.startsWith('web-dev-') &&
      status?.configured &&
      (status.registeredDeviceCount ?? 0) > 0,
  );

  return {
    fcmToken,
    permission,
    status,
    isPushActive,
    isFirebaseClientConfigured,
    isServerConfigured: Boolean(status?.configured),
    loading,
    error,
    requestPermissionAndRegister,
    unregister,
    sendTestNotification,
    refreshStatus,
  };
}
