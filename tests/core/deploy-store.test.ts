import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  emptyRegistry,
  listByKind,
  loadRegistry,
  patchRecord,
  reconcile,
  resetRegistryCache,
  setRepoKey,
  withRegistry,
} from "@/core/deploy/store";
import { discoverSystems } from "@/core/deploy/discovery";
import { mkdirSync } from "node:fs";

/**
 * The registry file, tested without GitHub and without the live repo.
 *
 * The store exists to answer "which commit is deployed?" across a restart, so
 * the properties that matter are durability and non-destruction: a recorded
 * commit survives a reload, a second reconcile never duplicates a system, and a
 * system that vanished from disk keeps its row instead of being erased.
 */

const sandbox = mkdtempSync(join(tmpdir(), "deploy-store-"));
const stateFile = join(sandbox, "registry.json");
const demoSysRoot = join(sandbox, "demo-systems");
const masterSysRoot = join(sandbox, "system");

for (const root of [demoSysRoot, masterSysRoot]) {
  mkdirSync(join(root, "clinicos"), { recursive: true });
  writeFileSync(join(root, "clinicos", "package.json"), JSON.stringify({ name: "clinicos" }));
}

const systems = discoverSystems({ repoRoot: sandbox, demoSysRoot, masterSysRoot });

beforeEach(() => {
  resetRegistryCache();
  if (existsSync(stateFile)) rmSync(stateFile);
});

afterEach(() => {
  resetRegistryCache();
});

describe("registry durability", () => {
  it("starts empty when the file is missing", () => {
    const registry = loadRegistry(stateFile);
    expect(registry.systems).toEqual({});
    expect(registry.version).toBe(emptyRegistry().version);
  });

  it("writes atomically and reads back what it wrote", async () => {
    await setRepoKey("gmsnow/businessos", stateFile);
    resetRegistryCache();
    expect(loadRegistry(stateFile).repoKey).toBe("gmsnow/businessos");
    // No temp file left behind.
    expect(existsSync(`${stateFile}.${process.pid}.tmp`)).toBe(false);
  });

  it("survives a corrupt file by starting empty instead of throwing", () => {
    writeFileSync(stateFile, "{ this is not json", "utf-8");
    resetRegistryCache();
    const registry = loadRegistry(stateFile);
    expect(registry.systems).toEqual({});
  });
});

describe("reconcile", () => {
  it("creates one row per discovered system, keyed by id", async () => {
    await reconcile(systems, stateFile);
    resetRegistryCache();
    const registry = loadRegistry(stateFile);
    expect(Object.keys(registry.systems).sort()).toEqual(["demo:clinicos", "real:clinicos"]);
    expect(registry.systems["demo:clinicos"].status).toBe("unknown");
  });

  it("is idempotent — a second reconcile does not duplicate or reset", async () => {
    await reconcile(systems, stateFile);
    await patchRecord("demo:clinicos", { deployedCommit: "abc1234", status: "live" }, stateFile);
    await reconcile(systems, stateFile);
    resetRegistryCache();

    const registry = loadRegistry(stateFile);
    expect(Object.keys(registry.systems).length).toBe(2);
    // The deploy state must survive reconciliation.
    expect(registry.systems["demo:clinicos"].deployedCommit).toBe("abc1234");
    expect(registry.systems["demo:clinicos"].status).toBe("live");
  });

  it("keeps a system whose folder disappeared, rather than deleting its record", async () => {
    await reconcile(systems, stateFile);
    await patchRecord("real:clinicos", { deployedCommit: "deadbeef", status: "live" }, stateFile);
    // Reconcile with only the demo system present.
    await reconcile(systems.filter((s) => s.kind === "demo"), stateFile);
    resetRegistryCache();

    const registry = loadRegistry(stateFile);
    const realRecord = registry.systems["real:clinicos"];
    expect(realRecord).toBeDefined();
    expect(realRecord.deployedCommit).toBe("deadbeef");
  });

  it("follows a system that moved to a new folder", async () => {
    await reconcile(systems, stateFile);
    const moved = systems.map((s) =>
      s.id === "demo:clinicos" ? { ...s, repoPath: "demo-systems/clinicos-v2" } : s,
    );
    await reconcile(moved, stateFile);
    resetRegistryCache();
    expect(loadRegistry(stateFile).systems["demo:clinicos"].repoPath).toBe("demo-systems/clinicos-v2");
  });
});

describe("patchRecord", () => {
  it("never conjures a system that is not registered", async () => {
    await reconcile(systems, stateFile);
    const applied = await patchRecord("demo:ghost", { deployedCommit: "x" }, stateFile);
    expect(applied).toBe(false);
    resetRegistryCache();
    expect(loadRegistry(stateFile).systems["demo:ghost"]).toBeUndefined();
  });

  it("cannot change a record's id", async () => {
    await reconcile(systems, stateFile);
    await patchRecord("demo:clinicos", { id: "demo:other" } as never, stateFile);
    resetRegistryCache();
    expect(loadRegistry(stateFile).systems["demo:clinicos"]).toBeDefined();
    expect(loadRegistry(stateFile).systems["demo:other"]).toBeUndefined();
  });
});

describe("listByKind", () => {
  it("separates the demo and real trees for the admin UI", async () => {
    await reconcile(systems, stateFile);
    expect(listByKind("demo", stateFile).map((r) => r.id)).toEqual(["demo:clinicos"]);
    expect(listByKind("real", stateFile).map((r) => r.id)).toEqual(["real:clinicos"]);
  });
});

describe("serialised writes", () => {
  it("does not lose a concurrent write", async () => {
    await reconcile(systems, stateFile);
    // Fire many patches at once; serialisation is what keeps them all.
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        withRegistry((registry) => {
          const record = registry.systems["demo:clinicos"];
          record.lastDurationSeconds = (record.lastDurationSeconds ?? 0) + 1;
          void i;
        }, stateFile),
      ),
    );
    resetRegistryCache();
    expect(loadRegistry(stateFile).systems["demo:clinicos"].lastDurationSeconds).toBe(20);
    // And the file on disk is valid JSON.
    expect(() => JSON.parse(readFileSync(stateFile, "utf-8"))).not.toThrow();
  });
});
