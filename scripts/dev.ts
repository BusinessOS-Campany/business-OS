import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { delimiter, join } from "node:path";
import {
  demoPrewarmUrls,
  ensureProductionBuild,
  hostedDemoApps,
  PLATFORM_DEV_ENV,
  PLATFORM_DEV_SCRIPT,
  resolveDemoServeMode,
  resolvePlatformServeMode,
} from "./demo-runtime";

/**
 * Development launcher.
 *
 * Wired to `npm run dev`. It starts the ERP and, alongside it, the standalone
 * apps that live in this workspace.
 *
 * The ERP is served from its **production build** by default, for the reason
 * the demo apps are: `next dev` ships ~15 MB of unminified JavaScript — a
 * 12.9 MB `main-app.js` on its own, carrying the dev overlay and the React dev
 * runtime, with a `?v=` that changes on every recompile so the browser cache
 * never saves it — against a minified app bundle. That parse cost is paid on the
 * visitor's CPU before anything paints, and it is the single largest thing
 * standing between this platform and an older device. `dev:erp` stays the
 * editing path, selected with `BOS_ERP_DEV=1 npm run dev`.
 *
 * A repo-hosted demo app (`demo-systems/<slug>`) is served from its **production
 * build** instead of `next dev`. It is a showcase, not something being edited:
 * in dev every page it compiles on first request costs seconds on this machine,
 * and that first click is exactly the one a visitor makes. `dev:<slug>` stays
 * the on-demand editing path. `scripts/demo-runtime.ts` holds the rule and the
 * freshness check - stale production output is worse than a slow page, so a
 * build is started whenever the folder is out of date.
 *
 * Why a script and not npm alone: `next build --webpack` on this app needs the
 * heap floor `scripts/build.ts` sets, and the two demo builds have to run one
 * after the other rather than together. `npm run` puts `node_modules/.bin` on
 * PATH, which a bare spawn does not, so a local `next` would not resolve.
 *
 * A target is non-critical unless it is the ERP: an app that fails to start
 * logs and is left out rather than taking the platform down with it. A demo app
 * that cannot build falls back to its dev server instead of being started on
 * no output at all.
 *
 * Verifiable goal: `npm run dev` serves `/demo/grocery` in ~0.2 s with no
 * compile stall, and one app failing cannot stop the ERP.
 */

const ROOT = process.cwd();
const ERP_PORT = 3300;
const IS_WINDOWS = process.platform === "win32";

// Tolerate a BOM: PowerShell 5.1 `Set-Content -Encoding UTF8` writes one (see
// the .env.local gotcha in PROJECT_MAP.md) and JSON.parse rejects it.
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8").replace(/^\uFEFF/, "")) as {
  scripts: Record<string, string>;
};

interface Target {
  name: string;
  command: string;
  critical: boolean;
}

