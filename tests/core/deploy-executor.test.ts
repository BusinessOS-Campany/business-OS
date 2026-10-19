import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { stateFilePath } from "./helpers/deploy-state";

/**
 * DeployFailed isolation: the executor must reject with it, never a bare Error.
 * Asserted here (rather than inside each test) so a thrown non-DeployFailed
 * fails loudly with a clear message.
 */
import { DeployFailed, deploySystem, overBudgetReason } from "@/core/deploy/executor";
import { reconcile, resetRegistryCache } from "@/core/deploy/store";
import { discoverSystems } from "@/core/deploy/discovery";

/**
 * The executor, driven against a real repository and a real (tiny) build.
 *
 * The fake system's `build` script is a Node script the test writes, so "build"
 * is a genuine child process with a genuine exit code — the only way to prove
 * the exit-code gate, that a failed build preserves the previous deployment, and
 * that the recorded duration is real.
 */

const GIT = process.env.GIT_BINARY?.trim() || "git";

/** Points the registry and this module at a per-run state file. */
const STATE = stateFilePath();

const sandbox = mkdtempSync(join(tmpdir(), "deploy-executor-"));
const upstream = join(sandbox, "upstream.git");
const origin = join(sandbox, "origin");
const repoRoot = join(sandbox, "machine");

/** The one system this suite deploys. */
const systemDir = join(repoRoot, "demo-systems", "tiny");
const stateFile = STATE;

function git(args: string[], cwd: string): string {
  return execFileSync(GIT, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/** Writes the tiny system's source into a given repo root. */
function writeSystemInto(root: string, buildOk: boolean): void {
  const dir = join(root, "demo-systems", "tiny");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      name: "tiny",
      version: "1.0.0",
      scripts: { build: "node build.mjs" },
    }),
  );
  const script = buildOk
    ? 'import { writeFileSync } from "node:fs";\nwriteFileSync("built.txt", "ok");\nconsole.log("built");\n'
    : 'console.error("compile error");\nprocess.exit(1);\n';
  writeFileSync(join(dir, "build.mjs"), script);
}

beforeAll(() => {
  git(["init", "--bare", "-b", "main", upstream], sandbox);
  mkdirSync(origin, { recursive: true });
  git(["init", "-b", "main"], origin);
  git(["config", "user.email", "t@example.com"], origin);
  git(["config", "user.name", "T"], origin);
  // The repo carries the system at the path discovery expects.
  writeSystemInto(origin, true);
  writeFileSync(join(origin, "seed.txt"), "seed\n");
  git(["add", "."], origin);
  git(["commit", "-m", "first"], origin);
  git(["remote", "add", "origin", upstream], origin);
  git(["push", "-u", "origin", "main"], origin);

  git(["clone", upstream, repoRoot], sandbox);
  git(["config", "user.email", "t@example.com"], repoRoot);
  git(["config", "user.name", "T"], repoRoot);
});

afterAll(() => {
  if (process.env.KEEP_DEPLOY_SANDBOX) {
    console.log("[test] sandbox kept at", sandbox);
    return;
  }
  rmSync(sandbox, { recursive: true, force: true });
});

/** Pushes the tiny system in a state with a passing/failing build. */
function push(buildOk: boolean, message: string): string {
  writeSystemInto(origin, buildOk);
  writeFileSync(join(origin, "seed.txt"), `${message}\n`);
  git(["add", "."], origin);
  git(["commit", "-m", message], origin);
  git(["push", "origin", "main"], origin);
  return git(["rev-parse", "HEAD"], origin).trim();
}

/** Registers the one system with the state file this suite owns. */
async function register(remoteCommit: string) {
  resetRegistryCache();
  const systems = discoverSystems({
    repoRoot,
    demoSysRoot: join(repoRoot, "demo-systems"),
    masterSysRoot: join(repoRoot, "system"),
  });
  if (!systems.some((s) => s.id === "demo:tiny")) {
    throw new Error(`tiny was not discovered: ${systems.map((s) => s.id).join(", ") || "none"}`);
  }
  await reconcile(systems, stateFile);
  const { patchRecord, getSystemRecord } = await import("@/core/deploy/store");
  const applied = await patchRecord("demo:tiny", { remoteCommit }, stateFile);
  if (!applied) throw new Error("tiny is not in the registry after reconcile");
  const record = getSystemRecord("demo:tiny", stateFile);
  if (!record) throw new Error("tiny record vanished after patch");
  return record;
}

