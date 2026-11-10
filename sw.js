
const CACHE_NAME = "smarttools-hub-v2";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg"
];

// Install the updated service worker and cache the app files.
self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_FILES);
      await self.skipWaiting();
    })()
  );
});

// Remove old caches when the new version activates.
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );

      await self.clients.claim();
    })()
  );
});

// Always try the latest network version first.
// Use cached files if the visitor is offline.
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const requestURL = new URL(request.url);

  // Do not interfere with Supabase or other external services.
  if (requestURL.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);

        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
          return cachedResponse;
        }

        if (request.mode === "navigate") {
          const offlinePage = await caches.match("./index.html");

          if (offlinePage) {
            return offlinePage;
          }
        }

        return new Response("You are offline. Please try again when you have an internet connection.", {
          status: 503,
          headers: {
            "Content-Type": "text/plain; charset=utf-8"
          }
        });
      }
    })()
  );
});
