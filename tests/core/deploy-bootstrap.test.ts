import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stateFilePath } from "./helpers/deploy-state";

/**
 * The deploy start-up path.
 *
 * Two properties matter and are easy to lose:
 *
 *   - **It always returns.** A start-up hook that throws takes the whole platform
 *     down with it, so the contract is that *nothing* — no registry file, no
 *     GitHub, no network — can make `bootstrapDeploy` reject.
 *   - **It reconciles before it decides.** The registry must be brought in line
 *     with disk first, so the sweep never sees a system that no longer exists and
 *     never misses one that was added while the platform was down.
 *
 * `reconcileAgainstGithub` is mocked: this suite is about the bootstrap's own
 * control flow, not the sweep (which has its own tests in the orchestrator
 * suite).
 */

vi.mock("@/core/deploy/orchestrator", () => ({
  reconcileAgainstGithub: vi.fn(async () => []),
}));

const { bootstrapDeploy, __resetBootstrap } = await import("@/core/deploy/bootstrap");
const { reconcileAgainstGithub } = await import("@/core/deploy/orchestrator");
const { loadRegistry, resetRegistryCache, getSystemRecord } = await import("@/core/deploy/store");

/** The per-run registry file the store reads. */
const STATE = stateFilePath();

/** A tree with one demo system and one real system, so reconcile has work. */
const sandbox = mkdtempSync(join(tmpdir(), "deploy-bootstrap-"));
const demoSysRoot = join(sandbox, "demo-systems");
const masterSysRoot = join(sandbox, "system");

function seedSystem(root: string, slug: string): void {
  mkdirSync(join(root, slug), { recursive: true });
  writeFileSync(join(root, slug, "package.json"), JSON.stringify({ name: slug }));
}

seedSystem(demoSysRoot, "grocery");
seedSystem(masterSysRoot, "dental");

afterAll(() => rmSync(sandbox, { recursive: true, force: true }));

beforeEach(() => {
  resetRegistryCache();
  __resetBootstrap();
  vi.mocked(reconcileAgainstGithub).mockClear();
  vi.mocked(reconcileAgainstGithub).mockResolvedValue([]);
  // Point discovery at the sandbox tree rather than the real repo.
  process.env.SYSTEM_SOURCE_PATH = masterSysRoot;
  delete process.env.GITHUB_REPO;
  delete process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_APP_ID;
  delete process.env.GITHUB_APP_INSTALLATION_ID;
  delete process.env.GITHUB_APP_PRIVATE_KEY;
});

afterEach(() => {
  delete process.env.SYSTEM_SOURCE_PATH;
});

describe("bootstrapDeploy", () => {
  it("registers every system it finds on disk", async () => {
    // The demo tree is discovered from `process.cwd()`; isolate that by pointing
    // the repo root argument at a tree we control instead.
    const result = await bootstrapDeploy(sandbox);

    expect(result.reconciled).toBeGreaterThanOrEqual(2);
    resetRegistryCache();
    expect(getSystemRecord("demo:grocery", STATE)).not.toBeNull();
    expect(getSystemRecord("real:dental", STATE)).not.toBeNull();
  });

  it("skips the GitHub sweep when GitHub is not configured", async () => {
    const result = await bootstrapDeploy(sandbox);

    expect(result.skipped).toBe("github-not-configured");
    expect(reconcileAgainstGithub).not.toHaveBeenCalled();
  });

  it("runs the sweep once GitHub IS configured", async () => {
    process.env.GITHUB_REPO = "gmsnow/businessos";
    process.env.GITHUB_TOKEN = "test-token";

    const result = await bootstrapDeploy(sandbox);

    expect(result.skipped).toBeNull();
    expect(reconcileAgainstGithub).toHaveBeenCalledTimes(1);
  });

  it("reports which systems the sweep queued, for the log", async () => {
    process.env.GITHUB_REPO = "gmsnow/businessos";
    process.env.GITHUB_TOKEN = "test-token";
    vi.mocked(reconcileAgainstGithub).mockResolvedValueOnce(["real:dental"]);

    const result = await bootstrapDeploy(sandbox);

    expect(result.swept).toEqual(["real:dental"]);
  });

  it("does not throw when the sweep throws — the platform must still boot", async () => {
    process.env.GITHUB_REPO = "gmsnow/businessos";
    process.env.GITHUB_TOKEN = "test-token";
    vi.mocked(reconcileAgainstGithub).mockRejectedValueOnce(new Error("github down"));

    await expect(bootstrapDeploy(sandbox)).resolves.toMatchObject({ swept: [] });
  });

  it("is idempotent: a second call in the same process does nothing", async () => {
    process.env.GITHUB_REPO = "gmsnow/businessos";
    process.env.GITHUB_TOKEN = "test-token";

    await bootstrapDeploy(sandbox);
    const second = await bootstrapDeploy(sandbox);

    expect(second.skipped).toBe("already-started");
    // The sweep ran exactly once, not twice.
    expect(reconcileAgainstGithub).toHaveBeenCalledTimes(1);
  });

  it("leaves the registry readable afterwards", async () => {
    await bootstrapDeploy(sandbox);

    const registry = loadRegistry(STATE);
    expect(registry.version).toBeGreaterThan(0);
    expect(Object.keys(registry.systems).length).toBeGreaterThanOrEqual(2);
  });
});
