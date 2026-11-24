import { useEffect, useState, useCallback, useRef } from 'react';
import { getToken, type MessagePayload } from 'firebase/messaging';
import {
  getFirebaseMessagingInstance,
  isFirebaseClientConfigured,
  firebaseVapidKey,
  clearFirebaseRegistration,
} from '@/config/firebase';
import { notificationApi, type FcmStatusResponse } from '@/api/notificationApi';

export interface UseFcmOptions {
  enabled?: boolean;
  userId?: string;
  onForegroundMessage?: (payload: MessagePayload) => void;
}

export function useFcm(options: UseFcmOptions = {}) {
  const { enabled = true, userId, onForegroundMessage } = options;
  const [registration, setRegistration] = useState<{ userId: string; token: string } | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default',
  );
  const [status, setStatus] = useState<FcmStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUserRef = useRef<string | undefined>(undefined);
  currentUserRef.current = enabled ? userId : undefined;
  const messageCallbackRef = useRef(onForegroundMessage);
  messageCallbackRef.current = onForegroundMessage;
  const pendingRef = useRef<{ userId: string; promise: Promise<string | null> } | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!enabled || !userId) return null;
    try {
      const serverStatus = await notificationApi.getFcmStatus();
      if (currentUserRef.current === userId) setStatus(serverStatus);
      return serverStatus;
    } catch {
      return null;
    }
  }, [enabled, userId]);

  const requestPermissionAndRegister = useCallback((): Promise<string | null> => {
    if (!enabled || !userId) return Promise.resolve(null);
    if (pendingRef.current?.userId === userId) return pendingRef.current.promise;
    localStorage.removeItem(`ocs_fcm_opted_out_${userId}`);

    const promise = Promise.resolve().then(async () => {
      try {
        if (currentUserRef.current !== userId) return null;
        setLoading(true);
        setError(null);
        if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
          throw new Error('Trình duyệt không hỗ trợ thông báo đẩy.');
        }
        const perm = Notification.permission === 'granted'
          ? 'granted' : await Notification.requestPermission();
        if (currentUserRef.current !== userId) return null;
        setPermission(perm);
        if (perm !== 'granted') throw new Error('Quyền thông báo chưa được cấp bởi người dùng.');
        if (!isFirebaseClientConfigured) throw new Error('Firebase Client chưa được cấu hình.');

        const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;
        const messaging = await getFirebaseMessagingInstance();
        if (!messaging) throw new Error('Không thể khởi tạo Firebase Messaging trên trình duyệt.');
        const token = await getToken(messaging, { vapidKey: firebaseVapidKey, serviceWorkerRegistration: swRegistration });
        if (!token) throw new Error('Không nhận được mã thiết bị FCM từ Firebase.');
        if (currentUserRef.current !== userId) return null;

        // Only acknowledge registration after the server has accepted ownership of this token.
        await notificationApi.registerFcmToken(token, 'Web');
        if (currentUserRef.current !== userId) return null;
        localStorage.setItem('ocs_active_fcm_token', token);
        localStorage.removeItem(`ocs_fcm_synced_${userId}`);
        setRegistration({ userId, token });
        await refreshStatus();
        return token;
      } catch (err: unknown) {
        if (currentUserRef.current === userId) {
          setRegistration(null);
          setError(err instanceof Error ? err.message : 'Không thể đăng ký thông báo đẩy.');
        }
        return null;
      } finally {
        if (currentUserRef.current === userId) setLoading(false);
        if (pendingRef.current?.userId === userId) pendingRef.current = null;
      }
    });
    pendingRef.current = { userId, promise };
    return promise;
  }, [enabled, userId, refreshStatus]);

  const unregister = useCallback(async () => {
    const token = registration?.token || localStorage.getItem('ocs_active_fcm_token');
    if (userId) {
      localStorage.setItem(`ocs_fcm_opted_out_${userId}`, '1');
    }
    setLoading(true);
    setError(null);
    try {
      if (token) await notificationApi.unregisterFcmToken(token);
    } catch (err: unknown) {
      if (currentUserRef.current === userId) {
        setError(err instanceof Error ? err.message : 'Không thể tắt thông báo đẩy trên thiết bị.');
      }
      throw err;
    } finally {
      await clearFirebaseRegistration();
      if (currentUserRef.current === userId) {
        setRegistration(null);
        setLoading(false);
      }
      await refreshStatus();
    }
  }, [registration, refreshStatus, userId]);

  const sendTestNotification = useCallback(async () => {
    const noti = await notificationApi.sendTestNotification();
    await refreshStatus();
    if (!noti.pushDelivery || noti.pushDelivery.successCount === 0) {
      throw new Error('Đã lưu thông báo in-app nhưng FCM chưa gửi thành công tới thiết bị.');
    }
    return noti;
  }, [refreshStatus]);

  useEffect(() => {
    if (!enabled || !userId || !('serviceWorker' in navigator)) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'ocs:push') return;
      const payload = event.data.payload as MessagePayload;
      if (!payload || (payload.data?.recipientAccountId && payload.data.recipientAccountId !== userId)) return;
      // The worker displays one system notification; pages only refresh their in-app state.
      if (messageCallbackRef.current) messageCallbackRef.current(payload);
      else window.dispatchEvent(new CustomEvent('ocs:notification:refresh'));
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [enabled, userId]);

  useEffect(() => {
    currentUserRef.current = enabled ? userId : undefined;
    setRegistration(null);
    setStatus(null);
    setLoading(false);
    setError(null);
    if (!enabled || !userId) return;
    localStorage.removeItem('ocs_dev_fcm_token');
    const synchronize = () => {
      const optedOut = localStorage.getItem(`ocs_fcm_opted_out_${userId}`) === '1';
      if (!optedOut && isFirebaseClientConfigured && 'Notification' in window && Notification.permission === 'granted') {
        void requestPermissionAndRegister();
      } else {
        if ('Notification' in window) setPermission(Notification.permission);
        void refreshStatus();
      }
    };
    synchronize();
    window.addEventListener('focus', synchronize);
    window.addEventListener('online', synchronize);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') synchronize();
    }, 5 * 60_000);
    return () => {
      currentUserRef.current = undefined;
      window.removeEventListener('focus', synchronize);
      window.removeEventListener('online', synchronize);
      window.clearInterval(timer);
    };
  }, [enabled, userId, refreshStatus, requestPermissionAndRegister]);

  const fcmToken = registration && registration.userId === userId ? registration.token : null;
  const isPushActive = Boolean(enabled && userId && permission === 'granted' && fcmToken && status?.configured && status.registeredDeviceCount > 0);
  return {
    fcmToken, permission, status, isPushActive, isFirebaseClientConfigured,
    isServerConfigured: Boolean(status?.configured), loading, error,
    requestPermissionAndRegister, unregister, sendTestNotification, refreshStatus,
  };
}
