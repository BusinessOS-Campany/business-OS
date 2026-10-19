import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { logger } from "@/core/logging/logger";
import { discoverRepoSystems } from "./discovery";
import {
  deriveStatus,
  systemId,
  type DeployedSystem,
  type DeployedSystemRecord,
} from "./manifest-schema";

/**
 * The deploy registry's persistent half.
 *
 * A single JSON file under `.data/deploy/registry.json`, keyed by system id
 * (`demo:clinicos`, `real:grocery`, …). It records the one fact discovery
 * cannot derive from the filesystem: **which commit is actually built and
 * serving**. Everything else — paths, watch globs, branch — is recomputed from
 * disk on every load, so the file is a small cache and not a second source of
 * truth that can drift.
 *
 * Why a file and not a database table: this state must be readable by the build
 * worker before the platform's Prisma client exists, and it must survive a
 * platform restart so a deploy that finished while the platform was down is not
 * re-run. A JSON file with an atomic rename gives both, and matches how the org
 * vault already persists its own small records.
 *
 * Writes are serialised through a promise chain, the same bargain the vault
 * registry makes: two deploys finishing at once must not read-modify-write over
 * each other and lose one system's commit.
 */

/** One file for the whole registry. Kept out of git via `.data/`. */
export function registryPath(repoRoot: string = process.cwd()): string {
  const configured = process.env.DEPLOY_STATE_PATH?.trim();
  return configured ? configured : join(repoRoot, ".data", "deploy", "registry.json");
}

export interface DeployRegistry {
  version: number;
  /** system id -> record. */
  systems: Record<string, DeployedSystemRecord>;
  /** ISO timestamp of the last successful reconciliation with GitHub. */
  lastCheckedAt: string | null;
  /** The `owner/repo` this deployment trusts, once known. */
  repoKey: string | null;
}

/** Version 1 is the first shape; there is nothing to migrate from yet. */
export const REGISTRY_VERSION = 1;

export function emptyRegistry(): DeployRegistry {
  return { version: REGISTRY_VERSION, systems: {}, lastCheckedAt: null, repoKey: null };
}

let cache: DeployRegistry | null = null;
let loadedFrom: string | null = null;
let writeChain: Promise<unknown> = Promise.resolve();

