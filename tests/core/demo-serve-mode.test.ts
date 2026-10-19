/**
 * The repo-hosted demo systems (`demo-systems/grocery`, `demo-systems/dental`,
 * `demo-systems/clinicos`)
 * were served by `next dev`, and dev mode compiles every page the first time it
 * is requested. On this machine that is the difference between ~1.4 s and
 * ~0.2 s for an already-compiled page, and several seconds for one that has
 * never been visited. The launcher now prefers a production build for them.
 *
 * The trade is real - a production sub-app has no hot reload - so the rule is
 * narrow and fixed: a hosted demo app is served from production output when a
 * `serve:<slug>` script exists, and `dev:<slug>` remains the on-demand editing
 * path. Both halves are asserted here, because "the demo got slow again" has
 * exactly one cause: one of these drift apart.
 *
 * The platform now follows the same rule, and for a bigger reason than latency.
 * `next dev` ships ~15 MB of unminified JavaScript - a 12.9 MB `main-app.js`
 * carrying the dev overlay and the React dev runtime, with a `?v=` that changes
 * on every recompile so the browser cache never helps - against a minified app
 * bundle. That is the dominant cost on every page a visitor opens, and it lands
 * on their CPU before anything paints. The override `BOS_ERP_DEV` exists
 * because the platform is what gets edited, so its editing path has to stay one
 * command away rather than a file edit away.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  demoPrewarmUrls,
  ensureProductionBuild,
  hostedDemoApps,
  isProductionBuildStale,
  resolveDemoServeMode,
  resolvePlatformServeMode,
} from "../../scripts/demo-runtime";

const REPO_ROOT = join(__dirname, "..", "..");

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")) as T;
}

const rootScripts = readJson<{ scripts: Record<string, string> }>(
  join(REPO_ROOT, "package.json"),
).scripts;

const tempDirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "demo-serve-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("hostedDemoApps", () => {
  it("is the registry's own list, so a port or mount can never be written twice", () => {
    // Imported lazily so the registry stays the single source of truth: this
    // test must fail if `hostedDemoApps` starts hardcoding either value.
    const apps = hostedDemoApps();
    expect(apps.map((a) => a.slug).sort()).toEqual(["clinicos", "dental", "grocery"]);
    expect(apps.find((a) => a.slug === "grocery")).toMatchObject({
      dir: "demo-systems/grocery",
      mount: "/demo/grocery",
      port: 3101,
    });
    expect(apps.find((a) => a.slug === "dental")).toMatchObject({
      dir: "demo-systems/dental",
      mount: "/demo/dental",
      port: 3106,
    });
  });
});

describe("resolveDemoServeMode", () => {
  it("prefers the production script when both exist", () => {
    expect(
      resolveDemoServeMode({ "dev:grocery": "next dev", "serve:grocery": "next start" }, "grocery"),
    ).toEqual({ script: "serve:grocery", mode: "production" });
  });

  it("falls back to the dev script when there is no production one", () => {
    expect(resolveDemoServeMode({ "dev:grocery": "next dev" }, "grocery")).toEqual({
      script: "dev:grocery",
      mode: "dev",
    });
  });

  it("reports an app with neither script instead of inventing a command", () => {
    expect(resolveDemoServeMode({}, "grocery")).toBeUndefined();
  });

  it("serves every hosted app from production by default", () => {
    for (const app of hostedDemoApps()) {
      const resolved = resolveDemoServeMode(rootScripts, app.slug);
      expect(resolved?.mode, app.slug).toBe("production");
    }
  });

  it("keeps dev-on-demand for every hosted app", () => {
    for (const app of hostedDemoApps()) {
      expect(rootScripts[`dev:${app.slug}`], app.slug).toBeDefined();
    }
  });

  it("starts each production script on the port the platform rewrites to", () => {
    // The rewrite target is baked from the registry at build time; a `next start`
    // on a different port is a 502 with no other symptom.
    for (const app of hostedDemoApps()) {
      const script = rootScripts[`serve:${app.slug}`];
      expect(script, app.slug).toBeDefined();
      expect(script, app.slug).toContain(`--port ${app.port}`);
      expect(script, app.slug).toContain(app.dir);
    }
  });

  it("serves production output, not another dev server", () => {
    for (const app of hostedDemoApps()) {
      expect(rootScripts[`serve:${app.slug}`]).toContain("run start");
    }
  });

  it("keeps a production start script inside each sub-app", () => {
    // `serve:<slug>` only works because the sub-app declares its own start.
    for (const app of hostedDemoApps()) {
      const pkg = readJson<{ scripts: Record<string, string> }>(
        join(REPO_ROOT, app.dir, "package.json"),
      );
      expect(pkg.scripts.start, app.slug).toBe("next start");
    }
  });
});

describe("isProductionBuildStale", () => {
  const SOURCE = join("src", "app", "page.tsx");

  function build(dir: string, at: Date): void {
    mkdirSync(join(dir, ".next"), { recursive: true });
    writeFileSync(join(dir, ".next", "BUILD_ID"), "id");
    utimesSync(join(dir, ".next", "BUILD_ID"), at, at);
  }

  function source(dir: string, at: Date): void {
    mkdirSync(join(dir, "src", "app"), { recursive: true });
    writeFileSync(join(dir, SOURCE), "export default 1");
    utimesSync(join(dir, SOURCE), at, at);
  }

  it("treats an app that was never built as stale", () => {
    expect(isProductionBuildStale(tempDir())).toBe(true);
  });

  it("treats a build older than a source file as stale", () => {
    const dir = tempDir();
    build(dir, new Date("2026-01-01T00:00:00Z"));
    source(dir, new Date("2026-01-02T00:00:00Z"));
    expect(isProductionBuildStale(dir)).toBe(true);
  });

  it("treats a build newer than every source file as fresh", () => {
    const dir = tempDir();
    source(dir, new Date("2026-01-01T00:00:00Z"));
    build(dir, new Date("2026-01-02T00:00:00Z"));
    expect(isProductionBuildStale(dir)).toBe(false);
  });

  it("does not let node_modules or the previous build mark it stale", () => {
    // Both are newer than the build on any real install, and neither is source.
    const dir = tempDir();
    source(dir, new Date("2026-01-01T00:00:00Z"));
    build(dir, new Date("2026-01-02T00:00:00Z"));
    mkdirSync(join(dir, "node_modules", "next"), { recursive: true });
    writeFileSync(join(dir, "node_modules", "next", "index.js"), "x");
    const later = new Date("2026-03-01T00:00:00Z");
    utimesSync(join(dir, "node_modules", "next", "index.js"), later, later);
    mkdirSync(join(dir, ".next", "dev", "logs"), { recursive: true });
    writeFileSync(join(dir, ".next", "dev", "logs", "next-development.log"), "x");
    utimesSync(join(dir, ".next", "dev", "logs", "next-development.log"), later, later);
    expect(isProductionBuildStale(dir)).toBe(false);
  });
});

describe("ensureProductionBuild", () => {
  it("does not rebuild an app whose production output is current", () => {
    const dir = tempDir();
    mkdirSync(join(dir, ".next"), { recursive: true });
    writeFileSync(join(dir, ".next", "BUILD_ID"), "id");
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "src", "page.tsx"), "x");
    const older = new Date("2026-01-01T00:00:00Z");
    utimesSync(join(dir, "src", "page.tsx"), older, older);
    utimesSync(join(dir, ".next", "BUILD_ID"), new Date("2026-02-01T00:00:00Z"), new Date("2026-02-01T00:00:00Z"));

    const run = vi.fn();
    expect(ensureProductionBuild(dir, run)).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it("rebuilds a stale app and reports that it did", () => {
    const dir = tempDir();
    const run = vi.fn();
    expect(ensureProductionBuild(dir, run)).toBe(true);
    expect(run).toHaveBeenCalledWith(dir);
  });
});

describe("demoPrewarmUrls", () => {
  it("warms the demo index and every hosted app at the mount it is served at", () => {
    // The index is where the links are, so it is on the path to every demo app
    // and its own first-hit compile would otherwise just move the stall one
    // click earlier. One request per app then warms the platform route and the
    // upstream together.
    expect(demoPrewarmUrls("http://localhost:3300")).toEqual([
      "http://localhost:3300/demo",
      "http://localhost:3300/demo/grocery",
      "http://localhost:3300/demo/dental",
      "http://localhost:3300/demo/clinicos",
    ]);
  });

  it("does not double the slash when the origin ends in one", () => {
    expect(demoPrewarmUrls("http://localhost:3300/")[1]).toBe("http://localhost:3300/demo/grocery");
  });
});

describe("resolvePlatformServeMode", () => {
  const withServe = { "dev:erp": "next dev", "serve:erp": "next start -p 3300" };

  it("serves the platform from its production build when one is declared", () => {
    expect(resolvePlatformServeMode(withServe, {})).toEqual({
      script: "serve:erp",
      mode: "production",
    });
  });

  it("falls back to the dev server when no production script exists", () => {
    expect(resolvePlatformServeMode({ "dev:erp": "next dev" }, {})).toEqual({
      script: "dev:erp",
      mode: "dev",
    });
  });

  it("lets an explicit dev request win over the production script", () => {
    // The platform is edited far more often than a demo is, so the editing path
    // has to stay reachable without hand-editing a script or this file.
    expect(resolvePlatformServeMode(withServe, { BOS_ERP_DEV: "1" })).toEqual({
      script: "dev:erp",
      mode: "dev",
    });
  });

  it("ignores an empty override, so exporting it in a shell profile is harmless", () => {
    expect(resolvePlatformServeMode(withServe, { BOS_ERP_DEV: "" }).mode).toBe("production");
  });

  it("serves the real platform from production, which is the entire point", () => {
    // The 15 MB dev bundle comes back the moment this drifts, and nothing else
    // would fail - the site would just be slow again. An empty environment keeps
    // this deterministic: a developer's own `BOS_ERP_DEV` is not this repo's rule.
    expect(resolvePlatformServeMode(rootScripts, {}).mode).toBe("production");
  });

  it("keeps the editing path reachable", () => {
    expect(rootScripts["dev:erp"]).toBeDefined();
  });

  it("starts the platform on the port the launcher already binds", () => {
    // A `next start` on another port is a dead platform: the launcher, the demo
    // rewrites and every prewarm URL all assume 3300.
    expect(rootScripts["serve:erp"]).toContain("next start");
    expect(rootScripts["serve:erp"]).toContain("-p 3300");
    expect(rootScripts["serve:erp"]).not.toContain("next dev");
  });
});

describe("dev.ts wiring", () => {
  it("serves hosted apps from their production build and prewarms their mounts", () => {
    // The policy above is worthless if the launcher stops asking for it. Both
    // calls are asserted by name for the same reason the instrumentation
    // runtime split has a source-assertion test: nothing else links the two.
    const dev = readFileSync(join(REPO_ROOT, "scripts", "dev.ts"), "utf8");
    expect(dev).toContain("ensureProductionBuild");
    expect(dev).toContain("demoPrewarmUrls");
    expect(dev).toContain("resolveDemoServeMode");
  });

  it("asks the same policy about the platform itself", () => {
    const dev = readFileSync(join(REPO_ROOT, "scripts", "dev.ts"), "utf8");
    expect(dev).toContain("resolvePlatformServeMode");
    // The platform is the one target a failure takes the whole launcher down
    // with, so it must stay critical however it is served.
    expect(dev).toMatch(/function resolveErpTarget[\s\S]*critical:\s*true/);
  });

  it("builds the platform through `npm run build`, which is what raises the heap", () => {
    // A bare `next build` exhausts the default heap on this app and dies part-way
    // through compilation; scripts/build.ts sets the floor. Spawning `next build`
    // directly here would reintroduce that failure as a launcher bug.
    const dev = readFileSync(join(REPO_ROOT, "scripts", "dev.ts"), "utf8");
    const buildPlatform = dev.slice(dev.indexOf("function buildPlatform"));
    expect(buildPlatform).toContain("npm run build");
    expect(buildPlatform).not.toMatch(/spawnSync\(["'`]next build/);
  });

  it("keeps the demo apps non-critical so a failed build cannot kill the ERP", () => {
    const dev = readFileSync(join(REPO_ROOT, "scripts", "dev.ts"), "utf8");
    expect(dev).not.toMatch(/name:\s*"grocery"[\s\S]{0,80}critical:\s*true/);
    expect(existsSync(join(REPO_ROOT, "scripts", "dev.ts"))).toBe(true);
  });
});
