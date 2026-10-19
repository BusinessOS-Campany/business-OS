/**
 * ClinicOS PWA service worker.
 * - Cache-first for hashed /_next/static/ build assets (immutable).
 * - RSC payloads are cached network-first so client-side navigation
 *   (router.push) keeps working offline.
 * - Full page HTML is NEVER cached — Next.js error pages return HTTP 200
 *   (error boundary is client-side), so caching navigations captures stale
 *   error screens. Offline direct navigation shows a friendly fallback
 *   instead; offline client-side navigation works via the RSC cache.
 *
 * The app is mounted (next.config basePath is the mount), so this worker is
 * served from `<mount>/sw.js` and its scope is that directory. Every path below
 * is therefore built from MOUNT — the worker's own directory — and never from
 * "/". A root-absolute "/_next/static/" would not match anything under the
 * mount, and the worker would silently cache nothing.
 */
const VERSION = "v1";
const STATIC_CACHE = `clinicos-static-${VERSION}`;
const DATA_CACHE = `clinicos-data-${VERSION}`;

// The app's own directory: "/demo/clinicos" here, "" if served at the root.
const MOUNT = self.location.pathname.replace(/\/[^/]*$/, "");

/** Strips the mount so the skip-list below stays mount-independent. */
const mountRelative = (path) =>
  MOUNT && path.startsWith(`${MOUNT}/`) ? path.slice(MOUNT.length) : path;

// Never cache these paths (auth screens, APIs, the SW itself).
const NO_CACHE_PATHS = /^\/(login|forgot|reset|register|api|sw\.js)(\/|$)/;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Purge every cache left by older SW versions.
      const keep = new Set([STATIC_CACHE, DATA_CACHE]);
      for (const key of await caches.keys()) {
        if (!keep.has(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

function isRscRequest(req) {
  if (req.headers.get("rsc") === "1") return true;
  if ((req.headers.get("accept") || "").includes("text/x-component")) return true;
  return false;
}

function offlineScreen() {
  return new Response(
    "<meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><body style=\"font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0\" dir=\"rtl\"><p>لا يوجد اتصال — افتح الصفحة مرة واحدة وأنت متصل لتُحفظ للعمل أوفلاين</p></body>",
    { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (NO_CACHE_PATHS.test(mountRelative(url.pathname))) return;

  // Immutable build assets: cache-first forever (purged on version bump).
  if (mountRelative(url.pathname).startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })(),
    );
    return;
  }

  // RSC payload fetches (client-side navigation/prefetch): network-first,
  // cached so router.push() keeps working offline.
  if (isRscRequest(req)) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok && !res.redirected) {
            const cache = await caches.open(DATA_CACHE);
            cache.put(req, res.clone());
          }
          return res;
        } catch {
          const cache = await caches.open(DATA_CACHE);
          const hit = await cache.match(req);
          if (hit) return hit;
          throw new Error("offline and not cached");
        }
      })().catch(() => offlineScreen()),
    );
    return;
  }

  // Page navigations: network-only. Never cache full HTML to avoid storing
  // Next.js client-side error boundary pages (which return HTTP 200).
  // Offline direct navigation shows the fallback screen; client-side
  // navigation via router.push() works through the RSC cache above.
});
