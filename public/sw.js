/* Slot RNG service worker
 * - API traffic is never cached (realtime sync must always hit the network)
 * - Navigations are network-first with an offline fallback
 * - Hashed build assets are cache-first (their names change on every deploy)
 */
const CACHE = 'slot-rng-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => undefined).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Realtime endpoints must never be served from cache.
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: try the network so a new deploy is picked up immediately.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match('/').then((r) => r || Response.error()))
    );
    return;
  }

  // Immutable hashed assets: cache-first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        })
      )
    );
    return;
  }

  // Everything else: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(() => hit || Response.error());
      return hit || network;
    })
  );
});
