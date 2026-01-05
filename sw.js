/* =========================
   Service Worker for Life OS
   - Offline-first caching
   - Static asset caching
   ========================= */

const CACHE_NAME = 'lifeos-v48-empty-states';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './workouts.js',
  './app.js',
  './toast.js',
  './ui-helpers.js',
  './db.js',
  './lifeos-export.js',
  './lifeos.js',
  './metrics.js',
  './diet-templates.js',
  './goals.js',
  './work.js',
  './finance.js',
  './today.js',
  './plan.js',
  './shell.js',
  './icon-192.png',
  './icon-512.png',
  './logo.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch event - NETWORK FIRST for development (serve fresh files)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Return network response (fresh files)
        return networkResponse;
      })
      .catch(() => {
        // Network failed, fallback to cache
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match('./index.html');
        });
      })
  );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
