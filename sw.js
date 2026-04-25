// Service Worker — Korean Flashcards
// Strategy: cache-first for everything. Once installed the app makes zero
// network requests for its own assets, regardless of connectivity.

const CACHE = 'korean-cards-v1';

const APP_SHELL = [
    './index.html',
    './manifest.json',
    './icons/icon.svg',
    './css/main.css',
    './css/study.css',
    './css/cards.css',
    './css/stats.css',
    './js/data.js',
    './js/data-topik.js',
    './js/storage.js',
    './js/srs.js',
    './js/audio.js',
    './js/topik.js',
    './js/suggestions.js',
    './js/views.js',
    './js/app.js',
];

// Install: pre-cache the entire app shell, then activate immediately.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

// Activate: delete any caches from old versions, then take control at once.
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch: cache-first — return cached copy immediately without touching the
// network. Only hits the network for resources not yet in the cache (which
// after install should be none). This means the app stays silent even when
// WiFi is connected but there is no internet.
self.addEventListener('fetch', event => {
    // Only handle GET requests for same-origin resources.
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;

            // Not in cache yet — fetch, store, and return.
            return fetch(event.request).then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                // Network unavailable and not cached.
                // For navigation, fall back to the shell so the app still loads.
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
