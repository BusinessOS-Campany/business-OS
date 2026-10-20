import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { logger } from "@/core/logging/logger";
import { ensureClone, fetchAndFastForward } from "./git-source";
import { patchRecord } from "./store";
import type { DeployedSystemRecord } from "./manifest-schema";

/**
 * The executor: pull the pushed commit, build it, and record how long it took.
 *
 * It performs the four steps the three-minute budget is spent on, in the order
 * that keeps a failure from ever damaging a working deployment:
 *
 *   1. **Pull** (git fetch + fast-forward). Nothing is built until the exact
 *      source commit is on disk. A tree with unpushed edits refuses here.
 *   2. **Build** (`npm run build`, with `prisma generate` first for a system
 *      that has a schema). The exit code is the gate: a non-zero build changes
 *      nothing on disk that matters, because Next.js writes `.next` only after a
 *      successful compile.
 *   3. **Record** the commit, the duration, and the status into the registry, so
 *      a platform restart remembers what is deployed.
 *   4. **Restart** the system's process, when a supervisor hook is supplied.
 *
 * What this module deliberately does NOT do: touch the database. A build can
 * depend on the schema being current, but running migrations is a separate,
 * riskier act owned by the org runtime (`needsDatabaseSetup` in the supervisor).
 * Encoding "run migrations" here would make a code deploy able to change a
 * customer's data, which is the one thing the task rules out.
 */

/** A build failed. The caller records it; the previous deployment stays live. */
export class DeployFailed extends Error {
  constructor(
    message: string,
    /** Which step failed: pull | build | verify. */
    readonly step: "pull" | "build" | "verify",
    /** Safe to surface: never contains a credential. */
    readonly detail: string,
  ) {
    super(message);
    this.name = "DeployFailed";
  }
}

export interface DeployTimings {
  /** ms from "run started" to the pull being complete. */
  pullMs: number;
  /** ms the build took. */
  buildMs: number;
  /** ms spent verifying the result. */
  verifyMs: number;
  /** ms total, measured across the whole run. */
  totalMs: number;
}

export interface DeployOutcome {
  systemId: string;
  commit: string;
  ok: boolean;
  timings: DeployTimings;
  /** True when the branch was already checked out, so no build ran. */
  skipped: boolean;
}

export interface ExecutorHooks {
  /** Restarts the system's process after a successful build. */
  restart?: (record: DeployedSystemRecord) => Promise<void>;
  /** Confirms the restarted system answers. Rejections fail the deploy. */
  verify?: (record: DeployedSystemRecord) => Promise<void>;
  /** Clock, for deterministic tests. */
  now?: () => number;
}

/** The max time one build may take before it is killed and reported. */
const BUILD_TIMEOUT_MS = 12 * 60_000;

/** True when the system ships a Prisma schema, so its client must be generated. */
function hasPrisma(dir: string): boolean {
  return existsSync(join(dir, "prisma", "schema.prisma"));
}

/** The `scripts` block of a system's package.json, or `{}`. */
function scriptsOf(dir: string): Record<string, string> {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    return pkg.scripts ?? {};
  } catch {
    return {};
  }
}

/**
 * Runs one command in the system's folder, streaming to the platform log.
 *
 * `shell: true` on Windows because npm is a `.cmd` shim there and a spawn
 * without a shell cannot execute it. The command and args here are literals from
 * this module, never user input, so the shell is not an injection surface.
 */
