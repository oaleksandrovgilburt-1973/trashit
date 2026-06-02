// TRASHit Service Worker v5.0 — Web Push (VAPID)
// IMPORTANT: Bump CACHE_VERSION on every deploy to force cache invalidation.
const CACHE_VERSION = 'trashit-v5';

// Install: skip waiting immediately so new SW activates ASAP
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  self.skipWaiting();
});

// Activate: delete ALL old caches, then claim all clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => {
        console.log('[SW] Deleting old cache:', key);
        return caches.delete(key);
      }));
    }).then(() => self.clients.claim())
  );
});

// Listen for SKIP_WAITING message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Helper: determine if a request should NEVER be cached
function shouldBypass(request, url) {
  // Only cache GET requests
  if (request.method !== 'GET') return true;

  // Never cache API calls (tRPC, OAuth, Stripe, etc.)
  if (url.pathname.startsWith('/api/')) return true;

  // Never cache tRPC batch queries (extra safety)
  if (url.pathname.includes('/trpc/')) return true;
  if (url.search.includes('batch=')) return true;

  // Never cache cross-origin requests
  if (url.origin !== self.location.origin) return true;

  // Never cache Vite dev server internals
  if (url.pathname.startsWith('/@')) return true;
  if (url.pathname.startsWith('/node_modules/')) return true;

  return false;
}

// Fetch: network-first for cacheable requests, bypass for API/tRPC
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass — let the browser handle it directly (no SW interception)
  if (shouldBypass(event.request, url)) return;

  // Network-first for all same-origin static assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses for static assets (JS, CSS, images, fonts)
        const isStaticAsset = /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf|eot)(\?.*)?$/.test(url.pathname);
        if (response.ok && response.status === 200 && isStaticAsset) {
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

// ─── Web Push (VAPID) — push event handler ───────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'TRASHit', body: event.data.text() };
  }
  const title = data.title || 'TRASHit';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    vibrate: [100, 50, 100],
    tag: data.tag || 'trashit-notification',
    renotify: true,
    data: {
      url: data.url || '/',
      ...(data.data || {}),
    },
  };
  event.waitUntil(
    self.registration.showNotification(title, options)
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