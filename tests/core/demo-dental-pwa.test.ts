import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { NextResponse } from "next/server";
import { BASE_PATH, mountedHref, serviceWorkerUrl } from "../../demo-systems/dental/src/lib/app-url";
import { buildPwaManifest } from "../../demo-systems/dental/src/lib/pwa";

/**
 * The demo dental app is mounted at /demo/dental through the platform proxy.
 *
 * Unlike the grocery demo — which shipped a PWA whose icons, id/scope/start_url
 * and service-worker registration all pointed at the origin root, so the
 * installed app wore the Business OS logo — dental had no manifest, no icons and
 * no service worker at all, so it was not installable in the first place. This
 * spec builds it installable and keeps it that way:
 *
 *  - every path the manifest advertises is under /demo/dental, never "/";
 *  - the icons actually exist on disk at the advertised size (they are generated
 *    from a vector tooth mark, not copied from the platform's /icons/*);
 *  - the app registers its own worker, not the platform's origin-wide /sw.js;
 *  - that worker derives its mount from self.location.pathname instead of
 *    matching root-absolute "/_next/static/" — the exact defect that still makes
 *    grocery's worker a no-op under its mount.
 */

const APP = join(__dirname, "..", "..", "demo-systems", "dental");
const read = (rel: string): string => readFileSync(join(APP, rel), "utf8");

/** Dental's dictionary calls the clinic this; the brand is Dar Al-Asnan. */
const LABELS = { clinicName: "دار الأسنان لطب الأسنان", shortName: "Dar Al-Asnan" };

/** The path helpers `public/sw.js` computes before it registers a listener. */
type WorkerPaths = {
  MOUNT: string;
  mountRelative: (path: string) => string;
  NO_CACHE_PATHS: RegExp;
};

describe("mountedHref / serviceWorkerUrl", () => {
  it("scopes the demo's own mount", () => {
    expect(BASE_PATH).toBe("/demo/dental");
    expect(mountedHref("/icons/icon-192.png")).toBe("/demo/dental/icons/icon-192.png");
    expect(serviceWorkerUrl()).toBe("/demo/dental/sw.js");
  });

  it("is idempotent, so an already-scoped path is not doubled", () => {
    expect(mountedHref("/demo/dental/icons/icon-192.png")).toBe(
      "/demo/dental/icons/icon-192.png",
    );
    expect(mountedHref("/demo/dental")).toBe("/demo/dental");
  });

  it("keeps the query string and fragment", () => {
    expect(mountedHref("/api/x?a=1&b=2#f")).toBe("/demo/dental/api/x?a=1&b=2#f");
  });

  it("leaves absolute and protocol-relative URLs untouched", () => {
    expect(mountedHref("https://cdn.test/a.png")).toBe("https://cdn.test/a.png");
    expect(mountedHref("//cdn.test/a.png")).toBe("//cdn.test/a.png");
  });
});

describe("buildPwaManifest", () => {
  it("scopes id, start_url and scope to the mount", () => {
    const m = buildPwaManifest(BASE_PATH, LABELS);
    expect(m.id).toBe(BASE_PATH);
    expect(m.scope).toBe(BASE_PATH);
    // /dashboard is the app's own (app)/dashboard route, not the platform home.
    expect(m.start_url).toBe(`${BASE_PATH}/dashboard`);
    // Any of these being "/" breaks or hijacks the install.
    expect(m.start_url).not.toBe("/");
    expect(m.scope).not.toBe("/");
  });

  it("works for any mount point, not just the demo's", () => {
    const m = buildPwaManifest("/gd/dental", LABELS);
    expect(m.id).toBe("/gd/dental");
    expect(m.start_url).toBe("/gd/dental/dashboard");
    expect((m.icons ?? []).every((i) => i.src.startsWith("/gd/dental/icons/"))).toBe(true);
  });

  it("keeps every icon inside the mount point", () => {
    const icons = buildPwaManifest(BASE_PATH, LABELS).icons ?? [];
    expect(icons.length).toBeGreaterThanOrEqual(3);
    for (const icon of icons) expect(icon.src.startsWith(`${BASE_PATH}/`)).toBe(true);
    // The platform's own artwork lives at /icons/*.png — never that.
    expect(icons.some((i) => i.src.startsWith("/icons/"))).toBe(false);
  });

  it("declares a maskable icon, or Android installs it with a cropped badge", () => {
    const icons = buildPwaManifest(BASE_PATH, LABELS).icons ?? [];
    expect(icons.some((i) => i.purpose === "maskable")).toBe(true);
  });

  it("is installable standalone in RTL under the clinic's own name", () => {
    const m = buildPwaManifest(BASE_PATH, LABELS);
    expect(m.display).toBe("standalone");
    expect(m.dir).toBe("rtl");
    expect(m.lang).toBe("ar");
    // Dental's --primary: oklch(0.55 0.1 180).
    expect(m.theme_color).toBe("#008474");
    expect(m.name).toBe(LABELS.clinicName);
    expect(m.short_name).toBe(LABELS.shortName);
  });
});

