const APP_CACHE = "bracket-parade-app-v3";
const RUNTIME_CACHE = "bracket-parade-runtime-v3";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./data/bracket-2026.json",
  "./data/bracket-2026-projected.json",
  "./assets/brand/bracket-parade-icon.svg",
  "./assets/brand/pwa/icon-192.png",
  "./assets/brand/pwa/icon-512.png",
  "./assets/brand/pwa/apple-touch-icon.png",
  "./assets/fonts/bungee-400.ttf",
  "./assets/fonts/baloo-2-800.ttf",
  "./assets/fonts/nunito-500.ttf",
  "./assets/fonts/nunito-700.ttf",
  "./assets/fonts/nunito-800.ttf",
  "./assets/fonts/nunito-900.ttf"
];
const SHELL_NETWORK_FIRST_MATCHERS = [
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== APP_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(handleNavigation(event.request));
    return;
  }

  if (SHELL_NETWORK_FIRST_MATCHERS.some((suffix) => url.pathname.endsWith(suffix))) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (
    url.pathname.endsWith("/data/bracket-2026.json") ||
    url.pathname.endsWith("/data/bracket-2026-projected.json")
  ) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put("./index.html", response.clone());
    return response;
  } catch {
    return (await caches.match(request)) || caches.match("./index.html");
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return caches.match(request);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }

  return response;
}
