// Firebase Cloud Messaging Service Worker
// Config is hardcoded here because service workers cannot access Vite env vars.
// This file is served at /firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');


firebase.initializeApp({
  apiKey: "AIzaSyAKViTJgZqQ_ffJQ3j0LYmnyNcZAFU8Itg",
  authDomain: "trashit-c02a2.firebaseapp.com",
  projectId: "trashit-c02a2",
  messagingSenderId: "1007790802752",
  appId: "1:1007790802752:web:b5915feb6871267a769ca5",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // Support both notification payloads and data-only payloads
  const title = (payload.notification && payload.notification.title)
    || (payload.data && payload.data.title)
    || 'TRASHit';
  const body = (payload.notification && payload.notification.body)
    || (payload.data && payload.data.body)
    || '';
  const clickUrl = (payload.data && payload.data.url) || '/';

  self.registration.showNotification(title, {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: clickUrl, ...(payload.data || {}) },
    requireInteraction: false,
  });
});

// Handle notification click — open or focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
