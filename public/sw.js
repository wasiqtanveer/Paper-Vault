/* PaperVault service worker.
 * - Hashed build assets (/assets/*) never change for a given URL: cache-first.
 * - Page navigations: network-first, falling back to the cached app shell so the
 *   app opens offline. API traffic (Supabase) is never touched.
 * Bump VERSION to drop old caches. */
const VERSION = 'v1';
const ASSETS = `pv-assets-${VERSION}`;
const SHELL = `pv-shell-${VERSION}`;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(c => c.add('/')).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => ![ASSETS, SHELL].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(ASSETS).then(async cache => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(res => {
        if (res.ok) caches.open(SHELL).then(c => c.put('/', res.clone()));
        return res;
      }).catch(() => caches.match('/')),
    );
  }
});
