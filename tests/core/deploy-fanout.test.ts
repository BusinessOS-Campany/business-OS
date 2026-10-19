import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { stateFilePath } from "./helpers/deploy-state";

/**
 * Customer-clone propagation.
 *
 * When `system/<slug>` is updated, every org that has it installed must be
 * re-synced and rebuilt immediately. What has to hold:
 *
 *   - the order is resync -> stop -> start, because booting before stopping hands
 *     back the healthy old runtime and the update silently never lands;
 *   - one org failing does not stop the others — a single customer's broken build
 *     must not deny every other customer the fix;
 *   - a demo system never reaches a customer clone;
 *   - no org with no install is touched.
 *
 * The deps are injected, so this suite runs the real control flow without
 * spawning `next build` or touching a database.
 */

const STATE = stateFilePath();

const { propagateToOrgClones, propagateIfReal } = await import("@/core/deploy/fanout");
const { reconcile, resetRegistryCache, getSystemRecord } = await import("@/core/deploy/store");
const { discoverSystems } = await import("@/core/deploy/discovery");

/** A tree with one demo and one real system of the same slug. */
const sandbox = mkdtempSync(join(tmpdir(), "deploy-fanout-"));
for (const [tree, slug] of [
  ["demo-systems", "dental"],
  ["system", "dental"],
] as const) {
  mkdirSync(join(sandbox, tree, slug), { recursive: true });
  writeFileSync(join(sandbox, tree, slug, "package.json"), JSON.stringify({ name: slug }));
}

afterAll(() => rmSync(sandbox, { recursive: true, force: true }));

beforeEach(async () => {
  resetRegistryCache();
  await reconcile(
    discoverSystems({
      repoRoot: sandbox,
      demoSysRoot: join(sandbox, "demo-systems"),
      masterSysRoot: join(sandbox, "system"),
    }),
    STATE,
  );
});

/** Records the call order across the three effectful deps. */
function recordingDeps(overrides: {
  failResyncFor?: string;
  failStartFor?: string;
} = {}) {
  const calls: string[] = [];
  const deps = {
    resync: vi.fn((orgSlug: string, systemSlug: string) => {
      calls.push(`resync:${orgSlug}`);
      if (orgSlug === overrides.failResyncFor) {
        return { cloned: false, reason: "copy refused", path: "" };
      }
      return { cloned: true, path: `/vault/${orgSlug}/systems/${systemSlug}` };
    }),
    stop: vi.fn((orgSlug: string) => {
      calls.push(`stop:${orgSlug}`);
      return true;
    }),
    start: vi.fn(async (org: { slug: string }) => {
      calls.push(`start:${org.slug}`);
      if (org.slug === overrides.failStartFor) throw new Error("build failed");
      return { port: 4100 };
    }),
    record: vi.fn(() => {
      /* outcomes are asserted via the return value */
    }),
  };
  return { deps, calls };
}

