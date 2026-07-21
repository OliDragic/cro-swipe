/* ═══════════════════════════════════════════════════════
   Cro Swipe — Service Worker
   Cache-first for static assets + audio, Network-first for API
   Paths are relative to the SW scope so the app works both at
   the domain root (local Flask) and under a subpath (GitHub Pages).
   ═══════════════════════════════════════════════════════ */

const CACHE = 'cro-swipe-v27';

const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './state.js',
  './local-api.js',
  './data.js',
  './audio.js',
  './engine.js',
  './city.js',
  './city-bg.jpg',
  './buildings/kuca-1.png',
  './buildings/kuca-2.png',
  './buildings/konoba-1.png',
  './buildings/crkva-1.png',
  './buildings/skola-1.png',
  './buildings/trznica-1.png',
  './buildings/fontana-1.png',
  './buildings/svjetionik-1.png',
  './buildings/dvorac-1.png',
  './buildings/zidine-1.png',
  './buildings/pekara-1.png',
  './buildings/kino-1.png',
  './buildings/muzej-1.png',
  './buildings/kamp-1.png',
  './buildings/igraliste-1.png',
  './buildings/most-1.png',
  './buildings/zoo-1.png',
  './buildings/luka-1.png',
  './buildings/brod-1.png',
  './buildings/plaza-1.png',
  './buildings/park-1.png',
  './buildings/stablo-1.png',
  './buildings/cvijece-1.png',
  './buildings/plot-erde.png',
  './buildings/plot-schild.png',
  './buildings/plot-dorn.png',
  './buildings/plot-tor.png',
  './buildings/plot-boje.png',
  './ui.js',
  './feedback.js',
  './app.js',
  './manifest.json',
  './content/words.csv',
];

// ─── Install: precache static assets ───
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// ─── Activate: clean old caches ───
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch strategy ───
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls + setup pages: pass through to browser directly.
  // The SW must NOT intercept these — on iOS, fetch() from a SW context does not
  // inherit Safari's certificate exception, causing requests to fail or fall back
  // to cached index.html instead of the real server response.
  if (url.pathname.includes('/api/') ||
      url.pathname.endsWith('/setup') ||
      url.pathname.endsWith('/rootca.pem')) {
    return;
  }

  // Audio files: Cache-first (large files, expensive to re-fetch; works offline on trips)
  if (url.pathname.includes('/audio/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok && res.status === 200) {
            // Clone and cache the audio file for offline use
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(request, clone));
          }
          return res;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  // App-Dateien: Network-first — Updates kommen sofort an,
  // der Cache dient nur noch als Offline-Fallback
  event.respondWith(
    fetch(request).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()));
      return res;
    }).catch(() =>
      caches.match(request).then(cached => cached || caches.match('./index.html'))
    )
  );
});