function persist(file: string, registry: DeployRegistry): void {
  mkdirSync(dirname(file), { recursive: true });
  // Atomic: a crash mid-write must not truncate the record of what is deployed.
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(registry, null, 2)}\n`, "utf-8");
  renameSync(tmp, file);
}

/** Reads the registry, or an empty one when the file is missing or corrupt. */
export function loadRegistry(file: string = registryPath()): DeployRegistry {
  if (cache && loadedFrom === file) return cache;
  try {
    if (!existsSync(file)) {
      cache = emptyRegistry();
      loadedFrom = file;
      return cache;
    }
    const raw = JSON.parse(readFileSync(file, "utf-8")) as DeployRegistry;
    if (!raw || typeof raw !== "object" || typeof raw.systems !== "object") {
      throw new Error("registry is not an object with systems");
    }
    cache = {
      version: raw.version ?? REGISTRY_VERSION,
      systems: raw.systems ?? {},
      lastCheckedAt: raw.lastCheckedAt ?? null,
      repoKey: raw.repoKey ?? null,
    };
  } catch (err) {
    // A corrupt registry must not stop the deployer: an empty one simply means
    // "nothing is recorded as deployed yet", which the next check repairs.
    logger.warn({ err, file }, "[deploy] registry unreadable, starting empty");
    cache = emptyRegistry();
  }
  loadedFrom = file;
  return cache;
}

/** Forces the next read to hit disk. Used by tests and after external edits. */
export function resetRegistryCache(): void {
  cache = null;
  loadedFrom = null;
}

/**
 * Runs `mutate` against the registry and writes the result back, serialised.
 *
 * The callback gets the live object and may mutate it in place; the returned
 * value passes through to the caller.
 */
export function withRegistry<T>(
  mutate: (registry: DeployRegistry) => T | Promise<T>,
  file: string = registryPath(),
): Promise<T> {
  const run = writeChain.then(async () => {
    const registry = loadRegistry(file);
    const result = await mutate(registry);
    persist(file, registry);
    return result;
  });
  // Keep the chain alive on rejection, or one failed write poisons every later
  // write for the life of the process.
  writeChain = run.catch(() => undefined);
  return run;
}

/** A record for a freshly discovered system, with nothing deployed yet. */
function freshRecord(system: DeployedSystem): DeployedSystemRecord {
  return {
    ...system,
    deployedCommit: null,
    remoteCommit: null,
    deployedAt: null,
    checkedAt: null,
    status: "unknown",
    lastError: null,
    lastDurationSeconds: null,
  };
}

/** The stored record for one system, or null. */
export function getSystemRecord(id: string, file: string = registryPath()): DeployedSystemRecord | null {
  return loadRegistry(file).systems[id] ?? null;
}

/**
 * Discovers every system on disk and merges it with what the registry knows.
 *
 * The filesystem is authoritative for identity and paths; the registry is
 * authoritative only for deploy state (commits, status, timing). A system that
 * has moved folders is therefore corrected on the next load, and a system that
 * has disappeared from disk keeps its row — flagged, not deleted, so an
 * accidental folder rename does not silently erase the record of a deploy.
 *
 * Idempotent: calling it repeatedly never duplicates a system, because the map
 * is keyed by id and merging overwrites rather than appends.
 */
export function reconcile(
  systems: readonly DeployedSystem[],
  file: string = registryPath(),
): Promise<DeployRegistry> {
  return withRegistry((registry) => {
    for (const system of systems) {
      const existing = registry.systems[system.id];
      registry.systems[system.id] = existing
        ? {
            // Disk wins for the derived fields; the record keeps its deploy state.
            ...existing,
            ...system,
            status: deriveStatus(existing),
          }
        : freshRecord(system);
    }
    return registry;
  }, file);
}

/** Reconciles against the live repo. The normal entry point. */
export async function reconcileRepo(repoRoot: string = process.cwd()): Promise<DeployRegistry> {
  return reconcile(discoverRepoSystems(repoRoot));
}

/** Every stored record, sorted so the UI and logs read the same way each run. */
export function listSystemRecords(file: string = registryPath()): DeployedSystemRecord[] {
  return Object.values(loadRegistry(file).systems).sort((a, b) => a.id.localeCompare(b.id));
}

/** Records for one kind, for the demo/real split in the admin UI. */
export function listByKind(kind: "demo" | "real", file: string = registryPath()): DeployedSystemRecord[] {
  return listSystemRecords(file).filter((r) => r.kind === kind);
}

/**
 * Applies a patch to one system's record, creating nothing.
 *
 * Returns false when the system is not in the registry, so a webhook for an
 * unknown folder cannot conjure a system into existence.
 */
export function patchRecord(
  id: string,
  patch: Partial<DeployedSystemRecord>,
  file: string = registryPath(),
): Promise<boolean> {
  return withRegistry((registry) => {
    const existing = registry.systems[id];
    if (!existing) return false;
    registry.systems[id] = { ...existing, ...patch, id: existing.id };
    return true;
  }, file);
}

/** Records the repo this deployment trusts, so a foreign webhook is rejected. */
export function setRepoKey(key: string, file: string = registryPath()): Promise<void> {
  return withRegistry((registry) => {
    registry.repoKey = key;
  }, file);
}

/** Stamps a completed reconciliation. */
export function touchCheckedAt(at: string, file: string = registryPath()): Promise<void> {
  return withRegistry((registry) => {
    registry.lastCheckedAt = at;
  }, file);
}

export { systemId };
