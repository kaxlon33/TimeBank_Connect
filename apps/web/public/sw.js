/* TimeBank Connect service worker.
 * - Keeps the app shell and pictures so the app opens with no connection.
 * - Pages: network first, falling back to the saved shell when offline.
 * - Built files and pictures: served from the saved copy, refreshed in the background.
 * Map tiles and API calls are never saved here.
 */
const VERSION = 'tbc-v1'
const SHELL = ['/', '/manifest.webmanifest', '/logo-mark.png', '/favicon-32.png', '/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Opening a page: try the network, fall back to the saved shell (the app handles the route).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(VERSION).then((cache) => cache.put('/', copy))
          return response
        })
        .catch(() => caches.match('/').then((r) => r || Response.error())),
    )
    return
  }

  // Built files, skill pictures and icons: use the saved copy at once, refresh it quietly.
  if (/^\/(assets|skills)\//.test(url.pathname) || /\.(png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const cached = await cache.match(request)
        const refresh = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone())
            return response
          })
          .catch(() => cached)
        return cached || refresh
      }),
    )
  }
})
