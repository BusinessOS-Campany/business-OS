/**
 * The deploy registry: what a *deployed system* is, independent of storage.
 *
 * This module is deliberately pure — no `fs`, no database, no network — because
 * both the platform process and the build worker need the same answer to
 * "is this commit already deployed?" and neither should have to import the
 * other's dependencies to get it. The SQLite/JSON persistence lives in
 * `store.ts`, and the GitHub side lives in `github.ts`.
 *
 * A system is identified by THREE things, not one:
 *
 *   - `kind`      — `demo` (served under /demo/<slug> for prospects) or
 *                   `real` (cloned per organization under /app/<slug>).
 *   - `slug`      — e.g. `clinicos`. Unique *within a kind*, never across.
 *   - `repoPath`  — the app's folder inside the monorepo, e.g.
 *                   `demo-systems/clinicos`. Two systems may live in one repo
 *                   (this is a monorepo), so the folder is what distinguishes
 *                   them, and `watchPaths` is derived from it.
 *
 * Keeping `kind` in the key is what stops a demo update from ever being
 * applied to a real (customer) install of the same slug, which is the whole
 * point of the demo/real split.
 */

/** Which tree a deployed system belongs to. Never merged. */
export type SystemKind = "demo" | "real";

/**
 * One system as the deploy registry knows it.
 *
 * Everything here except `id` is derived from the filesystem plus the repo
 * checkout, so `discoverSystems()` can rebuild any entry from scratch and the
 * registry stays a cache rather than a source of truth.
 */
export interface DeployedSystem {
  /** Stable key: `<kind>:<slug>` — e.g. `demo:clinicos`, `real:grocery`. */
  id: string;
  kind: SystemKind;
  /** Catalog slug, matching the folder name under demo-systems/ or system/. */
  slug: string;
  /** Human label, in both languages, as the catalog already spells them. */
  nameAr: string;
  nameEn: string;
  /** Absolute path on this machine of the tree the app is built from. */
  localPath: string;
  /** Path of the app inside the monorepo, forward-slashed: `system/clinicos`. */
  repoPath: string;
  /**
   * Globs (relative to the repo root) whose change should trigger a rebuild of
   * this system. Defaults to `<repoPath>/**`; a shared package a system depends
   * on can be added here so editing it rebuilds every dependant.
   */
  watchPaths: string[];
  /** Branch that production builds from. One per system, never guessed. */
  productionBranch: string;
  /** Where in the repo the build runs, if it differs from repoPath (unused today). */
  buildDir: string | null;
}

/** A system plus everything the registry has learned about its deploys. */
export interface DeployedSystemRecord extends DeployedSystem {
  /** Commit SHA currently built and serving, or null before the first deploy. */
  deployedCommit: string | null;
  /** Commit SHA the branch's tip pointed to at the last check, or null. */
  remoteCommit: string | null;
  /** ISO timestamp of the last successful build+serve. */
  deployedAt: string | null;
  /** ISO timestamp of the most recent check against GitHub. */
  checkedAt: string | null;
  /** Where the current deploy stands. */
  status: DeployStatus;
  /** The last error, or null. Cleared on a successful deploy. */
  lastError: string | null;
  /** Seconds the last deploy took end to end, or null. */
  lastDurationSeconds: number | null;
}

/**
 * Deploy lifecycle. Ordered by the path a normal deploy walks.
 *
 * `queued` and `building` are transient; `live` means the built commit is the
 * one being served; `failed` keeps the PREVIOUS commit live (a failed build
 * never replaces a good one); `stale` means the branch moved on and a deploy is
 * owed but has not started.
 */
export type DeployStatus =
  | "unknown"
  | "live"
  | "stale"
  | "queued"
  | "building"
  | "failed"
  | "blocked";

/** Statuses a run may be in while it still owns the build slot. */
export const IN_FLIGHT_STATUSES: readonly DeployStatus[] = ["queued", "building"];

/** True while a run is occupying the build queue (so a second is not started). */
export function isInFlight(status: DeployStatus): boolean {
  return IN_FLIGHT_STATUSES.includes(status);
}

/** The stable key for a (kind, slug) pair. */
export function systemId(kind: SystemKind, slug: string): string {
  return `${kind}:${slug}`;
}

/** Splits a system id back into its parts, or null when malformed. */
export function parseSystemId(id: string): { kind: SystemKind; slug: string } | null {
  const at = id.indexOf(":");
  if (at <= 0) return null;
  const kind = id.slice(0, at);
  const slug = id.slice(at + 1);
  if ((kind !== "demo" && kind !== "real") || slug.length === 0) return null;
  return { kind, slug };
}

