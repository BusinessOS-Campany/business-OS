import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BASE_PATH, mountedHref, serviceWorkerUrl } from "../../demo-systems/grocery/src/lib/app-url";
import { buildPwaManifest } from "../../demo-systems/grocery/src/lib/pwa";

/**
 * The demo grocery app is mounted at /demo/grocery through the platform proxy.
 * Its HTML links its own manifest, so Next prefixes nothing inside the manifest
 * body: every path there is the app's own responsibility.
 *
 * Shipped root-absolute, `icons[].src` pointed at the *platform's* /icons/*.png
 * (16,492 B blue logo) instead of the store's own (4,192 B green logo), so the
 * installed app wore the Business OS icon; `id`/`start_url`/`scope` were "/" so
 * it also opened the platform home; and the register call used "/sw.js" — the
 * platform's origin-wide worker. These assertions keep all four from returning.
 */

const APP = join(__dirname, "..", "..", "demo-systems", "grocery");
const read = (rel: string): string => readFileSync(join(APP, rel), "utf8");

const LABELS = { storeName: "بقالة", appName: "نظام إدارة البقالة" };

describe("mountedHref / serviceWorkerUrl", () => {
  it("scopes the demo's own mount", () => {
    expect(BASE_PATH).toBe("/demo/grocery");
    expect(mountedHref("/icons/icon-192.png")).toBe("/demo/grocery/icons/icon-192.png");
    expect(serviceWorkerUrl()).toBe("/demo/grocery/sw.js");
  });

  it("is idempotent, so an already-scoped path is not doubled", () => {
    expect(mountedHref("/demo/grocery/icons/icon-192.png")).toBe(
      "/demo/grocery/icons/icon-192.png",
    );
    expect(mountedHref("/demo/grocery")).toBe("/demo/grocery");
  });

  it("keeps the query string and fragment", () => {
    expect(mountedHref("/api/x?a=1&b=2#f")).toBe("/demo/grocery/api/x?a=1&b=2#f");
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
    expect(m.start_url).toBe(`${BASE_PATH}/dashboard`);
    // Any of these being "/" breaks or hijacks the install.
    expect(m.start_url).not.toBe("/");
    expect(m.scope).not.toBe("/");
  });

  it("works for any mount point, not just the demo's", () => {
    const m = buildPwaManifest("/gm/grocery", LABELS);
    expect(m.id).toBe("/gm/grocery");
    expect(m.start_url).toBe("/gm/grocery/dashboard");
    expect((m.icons ?? []).every((i) => i.src.startsWith("/gm/grocery/icons/"))).toBe(true);
  });

  it("keeps every icon inside the mount point", () => {
    const icons = buildPwaManifest(BASE_PATH, LABELS).icons ?? [];
    expect(icons.length).toBeGreaterThanOrEqual(3);
    for (const icon of icons) expect(icon.src.startsWith(`${BASE_PATH}/`)).toBe(true);
  });

  it("declares a maskable icon, or Android installs it with a cropped badge", () => {
    const icons = buildPwaManifest(BASE_PATH, LABELS).icons ?? [];
    expect(icons.some((i) => i.purpose === "maskable")).toBe(true);
  });

  it("is installable standalone in RTL, named after the store", () => {
    const m = buildPwaManifest(BASE_PATH, LABELS);
    expect(m.display).toBe("standalone");
    expect(m.dir).toBe("rtl");
    expect(m.theme_color).toBe("#16a34a");
    expect(m.name).toContain(LABELS.storeName);
    expect(m.short_name).toBe(LABELS.appName);
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

  it("ships every icon the manifest advertises", () => {
    const icons = buildPwaManifest(BASE_PATH, LABELS).icons ?? [];
    for (const icon of icons) {
      const onDisk = join(APP, "public", icon.src.slice(BASE_PATH.length));
      expect(existsSync(onDisk), `${icon.src} is advertised but not in public/`).toBe(true);
    }
    expect(existsSync(join(APP, "public", "icons", "apple-touch-icon.png"))).toBe(true);
  });
});
