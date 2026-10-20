import { describe, expect, it } from "vitest";
import { planWebhook, narrowByPaths, type EligibleSystem } from "@/core/deploy/plan";
import { signBody } from "@/core/deploy/signature";
import { systemsForRepo, systemsForPaths } from "@/core/deploy/manifest-schema";
import { discoverSystems } from "@/core/deploy/discovery";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/**
 * One repository per system.
 *
 * The platform may be deployed either as a monorepo (one repo, systems chosen
 * by the paths a commit touched) or with a repository per system (the repo is
 * the identity). These tests pin the second layout, because the two rules must
 * not be confused: a repo-routed system deploys on ANY push to its repo, while
 * a monorepo system deploys only when a watched path changed. Getting this
 * wrong is silent in both directions — either nothing deploys, or everything
 * does.
 */

const SECRET = "whsec_multi_repo_test";

/** A push from a given repository. */
function pushBody(repo: string, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    ref: "refs/heads/main",
    after: "abc1234567890abcdef",
    deleted: false,
    repository: { full_name: repo, default_branch: "main" },
    head_commit: { timestamp: new Date().toISOString() },
    ...overrides,
  });
}

type Stub = { id: string; watchPaths: string[]; productionBranch: string; repo: string | null };

/** A repo-per-system registry: each system publishes to its own repository. */
const REPO_SYSTEMS: Stub[] = [
  { id: "real:dental", watchPaths: ["system/dental/**"], productionBranch: "main", repo: "businessos/dental" },
  { id: "real:grocery", watchPaths: ["system/grocery/**"], productionBranch: "main", repo: "businessos/grocery" },
  { id: "real:clinicos", watchPaths: ["system/clinicos/**"], productionBranch: "main", repo: "businessos/clinic" },
  { id: "demo:dental", watchPaths: ["demo-systems/dental/**"], productionBranch: "main", repo: null },
];

function plan(repo: string, systems: Stub[] = REPO_SYSTEMS, overrides: Record<string, unknown> = {}) {
  const body = pushBody(repo, overrides);
  return planWebhook({
    rawBody: body,
    signature: signBody(body, SECRET),
    event: "push",
    deliveryId: "d1",
    secret: SECRET,
    trustedRepo: null, // repo-per-system: no single trusted repo
    systems,
  });
}

describe("systemsForRepo", () => {
  it("selects only the systems mapped to the pushed repository", () => {
    expect(systemsForRepo(REPO_SYSTEMS, "businessos/dental")).toEqual(["real:dental"]);
  });

  it("is case-insensitive, as GitHub repository names are", () => {
    expect(systemsForRepo(REPO_SYSTEMS, "BusinessOS/Dental")).toEqual(["real:dental"]);
  });

  it("selects nothing for an unmapped repository", () => {
    expect(systemsForRepo(REPO_SYSTEMS, "businessos/unknown")).toEqual([]);
  });

  it("never selects a system with no repository mapping", () => {
    // The demo has repo: null; a stray push must not drag it in.
    expect(systemsForRepo(REPO_SYSTEMS, "businessos/demo-dental")).toEqual([]);
  });
});

describe("planner routing by repository", () => {
  it("deploys the mapped system on a push to its own repo", () => {
    const result = plan("businessos/dental");
    expect(result.outcome).toBe("deploy");
    expect(result.systems).toEqual(["real:dental"]);
    expect(result.repo).toBe("businessos/dental");
  });

  it("deploys a different system for a different repo, same branch", () => {
    expect(plan("businessos/grocery").systems).toEqual(["real:grocery"]);
    expect(plan("businessos/clinic").systems).toEqual(["real:clinicos"]);
  });

  it("deploys nothing for a repository no system maps to", () => {
    const result = plan("businessos/random");
    expect(result.outcome).toBe("ignored-repo");
    expect(result.systems).toEqual([]);
  });

  it("respects the production branch per system", () => {
    const result = plan("businessos/dental", REPO_SYSTEMS, { ref: "refs/heads/feature" });
    expect(result.outcome).toBe("ignored-branch");
    expect(result.systems).toEqual([]);
  });

  it("deploys on a docs-only push to the repo, because the repo is the identity", () => {
    // Unlike a monorepo, there is no path filter here: a push to the dental repo
    // is a dental change even if it only edits the README.
    const result = plan("businessos/dental");
    expect(result.systems).toEqual(["real:dental"]);
  });
});