describe("the demo app's PWA wiring", () => {
  it("uses the same mount the app is actually served at", () => {
    // Drift guard: next.config's basePath and BASE_PATH must not diverge.
    expect(read("next.config.ts")).toContain(`basePath: "${BASE_PATH}"`);
  });

  it("builds the manifest body through the mount-aware builder", () => {
    const src = read("src/app/manifest.ts");
    expect(src).toContain("buildPwaManifest(");
    expect(src).not.toMatch(/["'`]\/icons\//);
    expect(src).not.toMatch(/\b(id|scope|start_url):\s*["']\/["']/);
  });

  it("scopes the favicon and apple-touch-icon to the mount", () => {
    const layout = read("src/app/layout.tsx");
    expect(layout).toContain("mountedHref(");
    // Every /icons/ literal must sit inside a mount-aware call.
    const iconLines = layout
      .split("\n")
      .filter((line) => line.includes("/icons/") && !line.trim().startsWith("//"));
    expect(iconLines.length).toBeGreaterThan(0);
    for (const line of iconLines) expect(line).toContain("mountedHref(");
  });

  it("registers the app's own worker under the mount, not the platform's /sw.js", () => {
    const src = read("src/components/pwa-register.tsx");
    expect(src).not.toMatch(/register\(\s*["'`]\/sw\.js["'`]/);
    expect(src).toContain("swUrl");
    expect(read("src/app/layout.tsx")).toContain("serviceWorkerUrl()");
  });
});

describe("the generated icons", () => {
  /** Reads width/height straight out of the PNG's IHDR chunk. */
  const pngSize = (rel: string): [number, number] => {
    const b = readFileSync(join(APP, "public", rel));
    expect(b.subarray(1, 4).toString("latin1"), `${rel} is not a PNG`).toBe("PNG");
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  };

  it("ships every icon the manifest advertises, at the size it advertises", () => {
    const icons = buildPwaManifest(BASE_PATH, LABELS).icons ?? [];
    expect(icons.length).toBeGreaterThan(0);
    for (const icon of icons) {
      const rel = icon.src.slice(BASE_PATH.length).replace(/^\//, "");
      const onDisk = join(APP, "public", rel);
      expect(existsSync(onDisk), `${icon.src} is advertised but not in public/`).toBe(true);
      const [w, h] = pngSize(rel);
      expect(`${w}x${h}`, `${icon.src} advertises ${icon.sizes}`).toBe(icon.sizes);
    }
  });

  it("ships the apple-touch-icon iOS needs, square and opaque-sized", () => {
    expect(existsSync(join(APP, "public", "icons", "apple-touch-icon.png"))).toBe(true);
    expect(pngSize("icons/apple-touch-icon.png")).toEqual([180, 180]);
  });

  it("never reuses the platform's own artwork", () => {
    // The platform's icons live at repo-root public/icons. The demo must ship
    // its own, or the installed app wears the Business OS logo again.
    const platform = join(__dirname, "..", "..", "public", "icons", "icon-512.png");
    const dental = join(APP, "public", "icons", "icon-512.png");
    expect(readFileSync(dental).equals(readFileSync(platform))).toBe(false);
  });
});

describe("the demo's service worker", () => {
  const sw = read("public/sw.js");

  /**
   * Runs the worker's own path prelude (everything before it registers a
   * listener) against a given worker URL, so these assertions exercise the real
   * MOUNT derivation instead of pattern-matching the source.
   */
  const loadWorker = (pathname: string) => {
    const prelude = sw.slice(0, sw.indexOf('self.addEventListener("install"'));
    expect(prelude, "sw.js must define its path logic before registering").not.toBe("");
    const sandbox: { self: { location: { pathname: string } }; out?: WorkerPaths } = {
      self: { location: { pathname } },
    };
    runInNewContext(`${prelude}\nout = { MOUNT, mountRelative, NO_CACHE_PATHS };`, sandbox);
    return sandbox.out as WorkerPaths;
  };

  it("derives its mount from its own URL, so one file works at any mount", () => {
    expect(loadWorker("/demo/dental/sw.js").MOUNT).toBe("/demo/dental");
    // Degenerates correctly if it were ever served from the origin root.
    expect(loadWorker("/sw.js").MOUNT).toBe("");
  });

  it("resolves build assets and auth/api paths relative to the mount", () => {
    const { mountRelative } = loadWorker("/demo/dental/sw.js");
    // The real request path under the mount...
    expect(mountRelative("/demo/dental/_next/static/chunks/a.js")).toBe(
      "/_next/static/chunks/a.js",
    );
    // ...and the skip-list, which is written mount-independent.
    expect(mountRelative("/demo/dental/login")).toBe("/login");
    expect(mountRelative("/demo/dental/api/health")).toBe("/api/health");
  });

  it("skips the auth screens, the API and itself, and nothing else", () => {
    const { mountRelative, NO_CACHE_PATHS } = loadWorker("/demo/dental/sw.js");
    for (const path of ["/login", "/api/health", "/sw.js"]) {
      expect(NO_CACHE_PATHS.test(mountRelative(`/demo/dental${path}`)), path).toBe(true);
    }
    for (const path of ["/patients", "/dashboard", "/_next/static/chunks/a.js"]) {
      expect(NO_CACHE_PATHS.test(mountRelative(`/demo/dental${path}`)), path).toBe(false);
    }
  });

  it("routes both request checks through the mount, not the raw pathname", () => {
    // The defect that makes grocery's worker a silent no-op: under
    // /demo/grocery the assets are at /demo/grocery/_next/static/, so testing
    // the raw pathname against "/_next/static/" never matches and nothing is
    // ever cached. Both checks here must go through mountRelative.
    expect(sw).toContain('mountRelative(url.pathname).startsWith("/_next/static/")');
    expect(sw).toContain("NO_CACHE_PATHS.test(mountRelative(url.pathname))");
  });
});

describe("the installable endpoints are reachable without a session", () => {
  // The browser fetches the manifest and the worker *before* anyone has signed
  // in. Dental's proxy gates every route on a decrypted cookie, so without a
  // public carve-out both answer with a redirect to /login — and the browser
  // reads HTML where it expected a manifest, so the install silently fails.
  //
  // The proxy imports "@/lib/session", which the root vitest config cannot
  // resolve (it aliases to the platform's src/), so the real source is executed
  // with only its two dependencies injected. Next strips the basePath before
  // the proxy runs, which is why these paths carry no /demo/dental prefix.

  /** The minimum of NextRequest the proxy touches. */
  type FakeNextUrl = URL & { clone: () => FakeNextUrl };
  type FakeRequest = { nextUrl: FakeNextUrl; cookies: { get: () => undefined } };

  const requestTo = (path: string): FakeRequest => {
    const make = (): FakeNextUrl => {
      const url = new URL(`http://localhost${path}`) as FakeNextUrl;
      url.clone = make;
      return url;
    };
    return { nextUrl: make(), cookies: { get: () => undefined } };
  };

  /** Runs the proxy's real source with a session that never decrypts. */
  const proxyWithoutSession = () => {
    const src = read("src/proxy.ts");
    const body = src
      .slice(0, src.indexOf("export const config"))
      .replace(/^import .*\r?$/gm, "")
      .replace(/\bexport\s+/g, "");
    // The source is TypeScript; strip its annotations before executing it.
    const js = transformSync(body, { loader: "ts" }).code;
    const sandbox: {
      NextResponse: typeof NextResponse;
      decrypt: () => Promise<null>;
      SESSION_COOKIE: string;
      out: { proxy: (req: FakeRequest) => Promise<Response> } | undefined;
    } = { NextResponse, decrypt: async () => null, SESSION_COOKIE: "dc_session", out: undefined };
    runInNewContext(`${js}\nout = { proxy };`, sandbox);
    return sandbox.out!.proxy;
  };

  it("serves the manifest and the worker to an unauthenticated browser", async () => {
    const proxy = proxyWithoutSession();
    for (const path of ["/manifest.webmanifest", "/sw.js"]) {
      const res = await proxy(requestTo(path));
      expect(res.status, `${path} was gated behind auth (answered ${res.status})`).toBe(200);
    }
  });

  it("still gates the application itself behind a login redirect", async () => {
    const proxy = proxyWithoutSession();
    for (const path of ["/patients", "/dashboard", "/invoices"]) {
      const res = await proxy(requestTo(path));
      expect([302, 307, 308], `${path} answered ${res.status}`).toContain(res.status);
      expect(res.headers.get("location") ?? "", path).toContain("/login");
    }
  });
});
