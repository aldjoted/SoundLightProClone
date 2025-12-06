/**
 * Service Worker - Enhanced PWA Implementation
 * 
 * This service worker provides comprehensive offline support with intelligent
 * caching strategies, background sync, and push notification capabilities.
 * 
 * Caching Strategies:
 * - Network First: API calls (with offline fallback)
 * - Cache First: Static assets (images, fonts)
 * - Stale While Revalidate: Product data, HTML pages
 * - Offline Fallback: Custom offline page
 * 
 * @version 1.0.0
 */

// Cache version - increment when you need to update caches
const CACHE_VERSION = 'v1.0.1';

// Cache names
const CACHE_NAMES = {
    static: `soundlightpro-static-${CACHE_VERSION}`,
    dynamic: `soundlightpro-dynamic-${CACHE_VERSION}`,
    images: `soundlightpro-images-${CACHE_VERSION}`,
    api: `soundlightpro-api-${CACHE_VERSION}`,
};

// All cache names for cleanup
const ALL_CACHE_NAMES = Object.values(CACHE_NAMES);

// Assets to precache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/css/main.css',
    '/css/components/pwa.css',
    '/css/base/reset.css',
    '/css/base/variables.css',
    '/js/main.js',
    '/js/apiService.js',
    '/js/cart.js',
    '/js/ui.js',
    '/js/utils.js',
    '/js/performance.js',
    '/images/logo/logoslp.jpg',
    '/manifest.json'
];

// API endpoints that should use network-first strategy
const API_PATTERNS = [
    '/api/',
    'http://localhost:8000/api/',
    'http://127.0.0.1:8000/api/'
];

// Maximum cache sizes
const MAX_CACHE_SIZE = {
    images: 50,
    dynamic: 30,
    api: 20
};

// Maximum cache age (in milliseconds)
const MAX_CACHE_AGE = {
    images: 30 * 24 * 60 * 60 * 1000, // 30 days
    dynamic: 7 * 24 * 60 * 60 * 1000,  // 7 days
    api: 5 * 60 * 1000                  // 5 minutes
};

/**
 * Install Event - Precache static assets
 * This runs when the service worker is first installed
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...', CACHE_VERSION);

    event.waitUntil(
        caches.open(CACHE_NAMES.static)
            .then((cache) => {
                console.log('[SW] Precaching static assets...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Static assets precached successfully');
                // Force the waiting service worker to become the active service worker
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Precache failed:', error);
            })
    );
});

/**
 * Activate Event - Clean up old caches
 * This runs when the service worker becomes active
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...', CACHE_VERSION);

    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => !ALL_CACHE_NAMES.includes(cacheName))
                        .map((cacheName) => {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            }),
            // Take control of all clients immediately
            self.clients.claim()
        ]).then(() => {
            console.log('[SW] Service worker activated successfully');
        })
    );
});

/**
 * Fetch Event - Intercept network requests and apply caching strategies
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip chrome-extension and non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Skip requests with query strings for background sync
    // (these are typically dynamic and shouldn't be cached)
    if (request.method !== 'GET') {
        // POST, PUT, DELETE - handle with background sync
        event.respondWith(
            fetch(request).catch(() => {
                // Queue for background sync
                return queueBackgroundSync(request);
            })
        );
        return;
    }

    // Determine caching strategy based on request type
    if (isAPIRequest(url)) {
        // API Requests: Network First with cache fallback
        event.respondWith(networkFirstStrategy(request));
    } else if (isImageRequest(request)) {
        // Images: Cache First with network fallback
        event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.images));
    } else if (isStaticAsset(url)) {
        // Static Assets (CSS, JS): Cache First
        event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.static));
    } else if (isNavigationRequest(request)) {
        // HTML Pages: Stale While Revalidate with offline fallback
        event.respondWith(staleWhileRevalidateStrategy(request));
    } else {
        // Everything else: Network First
        event.respondWith(networkFirstStrategy(request));
    }
});

/**
 * Network First Strategy
 * Try network first, fall back to cache, then to offline page if both fail
 * 
 * @param {Request} request - The fetch request
 * @returns {Promise<Response>}
 */
async function networkFirstStrategy(request) {
    const cacheName = isAPIRequest(new URL(request.url)) ? CACHE_NAMES.api : CACHE_NAMES.dynamic;

    try {
        // Try network first
        const networkResponse = await fetch(request);

        // Clone the response before caching (response can only be read once)
        const responseToCache = networkResponse.clone();

        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, responseToCache);

            // Trim cache if it exceeds max size
            trimCache(cacheName, isAPIRequest(new URL(request.url)) ? MAX_CACHE_SIZE.api : MAX_CACHE_SIZE.dynamic);
        }

        return networkResponse;
    } catch (error) {
        // Network failed, try cache
        console.log('[SW] Network request failed, trying cache:', request.url);

        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('[SW] Serving from cache:', request.url);
            return cachedResponse;
        }

        // Both failed, return offline page for navigation requests
        if (isNavigationRequest(request)) {
            console.log('[SW] Returning offline page');
            return caches.match('/offline.html');
        }

        // For non-navigation requests, return a generic error response
        return new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        });
    }
}

