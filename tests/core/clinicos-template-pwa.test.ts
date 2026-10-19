import { afterAll, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

/**
 * The installable template (`system/clinicos`) is served two ways: the platform
 * runs an organization's own copy at `/{org}/clinicos`, and the folder is also
 * a standalone Next.js app (`npm run dev`, or a plain production build at
 * `/clinicos`). The clone path is covered by `clinicos-mount.test.ts`; this spec
 * covers the standalone one, which nothing else exercised.
 *
 * The template's mount is a variable, not a literal: `next.config.ts` reads
 * `SYSTEM_BASE_PATH`, so the build is only correct for the mount it was made
 * at. The app's own code reads the *other* half — `NEXT_PUBLIC_BASE_PATH` — to
 * build the manifest's `id`/`scope`/`start_url`/icons, to register its worker
 * and to point the auth client at its own `/api/auth`. Nothing normalizes those
 * by hand and they are compiled into the client bundle, so if the two diverge
 * the app is built for `/clinicos` while the browser half assumed the origin
 * root: a manifest scoped to `/`, an app that opens the platform home, and a
 * worker that is the platform's rather than this app's.
 *
 * This spec imports the real config (with the mount vars deleted) rather than
 * pattern-matching it, so it fails whichever of the two halves drifts.
 */

const TEMPLATE = join(__dirname, "..", "..", "system", "clinicos");
const DEMO = join(__dirname, "..", "..", "demo-systems", "clinicos");

const read = (root: string, ...parts: string[]) => readFileSync(join(root, ...parts), "utf8");

/** The env the supervisor sets for an org's copy, put back after the import. */
const saved = {
  system: process.env.SYSTEM_BASE_PATH,
  public: process.env.NEXT_PUBLIC_BASE_PATH,
};

// Both are deleted, not blanked: this is exactly the standalone case.
delete process.env.SYSTEM_BASE_PATH;
delete process.env.NEXT_PUBLIC_BASE_PATH;

const config = (await import("../../system/clinicos/next.config")).default;
const { BASE_PATH, mountedHref, serviceWorkerUrl, buildPwaManifest } = await import(
  "../../system/clinicos/src/lib/pwa"
);

afterAll(() => {
  if (saved.system === undefined) delete process.env.SYSTEM_BASE_PATH;
  else process.env.SYSTEM_BASE_PATH = saved.system;
  if (saved.public === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
  else process.env.NEXT_PUBLIC_BASE_PATH = saved.public;
});

/** The brand `src/app/manifest.ts` installs under. */
const LABELS = { name: "ClinicOS — نظام إدارة العيادات", shortName: "ClinicOS" };

/** PNG IHDR: 8-byte signature, then width/height as big-endian uint32 at byte 16. */
function pngSize(root: string, rel: string): [number, number] {
  const bytes = readFileSync(join(root, "public", rel));
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  expect(bytes.subarray(0, 8).equals(signature), `${rel} is not a PNG`).toBe(true);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

/** The stylesheet token the launcher should be painted with. */
const cssToken = (name: string): string => {
  const found = new RegExp(`--${name}:\\s*(#[0-9a-f]{3,8})\\s*;`, "i").exec(
    read(TEMPLATE, "src", "app", "globals.css"),
  );
  expect(found, `globals.css must define --${name} in :root`).not.toBeNull();
  return found![1].toLowerCase();
};

describe("the template's standalone mount", () => {
  it("builds for /clinicos with no SYSTEM_BASE_PATH", () => {
    expect(config.basePath).toBe("/clinicos");
  });

  it("hands the browser half the same mount the build uses", () => {
    // The defect this spec exists for: basePath "/clinicos" while
    // NEXT_PUBLIC_BASE_PATH stays "" — two halves of one app, two mounts.
    expect(process.env.NEXT_PUBLIC_BASE_PATH).toBe(config.basePath);
    expect(BASE_PATH).toBe("/clinicos");
  });

  it("keeps the mount overridable, so an org clone still gets its own path", () => {
    // The supervisor sets *both* vars; the config must not clobber the pair.
    expect(read(TEMPLATE, "next.config.ts")).toContain("process.env.NEXT_PUBLIC_BASE_PATH ??=");
    expect(read(TEMPLATE, "next.config.ts")).toContain("process.env.SYSTEM_BASE_PATH ??");
  });

  it("documents the mount in .env and .env.example", () => {
    for (const file of [".env", ".env.example"]) {
      expect(read(TEMPLATE, file), `${file} must record the mount`).toContain(
        'NEXT_PUBLIC_BASE_PATH="/clinicos"',
      );
    }
  });
});

describe("the template's manifest", () => {
  it("never claims the origin", () => {
    const m = buildPwaManifest(BASE_PATH, LABELS);
    // "/" here installs an app that opens the platform home and, worse, a scope
    // that swallows every other app on the same host.
    expect(m.id).toBe("/clinicos");
    expect(m.scope).toBe("/clinicos");
    expect(m.start_url).toBe("/clinicos");
    expect(m.scope).not.toBe("/");
    expect(m.start_url).not.toBe("/");
  });

  it("spells out its `id`, so a stale install cannot masquerade as this app", () => {
    // Android keys the WebAPK by `id`. An install recorded while the mount was
    // broken keeps resurfacing as "Open app" / "can't open app"; a declared `id`
    // is what lets a changed identity reach the launcher at all.
    const m = buildPwaManifest(BASE_PATH, LABELS);
    expect(m.id).toBeDefined();
    expect(m.id).toBe(m.scope);
    // Reflecting the mount means an org clone gets its own identity for free.
    expect(buildPwaManifest("/acme/clinicos", LABELS).id).toBe("/acme/clinicos");
  });

  it("keeps every icon inside the mount", () => {
    const icons = buildPwaManifest(BASE_PATH, LABELS).icons ?? [];
    expect(icons.length).toBeGreaterThanOrEqual(3);
    for (const icon of icons) expect(icon.src.startsWith("/clinicos/")).toBe(true);
    expect(icons.some((i) => i.src.startsWith("/icons/"))).toBe(false);
  });

  it("exists on disk at the size it advertises", () => {
    for (const icon of buildPwaManifest(BASE_PATH, LABELS).icons ?? []) {
      const rel = icon.src.slice("/clinicos".length).replace(/^\//, "");
      expect(existsSync(join(TEMPLATE, "public", rel)), `${icon.src} is not in public/`).toBe(true);
      const [w, h] = pngSize(TEMPLATE, rel);
      expect(`${w}x${h}`, `${icon.src} advertises ${icon.sizes}`).toBe(icon.sizes);
    }
  });

  it("ships the apple-touch-icon iOS actually asks for", () => {
    // It is referenced by `metadata.icons.apple` but was in no manifest entry,
    // so nothing checked it existed.
    expect(existsSync(join(TEMPLATE, "public", "icons", "apple-touch-icon.png"))).toBe(true);
    expect(pngSize(TEMPLATE, "icons/apple-touch-icon.png").join("x")).toBe("180x180");
  });

  it("paints the launcher with the app's own tokens", () => {
    const m = buildPwaManifest(BASE_PATH, LABELS);
    // theme_color is the status bar, background_color the splash behind the
    // icons; generic values there make the installed app look like someone
    // else's product even when every path above is right.
    expect(m.theme_color?.toLowerCase()).toBe(cssToken("primary"));
    expect(m.background_color?.toLowerCase()).toBe(cssToken("background"));
  });
});

describe("the worker the template registers", () => {
  it("is its own, under the mount, not the platform's origin-wide one", () => {
    expect(serviceWorkerUrl()).toBe("/clinicos/sw.js");
    expect(serviceWorkerUrl()).not.toBe("/sw.js");
  });

  it("scopes itself from its own URL, so a clone needs no new file", () => {
    const sw = read(TEMPLATE, "public", "sw.js");
    const prelude = sw.slice(0, sw.indexOf('self.addEventListener("install"'));
    expect(prelude, "sw.js must define its path logic before registering").not.toBe("");

    const load = (pathname: string) => {
      const sandbox: { self: { location: { pathname: string } }; out?: any } = {
        self: { location: { pathname } },
      };
      runInNewContext(`${prelude}\nout = { MOUNT, mountRelative, NO_CACHE_PATHS };`, sandbox);
      return sandbox.out;
    };

    // The standalone mount this spec exists for...
    const standalone = load("/clinicos/sw.js");
    expect(standalone.MOUNT).toBe("/clinicos");
    // ...and an org's own copy, one level over, from the very same file.
    const org = load("/acme/clinicos/sw.js");
    expect(org.MOUNT).toBe("/acme/clinicos");
    expect(org.mountRelative("/acme/clinicos/_next/static/chunks/a.js")).toBe(
      "/_next/static/chunks/a.js",
    );
    // Nothing is ever cached if this is tested against the raw pathname.
    expect(sw).toContain('mountRelative(url.pathname).startsWith("/_next/static/")');
    expect(sw).toContain("NO_CACHE_PATHS.test(mountRelative(url.pathname))");
  });

  it("registers a client-side auth base path inside the mount", () => {
    // Better Auth's *server* half is the constant /api/auth (Next strips the
    // basePath before the handler); the browser half must carry the mount or
    // sign-in posts to the origin root and 404s.
    expect(read(TEMPLATE, "src", "core", "auth", "client.ts")).toContain(
      '`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth`',
    );
  });
});

describe("the template and the demo are one implementation", () => {
  /**
   * Both trees serve the same app; the map records that they are kept
   * byte-identical by copying rather than by a second edit pass. These five
   * files are the PWA's whole surface, so a fix applied to one tree only is the
   * defect this catches.
   */
  const SHARED = [
    ["src", "lib", "pwa.ts"],
    ["src", "app", "manifest.ts"],
    ["src", "components", "pwa-register.tsx"],
    ["src", "app", "[locale]", "layout.tsx"],
    ["public", "sw.js"],
  ];

  for (const parts of SHARED) {
    it(`${parts.join("/")} is the same file in both trees`, () => {
      expect(read(TEMPLATE, ...parts)).toBe(read(DEMO, ...parts));
    });
  }

  it("does not require next.config.ts to match: the demo's mount is a literal", () => {
    // The demo is only ever served at /demo/clinicos and the platform's
    // mount-path test pins that literal, so it cannot share the template's
    // `SYSTEM_BASE_PATH` read. Everything above still has to agree.
    expect(read(DEMO, "next.config.ts")).toContain('basePath: "/demo/clinicos"');
    expect(read(TEMPLATE, "next.config.ts")).not.toContain('basePath: "/demo/clinicos"');
  });
});

describe("mountedHref under the template's standalone mount", () => {
  it("scopes hand-built paths, and is safe to call twice", () => {
    expect(mountedHref("/api/notifications?limit=50")).toBe(
      "/clinicos/api/notifications?limit=50",
    );
    expect(mountedHref("/clinicos/api/notifications")).toBe("/clinicos/api/notifications");
    expect(mountedHref("https://cdn.test/a.png")).toBe("https://cdn.test/a.png");
  });
});
