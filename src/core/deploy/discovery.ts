import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  defaultWatchPaths,
  systemId,
  toRepoPath,
  type DeployedSystem,
  type SystemKind,
} from "./manifest-schema";

/**
 * Discovery of the systems a deployment owns, straight from the two trees.
 *
 * There are exactly two places a deployable system can live, and they mean
 * different things:
 *
 *   - `demo-systems/<slug>/` — the demo tree. Served same-origin under
 *     `/demo/<slug>` for prospects to try. Editing one must never touch a
 *     customer's install.
 *   - `system/<slug>/`       — the master tree. Cloned per organization into
 *     `orginazition/<org>/systems/<slug>/` and run as that org's own process.
 *
 * This module reads both, returns one entry per system, and derives everything
 * else (repo path, watch globs) from where the folder sits. It is the same rule
 * `system-sources.ts` uses for the master tree — "a directory with a
 * `package.json` is a system" — applied consistently to both, so a half-copied
 * folder or a notes directory never becomes something the deployer will try to
 * build. `system/HR` here is exactly that case: a folder with no `package.json`,
 * correctly skipped.
 *
 * A system present in BOTH trees yields two entries with the same slug and
 * different kinds — never one merged entry. That is what keeps `demo:clinicos`
 * and `real:clinicos` from ever being confused for each other.
 *
 * Deliberately free of git and of the database: this answers "what is on disk",
 * and the registry layers "what is deployed" on top.
 */

/** Where the two trees live, relative to the repo root. */
const DEMO_TREE = "demo-systems";
const MASTER_TREE = "system";

/** Directories that are never a system, whatever else they contain. */
const IGNORED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".turbo",
  ".vercel",
  "dist",
  "build",
  "coverage",
]);

/** The branch a system's production builds come from unless overridden. */
export const DEFAULT_PRODUCTION_BRANCH = "main";

export interface DiscoveryRoots {
  /** Repo root; the two trees are resolved under it. */
  repoRoot: string;
  /** Override for the demo tree (tests). Defaults to `<repoRoot>/demo-systems`. */
  demoSysRoot?: string;
  /** Override for the master tree (tests). Defaults to `<repoRoot>/system`. */
  masterSysRoot?: string;
}

/**
 * The production branch for a system, from `config/deploy.json` when present.
 *
 * Read rather than assumed so a repo that puts a system on `release` does not
 * silently deploy `main` over it. The file is optional and its absence is the
 * normal case, hence the default rather than an error.
 */
interface DeployConfig {
  productionBranch?: string;
  /** Where repositories are checked out; each system gets `<cloneRoot>/<slug>`. */
  cloneRoot?: string;
  /** Folder names inside a system repository that hold each tree. */
  subdirs?: { real?: string; demo?: string };
  systems?: Record<string, { productionBranch?: string; watchPaths?: string[]; repo?: string }>;
  /**
   * Per-system GitHub repositories, keyed the same way as `systems` — a system
   * id (`real:dental`) or a bare slug (`dental`, applying to both trees). The
   * value is `owner/repo`.
   *
   * Kept as its own top-level map rather than nested under `systems` so the
   * common case — "this folder publishes to that repository" — reads as one
   * flat table, which is the thing an operator actually edits.
   */
  repos?: Record<string, string>;
}

function readDeployConfig(repoRoot: string): DeployConfig {
  const file = join(repoRoot, "config", "deploy.json");
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, "utf-8")) as DeployConfig;
  } catch {
    // A malformed config must not stop discovery; the defaults are safe.
    return {};
  }
}

/** Human labels for the systems we ship, so the admin UI reads in Arabic. */
const LABELS: Record<string, { nameAr: string; nameEn: string }> = {
  grocery: { nameAr: "نظام البقالة", nameEn: "Grocery Store" },
  dental: { nameAr: "نظام عيادة الأسنان", nameEn: "Dental Clinic" },
  clinicos: { nameAr: "نظام إدارة العيادات", nameEn: "Clinic Management System" },
  "sama-center": { nameAr: "مركز سما الطبي", nameEn: "Sama Medical Center" },
  pharmacy: { nameAr: "نظام الصيدلية", nameEn: "Pharmacy System" },
  laboratory: { nameAr: "نظام المختبر", nameEn: "Laboratory System" },
  pos: { nameAr: "نظام نقاط البيع", nameEn: "POS System" },
  optometry: { nameAr: "نظام عيادة العيون", nameEn: "Optometry Clinic" },
  hospital: { nameAr: "نظام إدارة المستشفيات", nameEn: "Hospital Management" },
  cafe: { nameAr: "نظام المقاهي (سيليا)", nameEn: "Café System (Celia)" },
};