/** Windows `npm` runs spawn a cmd.exe wrapper, so a bare kill() orphans the tree. */
function killTree(child: ChildProcess): void {
  if (child.pid === undefined || child.exitCode !== null) return;
  if (IS_WINDOWS) {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

// `npm run` puts node_modules/.bin on PATH; a bare spawn does not, so local
// binaries (`next`) would not resolve.
const binDir = join(ROOT, "node_modules", ".bin");
const childEnv = {
  ...process.env,
  PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}`,
};

/**
 * Build one demo app, blocking on purpose: nothing is being served yet, and the
 * builds must not run together (each wants the machine to itself).
 */
function buildDemoApp(dir: string): boolean {
  console.log(`[dev] ${dir}: production output is out of date - building first`);
  const started = Date.now();
  // One quoted command string: `shell: true` joins an argv array with spaces
  // without escaping it, so a workspace path containing a space would break.
  const result = spawnSync(`npm --prefix "${dir}" run build`, {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: childEnv,
  });
  const ok = result.status === 0;
  const seconds = Math.round((Date.now() - started) / 1000);
  console.log(`[dev] ${dir}: build ${ok ? "succeeded" : "failed"} in ${seconds}s`);
  return ok;
}

/**
 * Build the platform itself.
 *
 * Goes through `npm run build` rather than a bare `next build`: this app
 * exhausts the default heap part-way through compilation and dies, and
 * `scripts/build.ts` is what raises the floor. A bare spawn here would OOM.
 */
function buildPlatform(): boolean {
  console.log(`[dev] platform: production output is out of date - building first`);
  const started = Date.now();
  const result = spawnSync("npm run build", {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: childEnv,
  });
  const ok = result.status === 0;
  const seconds = Math.round((Date.now() - started) / 1000);
  console.log(`[dev] platform: build ${ok ? "succeeded" : "failed"} in ${seconds}s`);
  return ok;
}

/** True when the folder now holds production output `next start` can serve. */
function isBuilt(appDir: string): boolean {
  return existsSync(join(appDir, ".next", "BUILD_ID"));
}

/**
 * The platform, from its production build when there is one.
 *
 * Rebuilds only when the output is out of date, and falls back to `next dev`
 * rather than serving nothing at all — the same rule the demo apps follow. The
 * fallback matters more here than there: the ERP is `critical`, so a build that
 * produced no output would otherwise take the whole launcher down with it.
 */
function resolveErpTarget(): Target {
  const { script, mode } = resolvePlatformServeMode(pkg.scripts, process.env);
  // The bare fallback covers a package.json that has lost the script, so the
  // platform still starts rather than the launcher failing on a missing command.
  const devCommand = pkg.scripts[PLATFORM_DEV_SCRIPT] ?? `npx next dev --webpack -p ${ERP_PORT}`;

  if (mode === "dev") {
    if (process.env[PLATFORM_DEV_ENV]) {
      console.log(`[dev] platform: ${PLATFORM_DEV_ENV} set - serving from ${PLATFORM_DEV_SCRIPT}`);
    }
    return { name: "erp", command: devCommand, critical: true };
  }

  ensureProductionBuild(ROOT, buildPlatform);
  if (!isBuilt(ROOT)) {
    console.warn(`[dev] platform: no production output - falling back to its dev server`);
    return { name: "erp", command: devCommand, critical: true };
  }
  return { name: "erp", command: pkg.scripts[script] ?? devCommand, critical: true };
}

const targets: Target[] = [resolveErpTarget()];

// package.json stays the single source of truth for each sub-app's command; we
// only gate on whether its source tree is here, and on whether it is one of the
// demo apps that are served from a build.
const PREFIX_RE = /--prefix\s+(?:"([^"]+)"|(.+?)\s+run\b)/g;

for (const [script, command] of Object.entries(pkg.scripts)) {
  if (!script.startsWith("dev:") || script === PLATFORM_DEV_SCRIPT) continue;
  const name = script.slice("dev:".length);
  const serve = resolveDemoServeMode(pkg.scripts, name);
  const wantsProduction = serve?.mode === "production";
  const chosen = wantsProduction ? pkg.scripts[serve.script] : command;

  // A script may fan out to several folders (dev:sama runs backend + frontend).
  const dirs = [...chosen.matchAll(PREFIX_RE)].map((m) => (m[1] ?? m[2]).trim());
  if (dirs.length === 0) {
    console.log(`[dev] skip ${script}: no --prefix "<dir>" in its command`);
    continue;
  }
  const missing = dirs.filter((dir) => !existsSync(join(ROOT, dir, "package.json")));
  if (missing.length > 0) {
    console.log(`[dev] skip ${script}: ${missing.join(", ")} not present in this workspace`);
    continue;
  }

  const app = hostedDemoApps().find((candidate) => candidate.slug === name);
  if (wantsProduction && app) {
    const appDir = join(ROOT, app.dir);
    ensureProductionBuild(appDir, buildDemoApp);
    if (!isBuilt(appDir)) {
      console.warn(`[dev] ${app.dir}: no production output - falling back to its dev server`);
      targets.push({ name, command, critical: false });
      continue;
    }
  }

  targets.push({ name, command: chosen, critical: false });
}

console.log(`[dev] starting ${targets.length} app(s): ${targets.map((t) => t.name).join(", ")}`);

const children = targets.map((target) => {
  console.log(`[dev] ${target.name} -> ${target.command}`);
  return spawn(target.command, { cwd: ROOT, env: childEnv, stdio: "inherit", shell: true });
});

let shuttingDown = false;
function shutdown(code: number): void {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) killTree(child);
  process.exit(code);
}

children.forEach((child, i) => {
  child.on("exit", (code) => {
    if (shuttingDown) return;
    const { name, critical } = targets[i];
    if (critical) {
      console.error(`[dev] ${name} exited with code ${code ?? 0} - stopping every app`);
      shutdown(code ?? 1);
    } else {
      console.warn(`[dev] ${name} exited with code ${code ?? 0} - continuing without it`);
    }
  });
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

/**
 * One request per hosted app, through the platform, as soon as it answers.
 *
 * Serving from a build removes the compile stall that made the first click slow,
 * but the first request still pays for the ERP's own dev-mode compile of the
 * rewrite and for the sub-app's process start. Doing that here means the visitor
 * never does. Any response below 500 counts - a redirect to login is warm too.
 */
async function waitForWarm(url: string, budgetMs: number): Promise<number | null> {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
      if (res.status < 500) return Date.now();
    } catch {
      // Not up yet, or the ERP is still compiling.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  return null;
}

void (async () => {
  for (const url of demoPrewarmUrls(`http://localhost:${ERP_PORT}`)) {
    const started = Date.now();
    const readyAt = await waitForWarm(url, 180_000);
    console.log(
      readyAt === null
        ? `[dev] ${url}: did not answer within 180s`
        : `[dev] ${url}: warm in ${readyAt - started} ms`,
    );
  }
})();