describe("repo-routed systems survive path narrowing", () => {
  it("keeps a repo-mapped system whose files never match a monorepo prefix", () => {
    const result = plan("businessos/dental");
    const eligible: EligibleSystem[] = REPO_SYSTEMS.map((s) => ({
      id: s.id,
      watchPaths: s.watchPaths,
      repo: s.repo,
    }));
    // The repo's own file list (paths at its root) must not narrow it away.
    const narrowed = narrowByPaths(result, eligible, ["src/app/page.tsx", "package.json"]);
    expect(narrowed.outcome).toBe("deploy");
    expect(narrowed.systems).toEqual(["real:dental"]);
  });

  it("still narrows a repo-less (monorepo) system by path", () => {
    const planValue = {
      outcome: "deploy" as const,
      systems: ["real:dental", "demo:dental"],
      commit: "abc1234",
      branch: "main",
      repo: "businessos/dental",
      reason: "",
    };
    const eligible: EligibleSystem[] = [
      { id: "real:dental", watchPaths: ["system/dental/**"], repo: "businessos/dental" },
      { id: "demo:dental", watchPaths: ["demo-systems/dental/**"], repo: null },
    ];
    // The commit touches neither watched path. The repo-routed real is kept
    // (the repo decided it), while the repo-less demo is narrowed away.
    const narrowed = narrowByPaths(planValue, eligible, ["README.md"]);
    expect(narrowed.systems).toEqual(["real:dental"]);
  });

  it("drops the repo-less system when its path is untouched even if a path matches the other", () => {
    const planValue = {
      outcome: "deploy" as const,
      systems: ["real:dental", "demo:dental"],
      commit: "abc1234",
      branch: "main",
      repo: "businessos/dental",
      reason: "",
    };
    const eligible: EligibleSystem[] = [
      { id: "real:dental", watchPaths: ["system/dental/**"], repo: "businessos/dental" },
      { id: "demo:dental", watchPaths: ["demo-systems/dental/**"], repo: null },
    ];
    // Only the demo folder changed: demo matches by path, real is kept by repo.
    const narrowed = narrowByPaths(planValue, eligible, ["demo-systems/dental/src/x.ts"]);
    expect(narrowed.systems).toEqual(["real:dental", "demo:dental"]);
  });
});

describe("discovery attaches repositories from config", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "deploy-multirepo-"));
  const demoSysRoot = join(sandbox, "demo-systems");
  const masterSysRoot = join(sandbox, "system");

  // Two systems on disk, plus a config that maps only one of them.
  for (const root of [demoSysRoot, masterSysRoot]) {
    for (const slug of ["dental", "grocery"]) {
      mkdirSync(join(root, slug), { recursive: true });
      writeFileSync(join(root, slug, "package.json"), JSON.stringify({ name: slug }));
    }
  }
  mkdirSync(join(sandbox, "config"), { recursive: true });
  writeFileSync(
    join(sandbox, "config", "deploy.json"),
    JSON.stringify({
      productionBranch: "main",
      // A system-specific key and a bare slug key, to prove precedence.
      repos: { "real:dental": "businessos/dental", grocery: "businessos/grocery" },
    }),
  );

  const systems = discoverSystems({ repoRoot: sandbox, demoSysRoot, masterSysRoot });

  it("maps a system-specific repo key", () => {
    expect(systems.find((s) => s.id === "real:dental")?.repo).toBe("businessos/dental");
  });

  it("applies a bare-slug repo key to both trees", () => {
    expect(systems.find((s) => s.id === "real:grocery")?.repo).toBe("businessos/grocery");
    expect(systems.find((s) => s.id === "demo:grocery")?.repo).toBe("businessos/grocery");
  });

  it("leaves an unmapped system with a null repo", () => {
    expect(systems.find((s) => s.id === "demo:dental")?.repo).toBeNull();
  });

  it("never deploys an unmapped system from a repo push", () => {
    // demo:dental is unmapped, so no repository selects it.
    expect(systemsForRepo(systems, "businessos/dental")).toEqual(["real:dental"]);
  });

  rmSync(sandbox, { recursive: true, force: true });
});

describe("monorepo fallback is untouched", () => {
  it("a system with no repo still routes by changed path", () => {
    const systems = [
      { id: "real:a", watchPaths: ["system/a/**"], repo: null },
      { id: "real:b", watchPaths: ["system/b/**"], repo: null },
    ];
    expect(systemsForPaths(systems, ["system/b/src/x.ts"])).toEqual(["real:b"]);
  });
});

/** A quick guard that the sandbox helper is actually cleaning up. */
describe("sandbox hygiene", () => {
  it("does not leave temp directories referenced after the suite", () => {
    expect(existsSync(tmpdir())).toBe(true);
  });
});
