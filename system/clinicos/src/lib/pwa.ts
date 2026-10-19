import type { MetadataRoute } from "next";

/**
 * Mount-aware URL helpers for the clinic app.
 *
 * The app is served at its mount (next.config `basePath`): `/demo/clinicos` for
 * the platform demo, `/{org}/clinicos` for an organization's own copy. Next
 * prefixes that for `next/link`, `redirect()` and the `<link rel="manifest">`
 * href — but nothing normalizes a URL the app builds by hand. A manifest
 * `icons[].src`, a metadata `icons` href or a service-worker registration is a
 * plain string that resolves against the *origin root*, so a bare `/icons/...`
 * fetches the platform's logo and a bare `/sw.js` registers the platform's
 * origin-wide worker.
 *
 * Every hand-built root-relative path goes through `mountedHref`, except the
 * manifest, which takes the mount it is built for as an explicit argument.
 */

/** The mount, baked in at build time (`SYSTEM_BASE_PATH` via next.config.ts). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** `https://…` or `//cdn…` — already resolved against something other than the mount. */
const isAbsolute = (url: string): boolean => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url);

/** Splits `/api/x?a=1#f` into the path and the query/fragment tail. */
const splitTail = (path: string): [string, string] => {
  const at = path.search(/[?#]/);
  return at === -1 ? [path, ""] : [path.slice(0, at), path.slice(at)];
};

/**
 * Prefixes `path` with the mount, once. Absolute URLs pass through untouched and
 * a path that is already scoped is returned as-is, so this is safe to call twice.
 */
export function mountedHref(path: string): string {
  if (isAbsolute(path)) return path;
  if (!BASE_PATH) return path;
  const [head, tail] = splitTail(path);
  if (head === BASE_PATH || head.startsWith(`${BASE_PATH}/`)) return path;
  return `${BASE_PATH}${head.startsWith("/") ? head : `/${head}`}${tail}`;
}

/**
 * The app's own service worker. Registering it (rather than the platform's
 * `/sw.js`) scopes it to the mount, which is the directory it is served from —
 * no `Service-Worker-Allowed` header needed.
 */
export function serviceWorkerUrl(): string {
  return mountedHref("/sw.js");
}

/** The clinic's identity, shown by the installer. */
export type PwaLabels = { name: string; shortName: string };

/**
 * The installable manifest for a clinic app served under `mount`.
 *
 * `id`, `scope` and `start_url` are all inside the mount — never `/`. A manifest
 * whose `start_url` is "/" installs an icon that opens the *platform* home, and
 * a `scope` of "/" claims the entire origin, so two apps on one host fight over
 * each other. `icons[].src` is likewise scoped, or the installed app wears
 * whatever logo happens to sit at the origin root.
 *
 * `id` is spelled out rather than left to default. On Android the `id` is what
 * the launcher keys the WebAPK by, so it is the one field that can hand the app
 * a fresh identity: an install whose record went stale — e.g. one created while
 * the mount briefly answered 404 — keeps resurfacing as "Open app" followed by
 * "can't open app", and only a changed `id` stops the browser matching it.
 * `start_url` stays the mount root, which the app's middleware serves by
 * redirecting into the locale tree.
 *
 * `theme_color` and `background_color` are the app's own tokens from
 * `app/globals.css` (`--primary` light, `--background` light): the launcher
 * paints the status bar with the first and the splash screen behind the icons
 * with the second, so a generic teal there makes the installed app look like a
 * different product.
 */
export function buildPwaManifest(mount: string, labels: PwaLabels): MetadataRoute.Manifest {
  const root = mount.replace(/\/+$/, "");
  return {
    name: labels.name,
    short_name: labels.shortName,
    description:
      "Clinic management system — patients, appointments, clinical records, pharmacy, laboratory, billing and inventory. / نظام إدارة متكامل للعيادات — المرضى والمواعيد والسجلات الطبية والصيدلية والمختبر والفواتير والمخزون.",
    id: root || "/",
    start_url: root || "/",
    scope: root || "/",
    display: "standalone",
    dir: "rtl",
    lang: "ar",
    background_color: "#f6f5f1",
    theme_color: "#0e7c74",
    categories: ["business", "medical", "productivity"],
    icons: [
      { src: `${root}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${root}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
      {
        src: `${root}/icons/icon-maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        // 180x180, which is what iOS uses; it is the app's own artwork, not the
        // platform's, so it belongs in the list Next serves to the installer.
        src: `${root}/icons/apple-touch-icon.png`,
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
