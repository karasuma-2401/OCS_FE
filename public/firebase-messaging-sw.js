/* eslint-disable no-restricted-globals */
// Service Worker xử lý Push Notification cho Firebase Cloud Messaging (FCM)

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = {
      notification: {
        title: 'Thông báo từ OCS',
        body: event.data.text(),
      },
    };
  }

  const notificationData = payload.notification || {};
  const customData = payload.data || {};

  const title = notificationData.title || customData.title || 'OCS - Thông báo mới';
  const options = {
    body: notificationData.body || customData.body || '',
    icon: '/mascot-logo.png',
    badge: '/mascot-logo.png',
    data: {
      url: customData.url || '/appointments',
      ...customData,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            if ('navigate' in client && targetUrl) {
              return client.navigate(targetUrl);
            }
            return client;
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});

