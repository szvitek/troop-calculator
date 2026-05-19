/* App semver — bump patch (1.2.1) or minor (1.3.0) on release; keep in sync with changelog.txt. */
const CACHE_VERSION = "1.3.5";
const CACHE_NAME = `troop-calc-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/pwa/favicon.ico",
  "./assets/pwa/favicon-16x16.png",
  "./assets/pwa/favicon-32x32.png",
  "./assets/pwa/apple-touch-icon.png",
  "./assets/css/bootstrap.min.css",
  "./assets/vendor/bootstrap-icons/bootstrap-icons.min.css",
  "./assets/vendor/bootstrap-icons/fonts/bootstrap-icons.woff2",
  "./assets/vendor/bootstrap-icons/fonts/bootstrap-icons.woff",
  "./assets/css/styles.css",
  "./assets/js/bootstrap.bundle.min.js",
  "./assets/js/main.js",
  "./assets/js/theme.js",
  "./assets/js/data.js",
  "./assets/js/renderer.js",
  "./assets/js/events.js",
  "./assets/js/dom.js",
  "./assets/js/presets.js",
  "./assets/js/calculator.js",
  "./assets/js/changelog.js",
  "./assets/js/analytics.js",
  "./assets/js/pwa-install.js",
  "./assets/js/bonuses.js",
  "./assets/js/epics.js",
  "./assets/js/epic-ui.js",
  "./assets/js/epic-combat.js",
  "./assets/js/citadel-siege.js",
  "./assets/js/citadel-ui.js",
  "./assets/data/troops.json",
  "./assets/data/citadel-walls.json",
  "./assets/data/epics.json",
  "./assets/data/tiers.json",
  "./assets/icons/spartan-helmet.svg",
  "./assets/icons/eagle-head.svg",
  "./assets/icons/lion.svg",
  "./assets/icons/crested-helmet.svg",
  "./assets/icons/catapult.svg",
  "./assets/icons/dragon-head.svg",
  "./assets/icons/gladius.svg",
  "./assets/icons/william-tell-skull.svg",
  "./assets/icons/daemon-skull.svg",
  "./assets/icons/castle.svg",
  "./assets/pwa/icon-192.png",
  "./assets/pwa/icon-512.png",
  "./assets/pwa/screenshot-desktop.png",
  "./assets/pwa/screenshot-mobile.png",
  "./changelog.txt",
];

async function precache(cache) {
  await Promise.all(
    PRECACHE_URLS.map(async (url) => {
      try {
        const req = new Request(url, { cache: "reload" });
        const res = await fetch(req);
        if (!res.ok) throw new Error(`${res.status} ${url}`);
        await cache.put(url, res);
      } catch (e) {
        console.warn("[sw] precache skip:", url, e);
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => precache(cache))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  const isNavigate =
    event.request.mode === "navigate" ||
    (event.request.headers.get("accept") || "").includes("text/html");

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            response.type === "basic"
          ) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy);
            });
          }
          return response;
        })
        .catch(() => {
          if (isNavigate) {
            return caches.match("./index.html");
          }
          return Response.error();
        });
    }),
  );
});
