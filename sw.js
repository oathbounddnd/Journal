// Journal PWA service worker – cache shell + runtime
const CACHE = 'journal-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// On install, precache the shell
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    self.skipWaiting();
  })());
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

// Fetch: network-first for HTML; cache-first for other assets (incl. fonts)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  event.respondWith((async () => {
    // Documents: try network then cache fallback
    if (req.mode === 'navigate' || req.destination === 'document') {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, net.clone());
        return net;
      } catch {
        const cache = await caches.open(CACHE);
        const cached = await cache.match('./index.html');
        return cached || Response.error();
      }
    }

    // Others: cache-first then network fallback
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const net = await fetch(req);
      cache.put(req, net.clone());
      return net;
    } catch {
      return cached || Response.error();
    }
  })());
});
