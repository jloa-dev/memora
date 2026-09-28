/**
 * Memora - Service Worker PWA (Offline & Standalone Desktop/Mobile Support)
 */

const CACHE_NAME = 'memora-cache-v3.0.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/firebase.js',
  '/js/commands.js',
  '/js/graph.js',
  '/js/audio.js',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // No interceptar peticiones a Supabase PostgreSQL, Firebase Auth ni Google APIs
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('accounts.google.com') ||
    url.hostname.includes('apis.google.com') ||
    req.method !== 'GET'
  ) {
    return;
  }

  // Estrategia Network-First con fallback a Caché para shell y assets estáticos
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkRes;
      })
      .catch(() => {
        return caches.match(req).then((cachedRes) => {
          if (cachedRes) return cachedRes;
          if (req.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
