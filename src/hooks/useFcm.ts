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
  onForegroundMessage?: (payload: MessagePayload) => void;
}

export function useFcm(options: UseFcmOptions = {}) {
  const { enabled = true, onForegroundMessage } = options;
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default',
  );
  const [status, setStatus] = useState<FcmStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Load server status
  const refreshStatus = useCallback(async () => {
    try {
      const serverStatus = await notificationApi.getFcmStatus();
      setStatus(serverStatus);
    } catch {
      // Ignored if user is unauthenticated or endpoint temporarily unavailable
    }
  }, []);

  // Request notification permission and register FCM device token
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

      let token = '';

      // Register service worker if available
      let swRegistration: ServiceWorkerRegistration | undefined;
      if ('serviceWorker' in navigator) {
        try {
          swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        } catch {
          // SW registration failed or skipped in non-root scope
        }
      }

      if (isFirebaseClientConfigured) {
        const messaging = await getFirebaseMessagingInstance();
        if (messaging) {
          token = await getToken(messaging, {
            vapidKey: firebaseVapidKey,
            serviceWorkerRegistration: swRegistration,
          });
        }
      }

      // If Firebase project credentials are not injected yet, generate a development device token
      if (!token) {
        const storedDevToken = localStorage.getItem('ocs_dev_fcm_token');
        if (storedDevToken) {
          token = storedDevToken;
        } else {
          token = `web-dev-${crypto.randomUUID()}`;
          localStorage.setItem('ocs_dev_fcm_token', token);
        }
      }

      if (token) {
        setFcmToken(token);
        localStorage.setItem('ocs_active_fcm_token', token);
        await notificationApi.registerFcmToken(token, 'Web');
        await refreshStatus();
      }

      return token;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể đăng ký token thông báo.';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refreshStatus]);

  // Unregister current device token
  const unregister = useCallback(async () => {
    const targetToken = fcmToken || localStorage.getItem('ocs_active_fcm_token');
    if (!targetToken) return;
    try {
      await notificationApi.unregisterFcmToken(targetToken);
      localStorage.removeItem('ocs_active_fcm_token');
      setFcmToken(null);
      await refreshStatus();
    } catch {
      // Ignore
    }
  }, [fcmToken, refreshStatus]);

  // Send a test notification from server
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

  // Setup foreground message listener if Firebase is available
  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    async function setupListener() {
      if (!isFirebaseClientConfigured) return;
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

  useEffect(() => {
    if (enabled) {
      refreshStatus();
    }
  }, [enabled, refreshStatus]);

  return {
    fcmToken,
    permission,
    status,
    loading,
    error,
    isFirebaseConfigured: isFirebaseClientConfigured,
    requestPermissionAndRegister,
    unregister,
    sendTestNotification,
    refreshStatus,
  };
}