function run(command: string, args: string[], cwd: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
      env: { ...process.env, NODE_ENV: "production", CI: "1" },
    });

    let buffered = "";
    const relay = (stream: NodeJS.ReadableStream | null, level: "info" | "error") => {
      if (!stream) return;
      stream.setEncoding?.("utf8");
      stream.on("data", (chunk: string) => {
        buffered += chunk;
        const lines = buffered.split(/\r?\n/);
        buffered = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) logger[level]({ cwd, line: line.slice(0, 2000) }, "[deploy]");
        }
      });
    };
    relay(child.stdout, "info");
    relay(child.stderr, "error");

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`${command} ${args.join(" ")} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

/**
 * Builds a system from source that is already checked out.
 *
 * Split from the pull so the "did this commit change anything" question and the
 * "compile it" cost are separate decisions — the first is nearly free and can
 * save the second entirely.
 */
export async function buildSystem(dir: string, systemId: string): Promise<void> {
  const scripts = scriptsOf(dir);
  if (!scripts.build) {
    logger.info({ systemId }, "[deploy] no build script; serving from source");
    return;
  }
  // Prisma generates its client into the system's own source tree, and the build
  // imports the result, so it must run first for a system that has a schema.
  if (hasPrisma(dir)) {
    await run("npx", ["prisma", "generate"], dir, BUILD_TIMEOUT_MS);
  }
  await run("npm", ["run", "build"], dir, BUILD_TIMEOUT_MS);
}

/**
 * The full run: pull, build, verify, record.
 *
 * `record` is read for its paths and branch; only the deploy-state fields are
 * written back, through `patchRecord`, so a concurrent discovery that corrected
 * a path is not overwritten by a stale copy.
 */
export async function deploySystem(
  record: DeployedSystemRecord,
  hooks: ExecutorHooks = {},
): Promise<DeployOutcome> {
  const now = hooks.now ?? (() => Date.now());
  const startedAt = now();
  const timings: DeployTimings = { pullMs: 0, buildMs: 0, verifyMs: 0, totalMs: 0 };

  const id = record.id;

  // Take the build slot.
  await patchRecord(id, {
    status: "building",
    lastError: null,
    checkedAt: new Date().toISOString(),
  });

  // 1. Make sure the checkout exists. A repo-per-system deploy pulls into a
  //    clone; on a fresh machine the clone does not exist yet, so it is created
  //    here before anything tries to fast-forward it. A system served from a
  //    plain folder (no mapped repo) skips this — there is nothing to clone.
  if (record.repo && record.clonePath && !existsSync(join(record.clonePath, ".git"))) {
    const clone = await ensureClone(record.clonePath, record.repo);
    if (!clone.ok) {
      timings.totalMs = now() - startedAt;
      await patchRecord(id, {
        status: "failed",
        lastError: clone.reason ?? "clone failed",
        lastDurationSeconds: Math.round(timings.totalMs / 1000),
      });
      throw new DeployFailed(`clone failed for ${id}`, "pull", clone.reason ?? "clone failed");
    }
  }

  // 2. Pull the exact commit. Never `reset --hard`; a dirty tree refuses.
  const pullStart = now();
  const pull = await fetchAndFastForward(record.localPath, record.remoteCommit ?? record.productionBranch);
  timings.pullMs = now() - pullStart;

  if (!pull.ok) {
    timings.totalMs = now() - startedAt;
    await patchRecord(id, {
      status: "failed",
      lastError: pull.reason ?? "pull failed",
      lastDurationSeconds: Math.round(timings.totalMs / 1000),
    });
    throw new DeployFailed(`pull failed for ${id}`, "pull", pull.reason ?? "pull failed");
  }

  // Nothing to do when the tree was already at the target commit.
  if (pull.alreadyAtTarget) {
    timings.totalMs = now() - startedAt;
    await patchRecord(id, {
      status: "live",
      deployedCommit: pull.commit,
      deployedAt: new Date().toISOString(),
      lastDurationSeconds: Math.round(timings.totalMs / 1000),
    });
    return { systemId: id, commit: pull.commit!, ok: true, timings, skipped: true };
  }

  // 2. Build.
  const buildStart = now();
  try {
    await buildSystem(record.localPath, id);
  } catch (err) {
    timings.buildMs = now() - buildStart;
    timings.totalMs = now() - startedAt;
    const detail = err instanceof Error ? err.message : String(err);
    await patchRecord(id, {
      status: "failed",
      lastError: detail.slice(0, 1000),
      lastDurationSeconds: Math.round(timings.totalMs / 1000),
    });
    // The previous commit stays recorded as deployed: a failed build never
    // replaces a working one.
    throw new DeployFailed(`build failed for ${id}`, "build", detail);
  }
  timings.buildMs = now() - buildStart;

  // 3. Restart and verify, when the caller provided the hooks.
  const verifyStart = now();
  try {
    if (hooks.restart) await hooks.restart(record);
    if (hooks.verify) await hooks.verify(record);
  } catch (err) {
    timings.verifyMs = now() - verifyStart;
    timings.totalMs = now() - startedAt;
    const detail = err instanceof Error ? err.message : String(err);
    await patchRecord(id, {
      status: "failed",
      lastError: detail.slice(0, 1000),
      lastDurationSeconds: Math.round(timings.totalMs / 1000),
    });
    throw new DeployFailed(`verify failed for ${id}`, "verify", detail);
  }
  timings.verifyMs = now() - verifyStart;

  // 4. Record success.
  timings.totalMs = now() - startedAt;
  await patchRecord(id, {
    status: "live",
    deployedCommit: pull.commit,
    deployedAt: new Date().toISOString(),
    lastError: null,
    lastDurationSeconds: Math.round(timings.totalMs / 1000),
  });

  logger.info(
    {
      systemId: id,
      commit: pull.commit?.slice(0, 7),
      pullMs: timings.pullMs,
      buildMs: timings.buildMs,
      verifyMs: timings.verifyMs,
      totalMs: timings.totalMs,
    },
    "[deploy] system deployed",
  );

  return { systemId: id, commit: pull.commit!, ok: true, timings, skipped: false };
}

/**
 * The over-budget diagnosis: which step ate the three minutes.
 *
 * The task asks for a *reason* when a deploy exceeds 180s, not just the total.
 * Reported as data the admin panel renders, rather than a guess in a log line.
 */
export function overBudgetReason(timings: DeployTimings, budgetMs = 180_000): string | null {
  if (timings.totalMs <= budgetMs) return null;
  const steps: Array<[string, number]> = [
    ["pull", timings.pullMs],
    ["build", timings.buildMs],
    ["verify", timings.verifyMs],
  ];
  const [worstName, worstMs] = steps.reduce((a, b) => (b[1] > a[1] ? b : a));
  const seconds = Math.round(timings.totalMs / 1000);
  return `تجاوز الهدف (${seconds}ث): أطول خطوة "${worstName}" (${Math.round(worstMs / 1000)}ث)`;
}
