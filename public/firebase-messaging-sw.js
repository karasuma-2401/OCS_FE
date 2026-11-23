/* eslint-disable no-restricted-globals */
// Service Worker xử lý Web Push Notification cho hệ thống OCS
// Sử dụng một đường xử lý nền duy nhất (W3C Web Push Protocol) để loại bỏ hoàn toàn nguy cơ trùng lặp thông báo.
// Hoạt động độc lập ngay cả khi người dùng đóng hoàn toàn website OCS.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Duy nhất một listener 'push' xử lý thông báo nền từ FCM HTTP v1 / Web Push Gateway
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = {
      notification: {
        title: 'OCS - Thông báo mới',
        body: event.data.text(),
      },
    };
  }

  // Trích xuất dữ liệu từ các định dạng payload FCM HTTP v1 / Webpush
  const notificationData =
    payload.notification ||
    (payload.webpush && payload.webpush.notification) ||
    {};
  const customData = payload.data || {};
  const fcmOptions =
    payload.fcmOptions ||
    (payload.webpush && payload.webpush.fcm_options) ||
    {};

  const title =
    notificationData.title ||
    customData.title ||
    payload.title ||
    'OCS - Thông báo mới';

  const body =
    notificationData.body ||
    customData.body ||
    payload.body ||
    'Bạn có thông báo mới từ hệ thống OCS.';

  const icon =
    notificationData.icon ||
    customData.icon ||
    '/mascot-logo.png';

  const badge =
    notificationData.badge ||
    customData.badge ||
    '/mascot-logo.png';

  const targetUrl =
    customData.url ||
    customData.link ||
    fcmOptions.link ||
    '/';

  const tag =
    customData.notificationId ||
    notificationData.tag ||
    `ocs-${title}:${body}`;

  const options = {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: {
      url: targetUrl,
      ...customData,
    },
    actions: [
      { action: 'open', title: 'Xem chi tiết' },
    ],
  };

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'ocs:push', payload });
    }
    await self.registration.showNotification(title, options);
  })());
});

// Xử lý khi người dùng click vào thông báo đẩy trên thiết bị (Windows/macOS/Android)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notiData = event.notification.data || {};
  const rawTargetUrl = notiData.url || notiData.link || '/';
  let targetUrl = rawTargetUrl;
  try {
    targetUrl = new URL(rawTargetUrl, self.location.origin).href;
  } catch {
    targetUrl = `${self.location.origin}${rawTargetUrl.startsWith('/') ? '' : '/'}${rawTargetUrl}`;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Nếu đã có tab OCS đang mở, focus vào tab đó và điều hướng đến trang liên quan
        for (const client of clientList) {
          if (
            'focus' in client &&
            client.url &&
            client.url.includes(self.location.origin)
          ) {
            client.focus();
            if ('navigate' in client && targetUrl) {
              return client.navigate(targetUrl);
            }
            return client;
          }
        }
        // Nếu website đang đóng hoàn toàn, mở một cửa sổ / tab mới
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});

// Tự động duy trì Push Subscription nếu trình duyệt làm mới khóa
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(
        event.oldSubscription
          ? event.oldSubscription.options
          : { userVisibleOnly: true },
      )
      .catch(() => {
        // Tự động sync lại khi người dùng mở lại website
      }),
  );
});
