const CACHE_NAME = 'bhs-math-v1';
const assets = [
  'index.html',
  'style.css',
  'script.js',
  'manifest.json'
];

// Install the service worker and cache files
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// Intercept requests and serve from cache if available
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});