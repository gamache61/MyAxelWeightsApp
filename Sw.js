/**
 * sw.js - Service Worker for MyAirBrakeTrainerApp
 * id: airbraketrainer
 * scope: ./
 */

const APP_NAME = 'MyAirBrakeTrainerApp';
const APP_ID = 'airbraketrainer';
const VERSION = 'v1';
const CACHE_NAME = `${APP_ID}-${VERSION}`; // airbraketrainer-v1

// Precache - add everything needed for offline
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './airbrake.html',
  './components_test.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-1024.png'
];

// Install - cache core assets
self.addEventListener('install', (event) => {
  console.log(`[${APP_NAME}] Install ${VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log(`[${APP_NAME}] Activate ${VERSION}`);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete if it's our app but old version, or old generic caches
          if (cacheName !== CACHE_NAME && (cacheName.startsWith(APP_ID) || cacheName.startsWith(APP_NAME))) {
            console.log(`[${APP_NAME}] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // 1. Navigation requests (page loads) - Network first, fallback to cache, then index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          // Cache a clone of successful navigation
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return res;
        })
        .catch(() => {
          return caches.match(req).then(cached => {
            return cached || caches.match('./index.html') || caches.match('./');
          });
        })
    );
    return;
  }

  // 2. All other assets - Cache first, then network, then cache in background
  event.respondWith(
    caches.match(req).then(cachedRes => {
      if (cachedRes) return cachedRes;

      return fetch(req).then(networkRes => {
        // Don't cache non-successful or opaque errors, but cache icons/screenshots
        if (!networkRes || networkRes.status !== 200) return networkRes;

        const resClone = networkRes.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(req, resClone);
        });
        return networkRes;
      }).catch(() => {
        // Optional: fallback for images
        if (req.destination === 'image') {
          return caches.match('./icons/icon-192.png');
        }
      });
    })
  );
});