/**
 * Cache First Strategy
 * Try cache first, fall back to network
 * 
 * @param {Request} request - The fetch request
 * @param {string} cacheName - The cache to use
 * @returns {Promise<Response>}
 */
async function cacheFirstStrategy(request, cacheName) {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        console.log('[SW] Serving from cache (cache-first):', request.url);
        return cachedResponse;
    }

    // Cache miss, fetch from network
    try {
        const networkResponse = await fetch(request);

        // Cache the response for future use
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());

            // Trim cache if needed
            if (cacheName === CACHE_NAMES.images) {
                trimCache(cacheName, MAX_CACHE_SIZE.images);
            }
        }

        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache-first strategy failed:', error);

        // Return a placeholder response for images
        if (isImageRequest(request)) {
            return new Response(
                '<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="#e5e7eb"/><text x="50%" y="50%" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="16">Image Unavailable</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
            );
        }

        return new Response('Resource unavailable', { status: 404 });
    }
}

/**
 * Stale While Revalidate Strategy
 * Return cached version immediately, then update cache in background
 * 
 * @param {Request} request - The fetch request
 * @returns {Promise<Response>}
 */
async function staleWhileRevalidateStrategy(request) {
    const cache = await caches.open(CACHE_NAMES.dynamic);
    const cachedResponse = await cache.match(request);

    // Fetch fresh version in background
    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch(() => {
            // If fetch fails and we have cache, that's okay
            console.log('[SW] Background fetch failed, using stale cache');
        });

    // Return cached version immediately if available
    if (cachedResponse) {
        console.log('[SW] Serving stale content, revalidating:', request.url);
        return cachedResponse;
    }

    // No cache, wait for network
    try {
        return await fetchPromise;
    } catch (error) {
        // Network failed and no cache, return offline page
        if (isNavigationRequest(request)) {
            return caches.match('/offline.html');
        }

        return new Response('Resource unavailable', { status: 503 });
    }
}

/**
 * Background Sync Event - Handle queued requests
 * Triggers when connection is restored
 */
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync event:', event.tag);

    if (event.tag === 'sync-cart') {
        event.waitUntil(syncCartUpdates());
    } else if (event.tag === 'sync-forms') {
        event.waitUntil(syncFormSubmissions());
    }
});

/**
 * Sync cart updates when connection is restored
 */
async function syncCartUpdates() {
    console.log('[SW] Syncing cart updates...');

    try {
        // Get queued cart updates from IndexedDB
        const db = await openDB();
        const updates = await getQueuedUpdates(db, 'cart');

        for (const update of updates) {
            try {
                const response = await fetch(update.request);
                if (response.ok) {
                    // Remove from queue after successful sync
                    await removeFromQueue(db, 'cart', update.id);

                    // Notify all clients about successful sync
                    notifyClients({
                        type: 'SYNC_SUCCESS',
                        data: { item: 'cart', id: update.id }
                    });
                }
            } catch (error) {
                console.error('[SW] Failed to sync cart update:', error);
            }
        }

        console.log('[SW] Cart sync complete');
    } catch (error) {
        console.error('[SW] Cart sync failed:', error);
        throw error; // Re-throw to retry later
    }
}

/**
 * Sync form submissions when connection is restored
 */
async function syncFormSubmissions() {
    console.log('[SW] Syncing form submissions...');

    try {
        const db = await openDB();
        const forms = await getQueuedUpdates(db, 'forms');

        for (const form of forms) {
            try {
                const response = await fetch(form.request, {
                    method: 'POST',
                    body: form.data
                });

                if (response.ok) {
                    await removeFromQueue(db, 'forms', form.id);
                    notifyClients({
                        type: 'FORM_SYNC_SUCCESS',
                        data: { id: form.id }
                    });
                }
            } catch (error) {
                console.error('[SW] Failed to sync form:', error);
            }
        }
    } catch (error) {
        console.error('[SW] Form sync failed:', error);
        throw error;
    }
}

/**
 * Message Event - Handle messages from clients
 */
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    } else if (event.data && event.data.type === 'CACHE_URLS') {
        // Cache specific URLs on demand
        cacheURLs(event.data.urls);
    } else if (event.data && event.data.type === 'CLEAR_CACHE') {
        // Clear specific cache
        clearCache(event.data.cacheName);
    } else if (event.data && event.data.type === 'LOGOUT') {
        // ✅ SECURITY: Clear auth-related caches on logout
        console.log('[SW] Logout detected - clearing auth caches');
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name.includes('api') || name.includes('dynamic'))
                    .map(name => {
                        console.log('[SW] Clearing cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('[SW] Auth caches cleared successfully');
            // Notify client that cache is cleared
            event.ports[0]?.postMessage({ success: true });
        });
    }
});

