const CACHE_NAME = 'docde-v1';
const toCache = [
  '/',
  '/index.html',
  '/reading.js',
  '/style.css',
  '/icon-192.png',
  '/icon.png',
  '/manifest.json'
];

self.addEventListener('install', evt => {
  self.skipWaiting();
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(toCache))
  );
});
self.addEventListener('activate', evt => {
  clients.claim();
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
  );
});
self.addEventListener('fetch', evt => {
  // network-first for HTML, cache-first for assets
  const url = new URL(evt.request.url);
  if (evt.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    evt.respondWith(fetch(evt.request).catch(()=> caches.match('/index.html')));
    return;
  }
  evt.respondWith(
    caches.match(evt.request).then(res => res || fetch(evt.request).then(r=> { 
      // cache dynamically
      return caches.open(CACHE_NAME).then(cache => { cache.put(evt.request, r.clone()); return r; });
    }))
  );
});
