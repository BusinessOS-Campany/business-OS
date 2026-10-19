import { describe, expect, it } from "vitest";
import {
  defaultWatchPaths,
  deriveStatus,
  isBehind,
  isInFlight,
  parseSystemId,
  pushedCommit,
  repoKey,
  shortCommit,
  systemId,
  systemsForPaths,
  toRepoPath,
  watchesPath,
  type DeployedSystem,
} from "@/core/deploy/manifest-schema";

/**
 * The deploy registry's pure half: identity, path normalisation, and the
 * decision "does this pushed commit concern this system?".
 *
 * These are the rules the webhook handler leans on, and every one of them has a
 * silent failure mode: a Windows backslash that never matches a git path, a
 * demo update that reaches a customer's real install, a branch deletion that
 * deploys commit `0000000`. None of those throw — they just do the wrong thing
 * quietly — so each is pinned here rather than left to the integration test.
 */

describe("system identity", () => {
  it("keys a system by kind AND slug, so the two trees never collide", () => {
    expect(systemId("demo", "clinicos")).toBe("demo:clinicos");
    expect(systemId("real", "clinicos")).toBe("real:clinicos");
    // The whole point of the split: same slug, two identities.
    expect(systemId("demo", "clinicos")).not.toBe(systemId("real", "clinicos"));
  });

  it("round-trips through parseSystemId", () => {
    expect(parseSystemId("demo:grocery")).toEqual({ kind: "demo", slug: "grocery" });
    expect(parseSystemId("real:grocery")).toEqual({ kind: "real", slug: "grocery" });
  });

  it("rejects a malformed id instead of inventing a kind", () => {
    expect(parseSystemId("grocery")).toBeNull();
    expect(parseSystemId("staging:grocery")).toBeNull();
    expect(parseSystemId("demo:")).toBeNull();
    expect(parseSystemId("")).toBeNull();
  });
});

describe("repo paths", () => {
  it("normalises Windows separators so a path matches what git reports", () => {
    expect(toRepoPath("system\\clinicos")).toBe("system/clinicos");
    expect(toRepoPath("demo-systems", "clinicos")).toBe("demo-systems/clinicos");
    expect(toRepoPath("/system/clinicos/")).toBe("system/clinicos");
  });

  it("derives a watch glob from the app folder", () => {
    expect(defaultWatchPaths("system/clinicos")).toEqual(["system/clinicos/**"]);
    expect(defaultWatchPaths("demo-systems\\dental")).toEqual(["demo-systems/dental/**"]);
  });
});

describe("watchesPath", () => {
  const system = { watchPaths: ["system/clinicos/**", "packages/shared/**"] };

  it("matches a file inside the watched folder", () => {
    expect(watchesPath(system, "system/clinicos/src/app/page.tsx")).toBe(true);
    expect(watchesPath(system, "system\\clinicos\\package.json")).toBe(true);
  });

  it("matches the folder itself", () => {
    expect(watchesPath(system, "system/clinicos")).toBe(true);
  });

  it("matches a second, shared watch path", () => {
    expect(watchesPath(system, "packages/shared/money.ts")).toBe(true);
  });

  it("does NOT match a sibling system", () => {
    expect(watchesPath(system, "system/dental/src/app/page.tsx")).toBe(false);
    // A prefix that is not a path boundary must not match either.
    expect(watchesPath(system, "system/clinicos-extra/x.ts")).toBe(false);
  });

  it("does not match the platform's own source", () => {
    expect(watchesPath(system, "src/app/page.tsx")).toBe(false);
  });
});

describe("systemsForPaths", () => {
  const systems: Pick<DeployedSystem, "id" | "watchPaths">[] = [
    { id: "demo:clinicos", watchPaths: ["demo-systems/clinicos/**"] },
    { id: "real:clinicos", watchPaths: ["system/clinicos/**"] },
    { id: "demo:grocery", watchPaths: ["demo-systems/grocery/**"] },
  ];

  it("picks exactly the touched system", () => {
    expect(systemsForPaths(systems, ["demo-systems/clinicos/src/x.ts"])).toEqual(["demo:clinicos"]);
  });

  it("keeps demo and real apart for the same slug", () => {
    expect(systemsForPaths(systems, ["system/clinicos/src/x.ts"])).toEqual(["real:clinicos"]);
  });

  it("returns both when a commit touches both trees", () => {
    expect(
      systemsForPaths(systems, ["system/clinicos/a.ts", "demo-systems/clinicos/b.ts"]),
    ).toEqual(["demo:clinicos", "real:clinicos"]);
  });

  it("returns nothing for a commit that touches no system", () => {
    // The important case: a README edit must not deploy anything.
    expect(systemsForPaths(systems, ["README.md", "src/app/page.tsx"])).toEqual([]);
  });
});

describe("isBehind / deriveStatus", () => {
  it("is not stale when both sides are unknown", () => {
    expect(isBehind({ deployedCommit: null, remoteCommit: null })).toBe(false);
    expect(deriveStatus({ status: "unknown", deployedCommit: null, remoteCommit: null })).toBe("unknown");
  });

  it("reports stale when the branch moved past the deployed commit", () => {
    const record = { deployedCommit: "aaa1111", remoteCommit: "bbb2222" };
    expect(isBehind(record)).toBe(true);
    expect(deriveStatus({ status: "live", ...record })).toBe("stale");
  });

  it("reports live when they agree", () => {
    const record = { deployedCommit: "aaa1111", remoteCommit: "aaa1111" };
    expect(deriveStatus({ status: "stale", ...record })).toBe("live");
  });

  it("never lets a check overwrite an in-flight or failed state", () => {
    for (const status of ["queued", "building", "failed", "blocked"] as const) {
      expect(deriveStatus({ status, deployedCommit: "aaa", remoteCommit: "aaa" })).toBe(status);
      expect(deriveStatus({ status, deployedCommit: "aaa", remoteCommit: "bbb" })).toBe(status);
    }
  });

  it("knows which statuses hold the build slot", () => {
    expect(isInFlight("queued")).toBe(true);
    expect(isInFlight("building")).toBe(true);
    expect(isInFlight("live")).toBe(false);
    expect(isInFlight("failed")).toBe(false);
  });
});

describe("webhook payload edges", () => {
  it("reads the pushed commit", () => {
    expect(pushedCommit({ after: "abc123" })).toBe("abc123");
  });

  it("treats a deleted branch as no commit, not as all-zeroes", () => {
    expect(pushedCommit({ after: "0000000000000000000000000000000000000000" })).toBeNull();
    expect(pushedCommit({ after: "abc", deleted: true })).toBeNull();
    expect(pushedCommit({})).toBeNull();
  });

  it("folds repo casing so one repo cannot become two entries", () => {
    expect(repoKey("GMSNOW/BusinessOS")).toBe(repoKey("gmsnow/businessos"));
  });

  it("shortens a commit for display and never prints a blank", () => {
    expect(shortCommit("1234567890abcdef")).toBe("1234567");
    expect(shortCommit(null)).toBe("—");
  });
});
