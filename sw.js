const CACHE_NAME = 'axel-weights-v2';
const urlsToCache = [
  '/MyAxelWeightsApp/',
  '/MyAxelWeightsApp/index.html',
  '/MyAxelWeightsApp/manifest.json',
  '/MyAxelWeightsApp/icons/icon-192x192.png',
  '/MyAxelWeightsApp/icons/icon-512x512.png',
  '/MyAxelWeightsApp/icons/icon-180x180.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
