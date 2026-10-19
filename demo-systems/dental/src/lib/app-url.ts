/**
 * Mount-aware URL helpers for the demo dental app.
 *
 * The app is served at `/demo/dental` (next.config `basePath`). Next prefixes
 * that for `next/link`, `redirect()`, `router.*` and the `<link rel="manifest">`
 * href — but nothing normalizes a URL the app builds by hand. A manifest
 * `icons[].src`, a metadata `icons` href or a service-worker registration is a
 * plain string that resolves against the *origin root*, so a bare `/icons/...`
 * fetches the platform's logo and a bare `/sw.js` registers the platform's
 * origin-wide worker.
 *
 * Every hand-built root-relative path goes through `mountedHref`.
 */

/** Must match `basePath` in next.config.ts; pinned by tests/core/demo-dental-pwa.test.ts. */
export const BASE_PATH = "/demo/dental";

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
  const [head, tail] = splitTail(path);
  if (head === BASE_PATH || head.startsWith(`${BASE_PATH}/`)) return path;
  return `${BASE_PATH}${head.startsWith("/") ? head : `/${head}`}${tail}`;
}

/**
 * The app's own service worker. Registering it (rather than the platform's
 * `/sw.js`) scopes it to `/demo/dental/`, which is the directory it is served
 * from — no `Service-Worker-Allowed` header needed.
 */
export function serviceWorkerUrl(): string {
  return mountedHref("/sw.js");
}