/**
 * Push Event - Handle push notifications (skeleton implementation)
 * Extend this when implementing push notifications
 */
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    if (!event.data) {
        return;
    }

    const data = event.data.json();
    const options = {
        body: data.body || 'You have a new notification',
        icon: '/images/logo/logoslp.jpg',
        badge: '/images/logo/logoslp.jpg',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/'
        },
        actions: [
            { action: 'open', title: 'View' },
            { action: 'close', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'SoundLightPro', options)
    );
});

/**
 * Notification Click Event - Handle notification interactions
 */
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);

    event.notification.close();

    if (event.action === 'open' || !event.action) {
        const urlToOpen = event.notification.data.url || '/';

        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    // Check if there's already a window open
                    for (const client of clientList) {
                        if (client.url === urlToOpen && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    // No window open, open a new one
                    if (clients.openWindow) {
                        return clients.openWindow(urlToOpen);
                    }
                })
        );
    }
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if request is an API call
 */
function isAPIRequest(url) {
    return API_PATTERNS.some(pattern => url.href.includes(pattern));
}

/**
 * Check if request is for an image
 */
function isImageRequest(request) {
    return request.destination === 'image' ||
        /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(request.url);
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(url) {
    return /\.(css|js|woff|woff2|ttf|eot)$/i.test(url.pathname);
}

/**
 * Check if request is a navigation request
 */
function isNavigationRequest(request) {
    return request.mode === 'navigate' ||
        (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

/**
 * ✅ SECURITY: Generate cache key with auth awareness
 * Ensures authenticated requests don't serve stale data after login/logout
 */
function getCacheKey(request) {
    const url = new URL(request.url);
    const isAuthRequest = url.pathname.includes('/user/') ||
        url.pathname.includes('/dashboard/') ||
        url.pathname.includes('/wishlist/') ||
        url.pathname.includes('/orders/');

    if (isAuthRequest) {
        // Include auth token hash in cache key
        const authHeader = request.headers.get('Authorization');
        const tokenHash = authHeader ?
            btoa(authHeader.split(' ')[1].slice(-20)) : 'anon';
        return `${request.url}-${tokenHash}`;
    }

    return request.url;
}

/**
 * Trim cache to max size (oldest entries removed first)
 */
async function trimCache(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    if (keys.length > maxItems) {
        console.log(`[SW] Trimming cache ${cacheName} from ${keys.length} to ${maxItems} items`);

        // Delete oldest entries
        const keysToDelete = keys.slice(0, keys.length - maxItems);
        await Promise.all(keysToDelete.map(key => cache.delete(key)));
    }
}

/**
 * Cache specific URLs on demand
 */
async function cacheURLs(urls) {
    const cache = await caches.open(CACHE_NAMES.dynamic);

    for (const url of urls) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                await cache.put(url, response);
                console.log('[SW] Cached URL:', url);
            }
        } catch (error) {
            console.error('[SW] Failed to cache URL:', url, error);
        }
    }
}

/**
 * Clear a specific cache
 */
async function clearCache(cacheName) {
    const deleted = await caches.delete(cacheName);
    console.log(`[SW] Cache ${cacheName} cleared:`, deleted);

    // Notify clients
    notifyClients({
        type: 'CACHE_CLEARED',
        data: { cacheName }
    });
}

/**
 * Queue a request for background sync
 */
async function queueBackgroundSync(request) {
    console.log('[SW] Queueing request for background sync:', request.url);

    try {
        const db = await openDB();
        const requestData = {
            url: request.url,
            method: request.method,
            headers: [...request.headers.entries()],
            body: await request.text(),
            timestamp: Date.now()
        };

        await addToQueue(db, 'cart', requestData);

        // Register sync event
        if (self.registration.sync) {
            await self.registration.sync.register('sync-cart');
        }

        return new Response(JSON.stringify({ queued: true }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('[SW] Failed to queue request:', error);
        return new Response('Failed to queue request', { status: 500 });
    }
}

/**
 * Notify all clients with a message
 */
async function notifyClients(message) {
    const clients = await self.clients.matchAll({ includeUncontrolled: true });

    for (const client of clients) {
        client.postMessage(message);
    }
}

// ============================================================================
// INDEXEDDB HELPERS
// ============================================================================

/**
 * Open IndexedDB for storing queued requests
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('soundlightpro-sw', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create object stores for different types of queued data
            if (!db.objectStoreNames.contains('cart')) {
                db.createObjectStore('cart', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('forms')) {
                db.createObjectStore('forms', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

/**
 * Get queued updates from IndexedDB
 */
function getQueuedUpdates(db, storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Add item to queue in IndexedDB
 */
function addToQueue(db, storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Remove item from queue in IndexedDB
 */
function removeFromQueue(db, storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

console.log('[SW] Service worker script loaded', CACHE_VERSION);