/**
 * The repo-relative path of a system's tree, as it appears in git.
 *
 * Always forward-slashed, because a path recorded on Windows (`system\clinicos`)
 * must compare equal to the same path produced by git on any host. Getting this
 * wrong is silent: the webhook's changed-file list would never match a watch
 * path, and a pushed commit would deploy nothing.
 */
export function toRepoPath(...segments: string[]): string {
  return segments
    .filter((segment) => typeof segment === "string")
    .map((segment) => segment.replace(/\\/g, "/").replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

/**
 * Normalises a list of paths, tolerating the fact that callers pass this
 * straight to `Array#map`.
 *
 * `map` hands the callback `(value, index, array)`, so a variadic `toRepoPath`
 * would receive the array index as a second segment and silently build
 * `system/clinicos/1` instead of `system/clinicos`. That is a bug with no
 * symptom until a webhook stops matching, so it is its own function rather than
 * a call site anyone can get subtly wrong.
 */
export function toRepoPaths(paths: readonly string[]): string[] {
  return paths.map((path) => toRepoPath(path));
}

/** The default watch glob for a system: its own folder, and everything under it. */
export function defaultWatchPaths(repoPath: string): string[] {
  return [`${toRepoPath(repoPath)}/**`];
}

/**
 * True when a changed file should trigger a deploy of this system.
 *
 * Matching is prefix-based on the *directory* rather than a real glob: a system
 * watches `system/clinicos/**`, which means any path under that folder matches.
 * Shared watch paths (added by hand for a common package) are matched the same
 * way, so this stays one rule and not two.
 */
export function watchesPath(system: Pick<DeployedSystem, "watchPaths">, changedFile: string): boolean {
  const file = toRepoPath(changedFile);
  if (!file) return false;
  for (const pattern of system.watchPaths) {
    const root = toRepoPath(String(pattern).replace(/\/\*\*$/, ""));
    if (!root) continue;
    if (file === root || file.startsWith(`${root}/`)) return true;
  }
  return false;
}

/**
 * The systems a pushed commit touches, in registry order.
 *
 * A commit that touches nothing watched returns `[]` — the caller must treat
 * that as "nothing to do", not as "deploy everything". A commit that somehow
 * lands in both trees (a `system/x` and a `demo-systems/x` change at once)
 * returns both, and each is deployed to its own tree.
 */
export function systemsForPaths(
  systems: readonly Pick<DeployedSystem, "id" | "watchPaths">[],
  changedFiles: readonly string[],
): string[] {
  const files = toRepoPaths(changedFiles);
  return systems.filter((s) => files.some((f) => watchesPath(s, f))).map((s) => s.id);
}

/**
 * Whether a system's deployed commit is behind the branch tip.
 *
 * Nulls are treated as "not yet known", so a system that has never been checked
 * is not reported as stale on the strength of a missing value — it is simply
 * `unknown` until a real comparison happens.
 */
export function isBehind(record: Pick<DeployedSystemRecord, "deployedCommit" | "remoteCommit">): boolean {
  if (!record.deployedCommit || !record.remoteCommit) return false;
  return record.deployedCommit !== record.remoteCommit;
}

/**
 * The status a system should show, given its stored state and what the branch
 * tip is right now. Pure, so the admin UI can recompute without a write.
 *
 * An in-flight status is preserved: a check must not overwrite "building" with
 * "live" just because the branch tip happens to equal the last deployed commit.
 */
export function deriveStatus(record: Pick<DeployedSystemRecord, "status" | "deployedCommit" | "remoteCommit">): DeployStatus {
  if (isInFlight(record.status) || record.status === "failed" || record.status === "blocked") {
    return record.status;
  }
  if (!record.deployedCommit) return "unknown";
  return isBehind(record) ? "stale" : "live";
}

/** Short form of a commit for display: 7 chars, or `—` when unknown. */
export function shortCommit(sha: string | null | undefined): string {
  if (!sha) return "—";
  return sha.slice(0, 7);
}

/** The commit a webhook payload names, tolerating a deleted branch. */
export function pushedCommit(payload: {
  after?: string;
  deleted?: boolean;
}): string | null {
  if (payload.deleted) return null;
  const after = payload.after?.trim();
  // All-zeroes is what GitHub sends for a branch deletion.
  if (!after || /^0+$/.test(after)) return null;
  return after;
}

/**
 * The `owner/repo` a webhook came from, normalised to lower case.
 *
 * GitHub's repository names are case-insensitive, so two events for the same
 * repo must fold to one key or the registry grows a duplicate per casing.
 */
export function repoKey(fullName: string): string {
  return fullName.trim().toLowerCase();
}
