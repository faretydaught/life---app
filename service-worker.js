/* ============ Service Worker：PWA 离线缓存 ============ */
const CACHE_VERSION = 'ledger-v1';
const PRECACHE = [
  '',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/util.js',
  'js/store.js',
  'js/charts.js',
  'js/ui.js',
  'js/mod-a.js',
  'js/mod-b.js',
  'js/mod-c.js',
  'js/home.js',
  'js/settings.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE.map(p => self.registration.scope + p)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => k !== CACHE_VERSION)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航：网络优先（拿到最新版），离线时回退缓存首页
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE_VERSION).then(c => c.put(self.registration.scope + 'index.html', copy));
          return resp;
        })
        .catch(() => caches.match(self.registration.scope + 'index.html'))
    );
    return;
  }

  // 静态资源：缓存优先，缺失时走网络并补缓存
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy));
        }
        return resp;
      });
    })
  );
});
