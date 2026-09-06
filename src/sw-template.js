const VERSION = '__VERSION__';
const CACHE = `rbr-${VERSION}`;
const ASSETS = __ASSETS__;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    if (!self.registration.active) await self.skipWaiting();
    else {
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      clients.forEach((client) => client.postMessage({ type: 'UPDATE_AVAILABLE' }));
    }
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('rbr-') && key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        const cache = await caches.open(CACHE);
        cache.put(event.request, response.clone());
        return response;
      } catch {
        const path = url.pathname.replace(/\/$/, '');
        const routeShell = path === '/demo' ? '/demo/index.html' : '/index.html';
        return (await caches.match(event.request, { ignoreVary: true })) || (await caches.match(routeShell, { ignoreVary: true })) || (await caches.match('/offline.html', { ignoreVary: true }));
      }
    })());
    return;
  }
  event.respondWith((async () => {
    // Preview/static hosts can add Vary: Origin to precached modules. The
    // content is same-origin and revisioned, so ignore that response-policy
    // variation when serving the offline shell.
    const cached = await caches.match(event.request, { ignoreVary: true });
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) (await caches.open(CACHE)).put(event.request, response.clone());
      return response;
    } catch {
      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});
