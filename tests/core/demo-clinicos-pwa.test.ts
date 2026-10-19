import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

/**
 * The clinic app is served at a mount: `/demo/clinicos` through the platform
 * proxy, `/{org}/clinicos` for an organization's own clone.
 *
 * Unlike the demo dental app, whose mount is hardcoded (`app-url.ts` pins
 * "/demo/dental"), this one is built once per mount from `SYSTEM_BASE_PATH`, so
 * the mount is read from the environment and the *builder* takes it as an
 * argument. The spec therefore stubs the same variable the build sets, and keeps
 * this app installable:
 *
 *  - every path it advertises is under the mount, never "/";
 *  - the icons exist on disk at the advertised size and are its own artwork;
 *  - the service worker is the app's, and derives its mount from its own URL;
 *  - the manifest and the worker still answer without a session.
 */
process.env.NEXT_PUBLIC_BASE_PATH = "/demo/clinicos";

/** The app is built with this inlined, so read it the way the build does. */
const { BASE_PATH, mountedHref, serviceWorkerUrl, buildPwaManifest } = await import(
  "../../demo-systems/clinicos/src/lib/pwa"
);

const APP = join(__dirname, "..", "..", "demo-systems", "clinicos");
const read = (rel: string): string => readFileSync(join(APP, rel), "utf8");

/** The brand `src/app/manifest.ts` installs under. */
const LABELS = { name: "ClinicOS — نظام إدارة العيادات", shortName: "ClinicOS" };

/** The path helpers `public/sw.js` computes before it registers a listener. */
type WorkerPaths = {
  MOUNT: string;
  mountRelative: (path: string) => string;
  NO_CACHE_PATHS: RegExp;
};

describe("mountedHref / serviceWorkerUrl", () => {
  it("scopes the demo's own mount", () => {
    expect(BASE_PATH).toBe("/demo/clinicos");
    expect(mountedHref("/icons/icon-192.png")).toBe("/demo/clinicos/icons/icon-192.png");
    expect(serviceWorkerUrl()).toBe("/demo/clinicos/sw.js");
  });

  it("is idempotent, so an already-scoped path is not doubled", () => {
    expect(mountedHref("/demo/clinicos/icons/icon-192.png")).toBe(
      "/demo/clinicos/icons/icon-192.png",
    );
    expect(mountedHref("/demo/clinicos")).toBe("/demo/clinicos");
  });

  it("keeps the query string and fragment", () => {
    expect(mountedHref("/api/x?a=1&b=2#f")).toBe("/demo/clinicos/api/x?a=1&b=2#f");
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
    // The mount is the app's own home ([locale]/(app)/page), not the platform's.
    expect(m.start_url).toBe(BASE_PATH);
    // Any of these being "/" breaks or hijacks the install.
    expect(m.start_url).not.toBe("/");
    expect(m.scope).not.toBe("/");
  });

  it("works for any mount point, not just the demo's", () => {
    const m = buildPwaManifest("/gd/clinicos", LABELS);
    expect(m.id).toBe("/gd/clinicos");
    expect(m.start_url).toBe("/gd/clinicos");
    expect((m.icons ?? []).every((i) => i.src.startsWith("/gd/clinicos/icons/"))).toBe(true);
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
    // The app's own --primary / --background (app/globals.css), not a generic
    // teal: the launcher paints the status bar and the splash with these.
    expect(m.theme_color).toBe("#0e7c74");
    expect(m.background_color).toBe("#f6f5f1");
    expect(m.name).toBe(LABELS.name);
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
    // next-intl puts the document at [locale], so that is the root layout.
    const layout = read("src/app/[locale]/layout.tsx");
    expect(layout).toContain("mountedHref(");
    // Every /icons/ literal must sit inside a mount-aware call.
    const iconLines = layout
      .split("\n")
      .filter((line) => line.includes("/icons/") && !line.trim().startsWith("//"));
    expect(iconLines.length).toBeGreaterThan(0);
    for (const line of iconLines) expect(line).toContain("mountedHref(");
  });

  it("installs the app under its own name, not the platform's", () => {
    const layout = read("src/app/[locale]/layout.tsx");
    expect(layout).toContain('applicationName: "ClinicOS"');
    // Next does not prefix metadata with the basePath, so a bare
    // /manifest.webmanifest is requested from the platform's root (404) and the
    // browser never discovers this app's manifest.
    expect(layout).toContain('manifest: mountedHref("/manifest.webmanifest")');
  });

  it("registers the app's own worker under the mount, not the platform's /sw.js", () => {
    const src = read("src/components/pwa-register.tsx");
    expect(src).not.toMatch(/register\(\s*["'`]\/sw\.js["'`]/);
    expect(src).toContain("swUrl");
    expect(read("src/app/[locale]/layout.tsx")).toContain("serviceWorkerUrl()");
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

  it("never reuses the platform's or the dental app's artwork", () => {
    // A copy of someone else's icon is the same defect as a bare /icons/ path:
    // the installed app wears a brand that is not this product's.
    const here = readFileSync(join(APP, "public", "icons", "icon-512.png"));
    const platform = join(__dirname, "..", "..", "public", "icons", "icon-512.png");
    const dental = join(__dirname, "..", "..", "demo-systems", "dental", "public", "icons", "icon-512.png");
    expect(here.equals(readFileSync(platform))).toBe(false);
    expect(here.equals(readFileSync(dental))).toBe(false);
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
    expect(loadWorker("/demo/clinicos/sw.js").MOUNT).toBe("/demo/clinicos");
    // An organization's clone is the same file one level over.
    expect(loadWorker("/acme/clinicos/sw.js").MOUNT).toBe("/acme/clinicos");
    // Degenerates correctly if it were ever served from the origin root.
    expect(loadWorker("/sw.js").MOUNT).toBe("");
  });

  it("resolves build assets and auth/api paths relative to the mount", () => {
    const { mountRelative } = loadWorker("/demo/clinicos/sw.js");
    // The real request path under the mount...
    expect(mountRelative("/demo/clinicos/_next/static/chunks/a.js")).toBe(
      "/_next/static/chunks/a.js",
    );
    // ...and the skip-list, which is written mount-independent.
    expect(mountRelative("/demo/clinicos/login")).toBe("/login");
    expect(mountRelative("/demo/clinicos/api/health")).toBe("/api/health");
  });

  it("skips the auth screens, the API and itself, and nothing else", () => {
    const { mountRelative, NO_CACHE_PATHS } = loadWorker("/demo/clinicos/sw.js");
    for (const path of ["/login", "/api/health", "/sw.js"]) {
      expect(NO_CACHE_PATHS.test(mountRelative(`/demo/clinicos${path}`)), path).toBe(true);
    }
    // The manifest's start_url is the installed app's launch target; if the
    // worker's skip-list swallowed the root, every launch would bypass the cache.
    for (const path of ["/patients", "/", "/_next/static/chunks/a.js"]) {
      expect(NO_CACHE_PATHS.test(mountRelative(`/demo/clinicos${path}`)), path).toBe(false);
    }
  });

  it("routes both request checks through the mount, not the raw pathname", () => {
    // The defect that makes grocery's worker a silent no-op: under the mount the
    // assets are at /demo/clinicos/_next/static/, so testing the raw pathname
    // against "/_next/static/" never matches and nothing is ever cached.
    expect(sw).toContain('mountRelative(url.pathname).startsWith("/_next/static/")');
    expect(sw).toContain("NO_CACHE_PATHS.test(mountRelative(url.pathname))");
  });
});