/** Title-cases a slug for a system we have no curated label for. */
function fallbackLabel(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** True when `dir/<slug>/package.json` exists — the "this is a system" rule. */
function isSystemFolder(dir: string, slug: string): boolean {
  try {
    const full = join(dir, slug);
    if (!statSync(full).isDirectory()) return false;
    return existsSync(join(full, "package.json"));
  } catch {
    return false;
  }
}

/** Folder names under `tree`, sorted, ignoring the never-a-system directories. */
function systemFolders(tree: string): string[] {
  try {
    return readdirSync(tree, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !IGNORED_DIRS.has(entry.name))
      .map((entry) => entry.name)
      .filter((slug) => isSystemFolder(tree, slug))
      .sort();
  } catch {
    return [];
  }
}

/**
 * An absolute path expressed relative to the repo root, forward-slashed.
 *
 * Falls back to the absolute path when the tree sits outside the repo (a test
 * sandbox), so the value is always usable as a watch prefix rather than silently
 * becoming `../../..` noise.
 */
function repoRelative(repoRoot: string, absolute: string): string {
  const rel = relative(repoRoot, absolute);
  const normalized = toRepoPath(rel);
  return normalized.startsWith("..") ? toRepoPath(absolute) : normalized;
}

function buildSystem(
  kind: SystemKind,
  slug: string,
  treeDir: string,
  repoRoot: string,
  config: DeployConfig,
): DeployedSystem {
  // The folder the tree currently lives in (system/<slug> or demo-systems/<slug>).
  const treePath = resolve(join(treeDir, slug));
  const label = LABELS[slug];
  const override = config.systems?.[systemId(kind, slug)] ?? config.systems?.[slug];
  // The repository mapping: a system-specific key wins over a bare slug, and a
  // per-system entry may also carry `repo` nested for convenience.
  const repo =
    config.repos?.[systemId(kind, slug)] ??
    config.repos?.[slug] ??
    override?.repo ??
    null;

  // The subdirectory inside the repository this tree is built from (`real` or
  // `demo`), when one repository serves both trees through a shared clone. Null
  // when the app sits at the repository root, or when the plain folder layout
  // is in use — in both cases the folder on disk IS the working tree root.
  const subtree = config.subdirs?.[kind] ?? kind;
  const cloneRoot = config.cloneRoot ? resolve(join(repoRoot, config.cloneRoot)) : null;
  const clonePath = repo && cloneRoot ? join(cloneRoot, slug) : treePath;
  const useClone = Boolean(repo && cloneRoot && existsSync(clonePath));
  const subdir = useClone ? subtree : null;
  const localPath = useClone ? join(clonePath, subdir!) : treePath;

  // Display path: the repo-relative subdir when cloned, else the tree folder.
  const repoPath = useClone ? subdir! : repoRelative(repoRoot, treePath);

  return {
    id: systemId(kind, slug),
    kind,
    slug,
    nameAr: label?.nameAr ?? fallbackLabel(slug),
    nameEn: label?.nameEn ?? fallbackLabel(slug),
    localPath,
    repoPath,
    repo: repo ? repo.toLowerCase() : null,
    subdir,
    clonePath,
    watchPaths: override?.watchPaths ?? defaultWatchPaths(repoPath),
    productionBranch:
      override?.productionBranch ?? config.productionBranch ?? DEFAULT_PRODUCTION_BRANCH,
    buildDir: null,
  };
}

/**
 * Every deployable system currently on disk, demo tree first.
 *
 * Deterministic and idempotent: run it twice and the same ids come back in the
 * same order, so the registry can be reconciled against it without creating
 * duplicate rows. Ordering is by kind then slug for a stable display.
 */
export function discoverSystems(roots: DiscoveryRoots): DeployedSystem[] {
  const repoRoot = resolve(roots.repoRoot);
  const demoSysRoot = resolve(roots.demoSysRoot ?? join(repoRoot, DEMO_TREE));
  const masterSysRoot = resolve(roots.masterSysRoot ?? join(repoRoot, MASTER_TREE));
  const config = readDeployConfig(repoRoot);

  const demo = systemFolders(demoSysRoot).map((slug) =>
    buildSystem("demo", slug, demoSysRoot, repoRoot, config),
  );
  const real = systemFolders(masterSysRoot).map((slug) =>
    buildSystem("real", slug, masterSysRoot, repoRoot, config),
  );

  return [...demo, ...real];
}

/** Discovery against the live repo, using the same env overrides the platform reads. */
export function discoverRepoSystems(repoRoot: string = process.cwd()): DeployedSystem[] {
  return discoverSystems({
    repoRoot,
    demoSysRoot: join(repoRoot, DEMO_TREE),
    masterSysRoot: process.env.SYSTEM_SOURCE_PATH?.trim() || join(repoRoot, MASTER_TREE),
  });
}
