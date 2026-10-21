// TrailerAxle Canada - Service Worker
// Caches app shell for offline use - BC/AB axle limits

const CACHE_NAME = 'traileraxle-canada-v3-32plus28';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/screenshot-overview.png',
  '/screenshot-trailers.png',
  '/screenshot-superb.png'
];

// Install - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Super-B 32+28 version');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.log('[SW] Cache addAll failed, caching individually', err);
        // Try cache individually
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url => cache.add(url).catch(e => console.log('Failed', url)))
        );
      });
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch - Cache first, then network
self.addEventListener('fetch', (event) => {
  // Skip non-GET
  if (event.request.method !== 'GET') return;
  
  // Skip chrome extensions and other schemes
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Return cached, but update in background
        event.waitUntil(
          fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
            }
          }).catch(() => {})
        );
        return cached;
      }
      
      // Not cached, fetch from network
      return fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback for navigation
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
        });
    })
  );
});