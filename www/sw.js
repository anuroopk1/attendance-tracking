/* ============================================================
   SERVICE WORKER — Network-First caching strategy
   ============================================================ */

const CACHE_NAME    = 'attendance-v10';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/design-tokens.css',
  './css/themes.css',
  './css/components.css',
  './css/animations.css',
  './js/firebase-config.js',
  './js/auth.js',
  './js/router.js',
  './js/store.js',
  './js/utils.js',
  './js/data-mock.js',
  './js/trainer/swipe-engine.js',
  './js/trainer/dashboard.js',
  './js/trainer/attendance.js',
  './js/trainer/summary.js',
  './js/admin/dashboard.js',
  './js/admin/batches.js',
  './js/admin/students.js',
  './js/admin/reports.js',
  './js/admin/analytics.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Install — cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(err => {
      console.warn('[SW] Caching failure:', err);
    }))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — Network-First strategy
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip Firebase/Firestore/external APIs
  if (url.hostname.includes('firestore') || url.hostname.includes('firebase')) return;

  // Network-first for application files
  e.respondWith(
    fetch(request)
      .then(response => {
        // Cache valid response
        if (response.ok && request.url.startsWith('http')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if offline
        return caches.match(request).then(cached => {
          if (cached) return cached;
          if (request.headers.get('Accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
