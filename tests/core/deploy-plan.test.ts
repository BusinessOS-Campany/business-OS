import { describe, expect, it } from "vitest";
import { narrowByPaths, planWebhook, type EligibleSystem } from "@/core/deploy/plan";
import { signBody } from "@/core/deploy/signature";
import type { DeployedSystemRecord } from "@/core/deploy/manifest-schema";

/**
 * The webhook planner: the decision that stands between a GitHub delivery and a
 * production build.
 *
 * Every test here is a rejection or a narrowing except the two that prove the
 * happy path. That ratio is the point — the endpoint is public, and the only
 * thing protecting the build queue is this function saying "no".
 */

const SECRET = "whsec_test_abc123";
const REPO = "gmsnow/businessos";

type SystemStub = Pick<DeployedSystemRecord, "id" | "watchPaths" | "productionBranch">;

const SYSTEMS: SystemStub[] = [
  { id: "demo:clinicos", watchPaths: ["demo-systems/clinicos/**"], productionBranch: "main" },
  { id: "real:clinicos", watchPaths: ["system/clinicos/**"], productionBranch: "main" },
  { id: "real:dental", watchPaths: ["system/dental/**"], productionBranch: "main" },
  { id: "real:grocery", watchPaths: ["system/grocery/**"], productionBranch: "release" },
];

/** A push payload with sensible defaults. */
function pushBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    ref: "refs/heads/main",
    after: "abc1234567890abcdef",
    deleted: false,
    repository: { full_name: REPO, default_branch: "main" },
    head_commit: { timestamp: new Date().toISOString() },
    ...overrides,
  });
}

function plan(body: string, headers: Partial<{ signature: string; event: string; deliveryId: string }> = {}, now?: number) {
  return planWebhook({
    rawBody: body,
    signature: headers.signature ?? signBody(body, SECRET),
    event: headers.event ?? "push",
    deliveryId: headers.deliveryId ?? "delivery-1",
    secret: SECRET,
    trustedRepo: REPO,
    systems: SYSTEMS,
    now,
  });
}

describe("signature gate", () => {
  it("rejects an unsigned delivery before anything else happens", () => {
    const result = plan(pushBody(), { signature: "" });
    expect(result.outcome).toBe("rejected-signature");
    expect(result.systems).toEqual([]);
  });

  it("rejects a body signed with the wrong secret", () => {
    const body = pushBody();
    const result = plan(body, { signature: signBody(body, "wrong-secret") });
    expect(result.outcome).toBe("rejected-signature");
  });

  it("rejects a tampered body carrying a signature for the original", () => {
    const original = pushBody();
    const signature = signBody(original, SECRET);
    // A real tamper: swap the commit the payload names.
    const tampered = original.replace("abc1234567890abcdef", "ffff9999999999999999");
    expect(tampered).not.toBe(original);
    const result = plan(tampered, { signature });
    expect(result.outcome).toBe("rejected-signature");
  });

  it("rejects when no secret is configured", () => {
    const body = pushBody();
    const result = planWebhook({
      rawBody: body,
      signature: signBody(body, SECRET),
      event: "push",
      deliveryId: "d",
      secret: null,
      trustedRepo: REPO,
      systems: SYSTEMS,
    });
    expect(result.outcome).toBe("rejected-signature");
  });
});

describe("event classification", () => {
  it("answers a ping without deploying", () => {
    const result = plan(JSON.stringify({ zen: "hi" }), { event: "ping" });
    expect(result.outcome).toBe("ping");
    expect(result.systems).toEqual([]);
  });

  it("ignores a pull_request event", () => {
    const result = plan(pushBody(), { event: "pull_request" });
    expect(result.outcome).toBe("ignored-event");
  });

  it("ignores a push older than the replay window", () => {
    const old = new Date(Date.now() - 60 * 60_000).toISOString();
    const result = plan(pushBody({ head_commit: { timestamp: old } }));
    expect(result.outcome).toBe("rejected-stale");
  });
});

describe("repo and branch routing", () => {
  it("ignores a push to a different repository", () => {
    const body = pushBody({ repository: { full_name: "someone/fork" } });
    const result = plan(body);
    expect(result.outcome).toBe("ignored-repo");
  });

  it("ignores a branch deletion rather than building all-zeroes", () => {
    const body = pushBody({ after: "0000000000000000000000000000000000000000", deleted: true });
    const result = plan(body);
    expect(result.outcome).toBe("ignored-delete");
  });

  it("ignores a push to a branch no system builds from", () => {
    const body = pushBody({ ref: "refs/heads/feature/scratch" });
    const result = plan(body);
    expect(result.outcome).toBe("ignored-branch");
  });

  it("only considers systems whose branch matches", () => {
    // grocery builds from `release`, so a push to `main` must not include it.
    const result = plan(pushBody({ ref: "refs/heads/main" }));
    expect(result.outcome).toBe("deploy");
    expect(result.systems).not.toContain("real:grocery");
    expect(result.systems).toContain("real:clinicos");

    const release = plan(pushBody({ ref: "refs/heads/release" }));
    expect(release.systems).toEqual(["real:grocery"]);
  });
});

describe("narrowByPaths", () => {
  const eligible: EligibleSystem[] = SYSTEMS.map((s) => ({ id: s.id, watchPaths: s.watchPaths }));

  it("keeps only the systems the commit actually touched", () => {
    const result = plan(pushBody());
    const narrowed = narrowByPaths(result, eligible, ["system/clinicos/src/app/page.tsx"]);
    expect(narrowed.outcome).toBe("deploy");
    expect(narrowed.systems).toEqual(["real:clinicos"]);
  });

  it("keeps demo and real apart for the same slug", () => {
    const result = plan(pushBody());
    const demo = narrowByPaths(result, eligible, ["demo-systems/clinicos/src/x.ts"]);
    expect(demo.systems).toEqual(["demo:clinicos"]);
  });

  it("deploys nothing for a commit that touches no watched path", () => {
    const result = plan(pushBody());
    const narrowed = narrowByPaths(result, eligible, ["README.md", "PROJECT_MAP.md"]);
    expect(narrowed.outcome).toBe("ignored-nothing-watched");
    expect(narrowed.systems).toEqual([]);
  });

  it("handles a commit that touches two systems at once", () => {
    const result = plan(pushBody());
    const narrowed = narrowByPaths(result, eligible, [
      "system/clinicos/a.ts",
      "system/dental/b.ts",
    ]);
    expect(narrowed.systems.sort()).toEqual(["real:clinicos", "real:dental"]);
  });

  it("normalises Windows separators in the file list", () => {
    const result = plan(pushBody());
    const narrowed = narrowByPaths(result, eligible, ["system\\clinicos\\src\\x.ts"]);
    expect(narrowed.systems).toEqual(["real:clinicos"]);
  });

  it("does nothing to a plan that was already ignored", () => {
    const ignored = plan(pushBody({ ref: "refs/heads/feature/x" }));
    const narrowed = narrowByPaths(ignored, eligible, ["system/clinicos/x.ts"]);
    expect(narrowed.outcome).toBe("ignored-branch");
  });

  it("cannot be widened beyond the branch-eligible set", () => {
    const release = plan(pushBody({ ref: "refs/heads/release" }));
    // A file for clinicos must not sneak clinicos in when only grocery was eligible.
    const narrowed = narrowByPaths(release, eligible, ["system/clinicos/x.ts"]);
    expect(narrowed.systems).not.toContain("real:clinicos");
  });
});
