/**
 * Which demo systems the dev cluster serves, and how — and the same decision
 * for the platform itself.
 *
 * A repo-hosted demo app (`demo-systems/<slug>`) was served by `next dev`, which
 * compiles a page the first time it is requested. On this machine a warm page
 * costs ~1.4 s in dev against ~0.2 s from a production build, and a page that
 * has never been visited costs several seconds on top. Since `/demo/<slug>` is a
 * showcase, that first click is the one that matters most and was the slowest
 * thing on the site.
 *
 * The rule is therefore: serve a hosted demo app from its production output when
 * a `serve:<slug>` script exists, and keep `dev:<slug>` as the on-demand editing
 * path. `src/core/demo/demo-systems.ts` stays the single source of truth for the
 * slug, folder, port and mount - nothing here repeats them.
 *
 * The platform gets the same rule for a stronger reason than latency: `next dev`
 * ships ~15 MB of unminified JavaScript, so serving the ERP that way is not
 * merely slow but is the dominant cost on every page a visitor opens.
 *
 * The freshness check exists because `next start` silently serves whatever
 * `.next` it finds: a stale build is a wrong answer, which is worse than a slow
 * one, and the folder ships with a `.next` from the machine that produced it.
 */
import { readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { DEMO_SYSTEMS } from "@/core/demo/demo-systems";

export interface HostedDemoApp {
  /** Registry slug, and the suffix of both the `dev:` and `serve:` scripts. */
  slug: string;
  /** Folder in this workspace holding the standalone app. */
  dir: string;
  /** Public path the platform proxies to it. */
  mount: string;
  /** Port the rewrite targets, so the two cannot drift. */
  port: number;
}

export interface DemoServeMode {
  /** The npm script the launcher should run. */
  script: string;
  mode: "production" | "dev";
}

/** The demo systems whose source is in this repo, in registry order. */
export function hostedDemoApps(): HostedDemoApp[] {
  return DEMO_SYSTEMS.filter((system) => system.sourceDir.startsWith("demo-systems/")).map(
    (system) => ({
      slug: system.slug,
      dir: system.sourceDir,
      mount: system.rootPath,
      port: system.port,
    }),
  );
}

/** Production output when the app declares one, dev otherwise. */
export function resolveDemoServeMode(
  scripts: Record<string, string | undefined>,
  slug: string,
): DemoServeMode | undefined {
  const production = `serve:${slug}`;
  if (scripts[production]) return { script: production, mode: "production" };
  const dev = `dev:${slug}`;
  if (scripts[dev]) return { script: dev, mode: "dev" };
  return undefined;
}

/** The platform's own `dev:` script — hot reload, and the editing path. */
export const PLATFORM_DEV_SCRIPT = "dev:erp";
/** Its `serve:` script. Its presence is what makes a production ERP possible. */
export const PLATFORM_SERVE_SCRIPT = "serve:erp";
/** Set to force the platform onto `next dev`, e.g. `BOS_ERP_DEV=1 npm run dev`. */
export const PLATFORM_DEV_ENV = "BOS_ERP_DEV";

/**
 * How the launcher serves the platform itself.
 *
 * Deliberately the same shape as `resolveDemoServeMode`: a production build
 * when the repo declares one, `next dev` otherwise. The difference is the
 * override — the platform is the thing being edited far more often than a demo
 * is, so `BOS_ERP_DEV` has to reach the editing path without anybody editing
 * this file or a package.json script by hand.
 *
 * An explicit dev request wins over a declared serve script, so the override is
 * read first and cannot be silently defeated by the script's existence.
 */
export function resolvePlatformServeMode(
  scripts: Record<string, string | undefined>,
  env: Record<string, string | undefined>,
): DemoServeMode {
  if (env[PLATFORM_DEV_ENV]) return { script: PLATFORM_DEV_SCRIPT, mode: "dev" };
  if (scripts[PLATFORM_SERVE_SCRIPT]) return { script: PLATFORM_SERVE_SCRIPT, mode: "production" };
  return { script: PLATFORM_DEV_SCRIPT, mode: "dev" };
}

/**
 * What the launcher warms once, through the platform, so a first visitor never
 * pays for it.
 *
 * The `/demo` index comes first because it is the page the links live on: a
 * visitor reaches the grocery app through it, so leaving it out would only move
 * the stall one click earlier. Each app's own mount is one request that warms
 * both the platform's route and the sub-app in a single call.
 */
export function demoPrewarmUrls(origin: string): string[] {
  const base = origin.replace(/\/+$/, "");
  return [`${base}/demo`, ...hostedDemoApps().map((app) => `${base}${app.mount}`)];
}

/** Nothing under these belongs to the app's own source. */
const IGNORED_DIRS = new Set(["node_modules", ".next", ".next-dev", ".turbo", ".git", "dist"]);

/**
 * Everything whose change should trigger a rebuild.
 *
 * `prisma/` is here because the build regenerates the client from it and the app
 * imports the result. Config files are here because they are baked into the
 * output. Directory mtimes are deliberately not consulted: they move whenever a
 * file is created anywhere below, which after a build is normal and would make
 * every fresh build look stale.
 */
const TRACKED = [
  "src",
  "prisma",
  "public",
  "next.config.ts",
  "package.json",
  "postcss.config.mjs",
  "tsconfig.json",
];

function newestFileMtime(path: string, depth = 0): number {
  if (depth > 24) return 0;
  let stat;
  try {
    stat = statSync(path);
  } catch {
    return 0;
  }
  if (!stat.isDirectory()) return stat.mtimeMs;
  if (IGNORED_DIRS.has(basename(path))) return 0;
  let newest = 0;
  let entries: string[];
  try {
    entries = readdirSync(path);
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const child = newestFileMtime(join(path, entry), depth + 1);
    if (child > newest) newest = child;
  }
  return newest;
}

/** True when `next start` in this folder would serve something out of date. */
export function isProductionBuildStale(appDir: string): boolean {
  const buildId = join(appDir, ".next", "BUILD_ID");
  let builtAt: number;
  try {
    builtAt = statSync(buildId).mtimeMs;
  } catch {
    return true;
  }
  for (const entry of TRACKED) {
    if (newestFileMtime(join(appDir, entry)) > builtAt) return true;
  }
  return false;
}

/**
 * Rebuild the app only when its output is out of date, through an injected
 * runner so the decision can be tested without a compiler.
 *
 * Returns whether a build was started.
 */
export function ensureProductionBuild(appDir: string, run: (dir: string) => void): boolean {
  if (!isProductionBuildStale(appDir)) return false;
  run(appDir);
  return true;
}