describe("propagateToOrgClones", () => {
  it("re-syncs, stops and reboots each org in that order", async () => {
    const { deps, calls } = recordingDeps();
    const result = await propagateToOrgClones("dental", {
      enumerate: async () => [
        { id: "o1", slug: "gmsnow" },
        { id: "o2", slug: "ajwad" },
      ],
      deps,
    });

    expect(result.updated).toBe(2);
    expect(result.failed).toBe(0);
    // Order matters: stop must come before start, or the old runtime is reused.
    expect(calls).toEqual([
      "resync:ajwad",
      "stop:ajwad",
      "start:ajwad",
      "resync:gmsnow",
      "stop:gmsnow",
      "start:gmsnow",
    ]);
  });

  it("isolates a failing org and still updates the rest", async () => {
    const { deps } = recordingDeps({ failStartFor: "ajwad" });
    const result = await propagateToOrgClones("dental", {
      enumerate: async () => [
        { id: "o1", slug: "gmsnow" },
        { id: "o2", slug: "ajwad" },
      ],
      deps,
    });

    expect(result.updated).toBe(1);
    expect(result.failed).toBe(1);
    const failed = result.outcomes.find((o) => !o.ok)!;
    expect(failed.orgSlug).toBe("ajwad");
    expect(failed.step).toBe("start");
    // The healthy org was still updated.
    expect(result.outcomes.find((o) => o.orgSlug === "gmsnow")?.ok).toBe(true);
  });

  it("reports a resync failure without trying to boot", async () => {
    const { deps, calls } = recordingDeps({ failResyncFor: "ajwad" });
    const result = await propagateToOrgClones("dental", {
      enumerate: async () => [{ id: "o2", slug: "ajwad" }],
      deps,
    });

    expect(result.failed).toBe(1);
    expect(result.outcomes[0].step).toBe("resync");
    // No stop and no boot: there is nothing to restart from a failed copy.
    expect(calls).toEqual(["resync:ajwad"]);
    expect(deps.stop).not.toHaveBeenCalled();
    expect(deps.start).not.toHaveBeenCalled();
  });

  it("does nothing when no org has the system installed", async () => {
    const { deps } = recordingDeps();
    const result = await propagateToOrgClones("dental", {
      enumerate: async () => [],
      deps,
    });

    expect(result.plan.total).toBe(0);
    expect(result.plan.reason).toBe("no-installed-orgs");
    expect(deps.resync).not.toHaveBeenCalled();
  });

  it("records an outcome for every org it attempted", async () => {
    const { deps } = recordingDeps({ failStartFor: "ajwad" });
    await propagateToOrgClones("dental", {
      enumerate: async () => [
        { id: "o1", slug: "gmsnow" },
        { id: "o2", slug: "ajwad" },
      ],
      deps,
    });

    expect(deps.record).toHaveBeenCalledTimes(2);
  });

  it("tolerates an enumerator that throws, without failing the deploy", async () => {
    const { deps } = recordingDeps();
    const result = await propagateToOrgClones("dental", {
      enumerate: async () => {
        throw new Error("db down");
      },
      deps,
    });

    expect(result.outcomes).toEqual([]);
    expect(result.plan.reason).toBe("enumerate-failed");
    expect(deps.resync).not.toHaveBeenCalled();
  });
});

describe("propagateIfReal", () => {
  it("propagates a real system to its customer clones", async () => {
    const { deps } = recordingDeps();
    const result = await propagateIfReal("real:dental", {
      enumerate: async () => [{ id: "o1", slug: "gmsnow" }],
      deps,
    });

    expect(result).not.toBeNull();
    expect(result!.updated).toBe(1);
  });

  it("never touches a customer clone for a demo system", async () => {
    const { deps } = recordingDeps();
    const result = await propagateIfReal("demo:dental", {
      enumerate: async () => [{ id: "o1", slug: "gmsnow" }],
      deps,
    });

    // The demo path must be inert at the fan-out: this is the separation the
    // whole feature rests on.
    expect(result).toBeNull();
    expect(deps.resync).not.toHaveBeenCalled();
    expect(deps.start).not.toHaveBeenCalled();
  });

  it("returns null for a system id that is not in the registry", async () => {
    const { deps } = recordingDeps();
    const result = await propagateIfReal("real:does-not-exist", { deps });
    expect(result).toBeNull();
  });

  it("surfaces a partial failure on the master row, for the console", async () => {
    const { deps } = recordingDeps({ failStartFor: "ajwad" });
    await propagateIfReal("real:dental", {
      enumerate: async () => [
        { id: "o1", slug: "gmsnow" },
        { id: "o2", slug: "ajwad" },
      ],
      deps,
    });

    // The console shows the master as deployed, but flags that not every
    // customer got it — otherwise a silent half-rollout looks like success.
    expect(getSystemRecord("real:dental", STATE)?.lastError).toContain("1/2");
  });

  it("clears a previous partial-failure note once everyone is updated", async () => {
    const failing = recordingDeps({ failStartFor: "ajwad" });
    await propagateIfReal("real:dental", {
      enumerate: async () => [
        { id: "o1", slug: "gmsnow" },
        { id: "o2", slug: "ajwad" },
      ],
      deps: failing.deps,
    });

    const healthy = recordingDeps();
    await propagateIfReal("real:dental", {
      enumerate: async () => [{ id: "o1", slug: "gmsnow" }],
      deps: healthy.deps,
    });

    expect(getSystemRecord("real:dental", STATE)?.lastError).toBeNull();
  });
});
