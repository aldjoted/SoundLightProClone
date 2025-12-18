/**
 * sw.js
 *
 * Production-safe Service Worker (no build-time bundling required).
 *
 * Notes:
 * - Avoids Workbox bare imports (which would fail at runtime when served from /sw.js).
 * - Avoids precaching JS bundles (Vite outputs hashed assets).
 * - Provides offline fallback for navigations and conservative runtime caching.
 */

const CACHE_VERSION = 'v1.0.2';

const CACHE_NAMES = {
  static: `soundlightpro-static-${CACHE_VERSION}`,
  runtime: `soundlightpro-runtime-${CACHE_VERSION}`,
  images: `soundlightpro-images-${CACHE_VERSION}`,
  api: `soundlightpro-api-${CACHE_VERSION}`,
};

const ALL_CACHE_NAMES = Object.values(CACHE_NAMES);

const MAX_CACHE_ITEMS = {
  runtime: 40,
  images: 80,
  api: 40,
};

const PRECACHE_PATHS = [
  'offline.html',
  'manifest.json',
  'images/logo/logoslp.jpg',
];

function toScopeUrl(path) {
  return new URL(path, self.registration.scope).toString();
}

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isApiRequest(url) {
  if (url.pathname.startsWith('/api/')) return true;
  // Common dev API origins
  if ((url.origin.includes('localhost:8000') || url.origin.includes('127.0.0.1:8000')) && url.pathname.startsWith('/api/')) {
    return true;
  }
  return false;
}

function isImageRequest(request) {
  return request.destination === 'image' || /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(request.url);
}

function isNavigationRequest(request) {
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  return request.method === 'GET' && accept.includes('text/html');
}

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxItems) return;
  const toDelete = keys.slice(0, keys.length - maxItems);
  await Promise.all(toDelete.map((key) => cache.delete(key)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAMES.static);
      const urls = PRECACHE_PATHS.map(toScopeUrl);
      await cache.addAll(urls);
      await self.skipWaiting();
    })().catch((error) => {
      // Keep install resilient; SW can still function without precache.
      console.error('[SW] Install failed:', error);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => !ALL_CACHE_NAMES.includes(name))
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'LOGOUT') {
    event.waitUntil(
      (async () => {
        // Clear potentially user-specific caches
        await caches.delete(CACHE_NAMES.api);
        await caches.delete(CACHE_NAMES.runtime);
        event.ports?.[0]?.postMessage?.({ success: true });
      })()
    );
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  // Navigations: network first, offline fallback
  if (isNavigationRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(CACHE_NAMES.runtime);
          cache.put(request, response.clone());
          trimCache(CACHE_NAMES.runtime, MAX_CACHE_ITEMS.runtime);
          return response;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match(toScopeUrl('offline.html'));
        }
      })()
    );
    return;
  }

  // API: network first, short cache fallback
  if (isApiRequest(url)) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(CACHE_NAMES.api);
            cache.put(request, response.clone());
            trimCache(CACHE_NAMES.api, MAX_CACHE_ITEMS.api);
          }
          return response;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ detail: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })()
    );
    return;
  }

  // Images: cache first
  if (isImageRequest(request)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(CACHE_NAMES.images);
            cache.put(request, response.clone());
            trimCache(CACHE_NAMES.images, MAX_CACHE_ITEMS.images);
          }
          return response;
        } catch {
          return new Response('', { status: 504 });
        }
      })()
    );
    return;
  }

  // Same-origin static assets: stale-while-revalidate
  if (isSameOrigin(url) && /\.(css|js|woff2?|ttf|eot)$/i.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAMES.runtime);
        const cached = await cache.match(request);

        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
              trimCache(CACHE_NAMES.runtime, MAX_CACHE_ITEMS.runtime);
            }
            return response;
          })
          .catch(() => null);

        return cached || (await fetchPromise) || new Response('', { status: 504 });
      })()
    );
  }
});