/* Ghost Signal Service Worker — versioned multi-cache with update toast support */
const VERSION = '2026-05-11-v3';
const PRECACHE = `ghost-precache-${VERSION}`;
const RUNTIME_HTML = `ghost-html-${VERSION}`;
const RUNTIME_ASSETS = `ghost-assets-${VERSION}`;
const RUNTIME_IMAGES = `ghost-images-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/404.html',
  '/site.webmanifest',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/logo-nav.png?v=20260501-ghost',
];
const MAX_IMAGE_ENTRIES = 60;
const MAX_HTML_ENTRIES = 30;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => null))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => ![PRECACHE, RUNTIME_HTML, RUNTIME_ASSETS, RUNTIME_IMAGES].includes(k))
          .map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CACHE_BUST') {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
});

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws/')) return;

  // Images: cache-first with revalidate, capped entries
  if (request.destination === 'image') {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_IMAGES);
      const cached = await cache.match(request);
      const network = fetch(request).then((res) => {
        if (res.ok) {
          cache.put(request, res.clone());
          trimCache(RUNTIME_IMAGES, MAX_IMAGE_ENTRIES);
        }
        return res;
      }).catch(() => null);
      return cached || (await network) || Response.error();
    })());
    return;
  }

  // Fonts: cache-first, long-lived
  if (request.destination === 'font') {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_ASSETS);
      const cached = await cache.match(request);
      if (cached) return cached;
      const res = await fetch(request).catch(() => null);
      if (res?.ok) cache.put(request, res.clone());
      return res || Response.error();
    })());
    return;
  }

  // CSS/JS: stale-while-revalidate
  if (request.destination === 'style' || request.destination === 'script') {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_ASSETS);
      const cached = await cache.match(request);
      const network = fetch(request).then((res) => {
        if (res.ok) cache.put(request, res.clone());
        return res;
      }).catch(() => null);
      return cached || (await network) || (await caches.match(OFFLINE_URL));
    })());
    return;
  }

  // Navigation: network-first with 3s timeout, fallback to cached HTML, then offline
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_HTML);
      try {
        const network = await Promise.race([
          fetch(request),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
        ]);
        if (network?.ok) {
          cache.put(request, network.clone());
          trimCache(RUNTIME_HTML, MAX_HTML_ENTRIES);
        }
        return network;
      } catch {
        const cached = await cache.match(request);
        return cached || (await caches.match(OFFLINE_URL)) || Response.error();
      }
    })());
  }
});
