// TRASHit Service Worker v3.0
// IMPORTANT: Bump CACHE_VERSION on every deploy to force cache invalidation.
const CACHE_VERSION = 'trashit-v3';

// Install: skip waiting immediately so new SW activates ASAP
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  // Skip waiting immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// Activate: delete ALL old caches (including same-name), then claim all clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => {
      // Take control of all open tabs immediately
      return self.clients.claim();
    })
  );
});

// Listen for SKIP_WAITING message from the client (UpdateBanner "Обнови" button)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING — activating now');
    self.skipWaiting();
  }
});

// Fetch: network-first for everything (ensures fresh content after updates)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls — never cache these
  if (url.pathname.startsWith('/api/')) return;

  // Skip cross-origin requests (CDN, Firebase, etc.)
  if (url.origin !== self.location.origin) return;

  // Network-first for all same-origin requests
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses
        if (response.ok && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed — try cache as fallback
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, return cached root as fallback
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('', { status: 408, statusText: 'Network unavailable' });
        });
      })
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'TRASHit', body: event.data.text() };
  }
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'TRASHit', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