/**
 * Resets the "machine" checkout to a clean HEAD.
 *
 * A successful build writes `built.txt`, an untracked artifact, so without this
 * every test after the first would start with a dirty tree — and the deploy's
 * own (correct) refusal to move a dirty tree would make the later tests fail for
 * the wrong reason.
 */
function cleanMachineTree(): void {
  git(["reset", "--hard", "HEAD"], repoRoot);
  git(["clean", "-fd"], repoRoot);
}

beforeEach(() => {
  resetRegistryCache();
  cleanMachineTree();
});

describe("deploySystem", () => {
  it("pulls, builds, and records the deployed commit with real timings", async () => {
    const commit = push(true, "good build");
    const record = await register(commit);

    const verify = vi.fn().mockResolvedValue(undefined);
    const restart = vi.fn().mockResolvedValue(undefined);

    const outcome = await deploySystem(record, {
      restart,
      verify,
    });

    expect(outcome.ok).toBe(true);
    expect(outcome.commit).toBe(commit);
    expect(outcome.skipped).toBe(false);
    expect(restart).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledTimes(1);

    // The recorded state is durable and correct.
    const { getSystemRecord } = await import("@/core/deploy/store");
    resetRegistryCache();
    const stored = getSystemRecord("demo:tiny", stateFile)!;
    expect(stored.status).toBe("live");
    expect(stored.deployedCommit).toBe(commit);
    expect(stored.lastDurationSeconds).toBeGreaterThanOrEqual(0);
    expect(stored.lastError).toBeNull();
  });

  it("keeps the previous deployment when the build fails", async () => {
    // First, a good deploy so there is a "previous".
    const good = push(true, "good");
    const first = await register(good);
    await deploySystem(first);
    const { getSystemRecord } = await import("@/core/deploy/store");
    resetRegistryCache();
    const deployedGood = getSystemRecord("demo:tiny", stateFile)!.deployedCommit;
    expect(deployedGood).toBe(good);

    // Now a build that fails.
    const bad = push(false, "bad build");
    const second = await register(bad);

    await expect(deploySystem(second)).rejects.toBeInstanceOf(DeployFailed);

    resetRegistryCache();
    const after = getSystemRecord("demo:tiny", stateFile)!;
    expect(after.status).toBe("failed");
    // The record of what is actually serving is UNCHANGED.
    expect(after.deployedCommit).toBe(deployedGood);
    expect(after.lastError).toBeTruthy();
  });

  it("fails at the pull step when a local edit is unpushed", async () => {
    const commit = push(true, "another");
    const record = await register(commit);
    // Dirty the machine's tree.
    writeFileSync(join(systemDir, "build.mjs"), "// local edit\n");

    await expect(deploySystem(record)).rejects.toMatchObject({ step: "pull" });

    // The local edit survived — the webhook never discards an unpushed change.
    const { readFileSync } = await import("node:fs");
    expect(readFileSync(join(systemDir, "build.mjs"), "utf8")).toContain("local edit");
  });

  it("skips the build when already at the target commit", async () => {
    const { headCommit } = await import("@/core/deploy/git-source");
    const current = (await headCommit(systemDir))!;
    // Point the record at the commit the tree is already on.
    const record = await register(current);

    const outcome = await deploySystem(record);
    expect(outcome.ok).toBe(true);
    expect(outcome.skipped).toBe(true);
  });
});

describe("overBudgetReason", () => {
  it("is null inside the budget", () => {
    expect(overBudgetReason({ pullMs: 1000, buildMs: 2000, verifyMs: 500, totalMs: 3500 })).toBeNull();
  });

  it("names the slowest step when over budget", () => {
    const reason = overBudgetReason({
      pullMs: 5_000,
      buildMs: 200_000,
      verifyMs: 1_000,
      totalMs: 206_000,
    });
    expect(reason).toContain("build");
    expect(reason).toContain("تجاوز");
  });
});
