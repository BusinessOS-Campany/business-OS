import { createServer, type Server } from "node:http";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { stateFilePath, deliveriesFilePath } from "./helpers/deploy-state";

/**
 * The orchestrator, with GitHub replaced by a tiny local HTTP server.
 *
 * The orchestrator's job is the *choreography*: verify, dedupe, narrow by the
 * commit's files, queue. Two of those need GitHub. Pointing `GITHUB_API_BASE` at
 * a loopback server keeps the real `github.ts` (its headers, its result
 * handling) in the path while removing the network dependency — a stub of the
 * module would test nothing about whether the client speaks to GitHub
 * correctly.
 */

const STATE = stateFilePath();
const DELIVERIES = deliveriesFilePath();

/** What the fake GitHub returns for the next commit-files request. */
let filesResponse: string[] = [];
/** The branch head the fake GitHub reports. Hex so it routes as a head lookup. */
let headSha = "a".repeat(40);

let server: Server;
let apiBase: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    const url = req.url ?? "";
    const commitMatch = /^\/repos\/([^/]+)\/([^/]+)\/commits\/([^/]+)$/.exec(url);
    // Both `branchHead` and `commitFiles` hit the same path shape; the real
    // difference is the ref. A branch name ("main") is a head lookup; a 40-char
    // hex ref is a specific commit whose file list is wanted.
    if (commitMatch && /^[0-9a-f]{40}$/.test(commitMatch[3])) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          sha: commitMatch[3],
          files: filesResponse.map((filename) => ({
            filename,
            status: "modified",
            additions: 1,
            deletions: 0,
          })),
        }),
      );
      return;
    }
    if (commitMatch) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ sha: headSha, commit: { message: "x", committer: { date: "" } } }));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: "not found" }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  apiBase = `http://127.0.0.1:${port}`;

  process.env.GITHUB_API_BASE = apiBase;
  process.env.GITHUB_TOKEN = "test-token";
  process.env.GITHUB_REPO = "gmsnow/businessos";
  process.env.GITHUB_WEBHOOK_SECRET = "whsec_orchestrator";
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  delete process.env.GITHUB_API_BASE;
  delete process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_REPO;
  delete process.env.GITHUB_WEBHOOK_SECRET;
});

// Imported after the env is set, so the modules read the loopback base.
const { handleWebhook, adminSystemViews, reconcileAgainstGithub } = await import(
  "@/core/deploy/orchestrator"
);
const { signBody } = await import("@/core/deploy/signature");
const { reconcile, resetRegistryCache, patchRecord, getSystemRecord } = await import(
  "@/core/deploy/store"
);
const { discoverSystems } = await import("@/core/deploy/discovery");
const { clearDeliveries } = await import("@/core/deploy/deliveries");
const { __resetQueue, drain } = await import("@/core/deploy/queue");

/**
 * A sandbox tree with one demo and one real system, registered in the state
 * file. The orchestrator reads the registry, so the tree must exist.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const sandbox = mkdtempSync(join(tmpdir(), "deploy-orch-"));
const demoSysRoot = join(sandbox, "demo-systems");
const masterSysRoot = join(sandbox, "system");

for (const [root, slug] of [
  [demoSysRoot, "clinicos"],
  [masterSysRoot, "clinicos"],
  [masterSysRoot, "dental"],
] as const) {
  mkdirSync(join(root, slug), { recursive: true });
  writeFileSync(join(root, slug, "package.json"), JSON.stringify({ name: slug, scripts: {} }));
}

afterAll(() => rmSync(sandbox, { recursive: true, force: true }));

const SECRET = "whsec_orchestrator";

/**
 * A deterministic 40-char hex SHA for a label.
 *
 * Real webhook payloads always carry a full SHA, and the orchestrator only asks
 * GitHub for a commit's file list when the ref looks like one. Tests therefore
 * need valid SHAs, and pinning an exact literal per test is noise — a label
 * turned into hex keeps the assertion readable.
 */
function sha(label: string): string {
  const hex = Buffer.from(label).toString("hex");
  return (hex + "0".repeat(40)).slice(0, 40);
}

function payload(ref: string, after: string, fullName = "gmsnow/businessos"): string {
  return JSON.stringify({
    ref,
    after: sha(after),
    deleted: false,
    repository: { full_name: fullName, default_branch: "main" },
    head_commit: { timestamp: new Date().toISOString() },
  });
}

/** A no-op hook set: the tests assert scheduling, not building. */
const noopHooks = { restart: async () => {}, verify: async () => {} };

beforeEach(async () => {
  resetRegistryCache();
  __resetQueue();
  clearDeliveries(DELIVERIES);
  await reconcile(
    discoverSystems({ repoRoot: sandbox, demoSysRoot, masterSysRoot }),
    STATE,
  );
  filesResponse = [];
});

afterEach(async () => {
  await drain();
});

describe("signature and repo gating", () => {
  it("rejects an unsigned delivery and queues nothing", async () => {
    const result = await handleWebhook({
      rawBody: payload("refs/heads/main", "abc123"),
      signature: null,
      event: "push",
      deliveryId: "d-unsigned",
      secret: SECRET,
      hooks: noopHooks,
    });
    expect(result.accepted).toBe(false);
    expect(result.plan.outcome).toBe("rejected-signature");
    expect(result.queued).toEqual([]);
  });

  it("answers a ping without deploying", async () => {
    const body = JSON.stringify({ zen: "hi" });
    const result = await handleWebhook({
      rawBody: body,
      signature: signBody(body, SECRET),
      event: "ping",
      deliveryId: "d-ping",
      secret: SECRET,
      hooks: noopHooks,
    });
    expect(result.accepted).toBe(true);
    expect(result.plan.outcome).toBe("ping");
  });

  it("ignores a push to an untrusted repository", async () => {
    const body = payload("refs/heads/main", "abc", "attacker/fork");
    const result = await handleWebhook({
      rawBody: body,
      signature: signBody(body, SECRET),
      event: "push",
      deliveryId: "d-foreign",
      secret: SECRET,
      hooks: noopHooks,
    });
    expect(result.plan.outcome).toBe("ignored-repo");
    expect(result.queued).toEqual([]);
  });
});

describe("idempotency", () => {
  it("drops a repeated delivery id", async () => {
    filesResponse = ["demo-systems/clinicos/src/x.ts"];
    const body = payload("refs/heads/main", "abc123");

    const first = await handleWebhook({
      rawBody: body,
      signature: signBody(body, SECRET),
      event: "push",
      deliveryId: "d-dupe",
      secret: SECRET,
      hooks: noopHooks,
    });
    expect(first.duplicate).toBe(false);
    expect(first.queued).toEqual(["demo:clinicos"]);

    const second = await handleWebhook({
      rawBody: body,
      signature: signBody(body, SECRET),
      event: "push",
      deliveryId: "d-dupe",
      secret: SECRET,
      hooks: noopHooks,
    });
    expect(second.duplicate).toBe(true);
    expect(second.queued).toEqual([]);
  });

  it("does NOT record a signature-rejected delivery, so a fixed secret can retry", async () => {
    const body = payload("refs/heads/main", "abc");
    await handleWebhook({
      rawBody: body,
      signature: "sha256=bad",
      event: "push",
      deliveryId: "d-retry",
      secret: SECRET,
      hooks: noopHooks,
    });
    // Same id, now correctly signed: it must be processed.
    filesResponse = ["demo-systems/clinicos/x.ts"];
    const retry = await handleWebhook({
      rawBody: body,
      signature: signBody(body, SECRET),
      event: "push",
      deliveryId: "d-retry",
      secret: SECRET,
      hooks: noopHooks,
    });
    expect(retry.duplicate).toBe(false);
    expect(retry.queued).toEqual(["demo:clinicos"]);
  });
});

describe("demo / real split", () => {
  it("queues only the demo system when the commit touches the demo tree", async () => {
    filesResponse = ["demo-systems/clinicos/src/app/page.tsx"];
    const body = payload("refs/heads/main", "commit1");

    const result = await handleWebhook({
      rawBody: body,
      signature: signBody(body, SECRET),
      event: "push",
      deliveryId: "d-demo",
      secret: SECRET,
      hooks: noopHooks,
    });

    expect(result.queued).toEqual(["demo:clinicos"]);
    expect(result.queued).not.toContain("real:clinicos");
  });

  it("queues only the real system when the commit touches the master tree", async () => {
    filesResponse = ["system/clinicos/src/app/page.tsx"];
    const body = payload("refs/heads/main", "commit2");

    const result = await handleWebhook({
      rawBody: body,
      signature: signBody(body, SECRET),
      event: "push",
      deliveryId: "d-real",
      secret: SECRET,
      hooks: noopHooks,
    });

    expect(result.queued).toEqual(["real:clinicos"]);
    expect(result.queued).not.toContain("demo:clinicos");
  });

  it("queues nothing for a commit that touches neither tree", async () => {
    filesResponse = ["README.md", "PROJECT_MAP.md"];
    const body = payload("refs/heads/main", "commit3");

    const result = await handleWebhook({
      rawBody: body,
      signature: signBody(body, SECRET),
      event: "push",
      deliveryId: "d-none",
      secret: SECRET,
      hooks: noopHooks,
    });

    expect(result.queued).toEqual([]);
    expect(result.plan.outcome).toBe("ignored-nothing-watched");
  });

  it("records the target commit and marks the system queued", async () => {
    filesResponse = ["system/dental/src/x.ts"];
    const body = payload("refs/heads/main", "dental-commit");

    await handleWebhook({
      rawBody: body,
      signature: signBody(body, SECRET),
      event: "push",
      deliveryId: "d-record",
      secret: SECRET,
      hooks: noopHooks,
    });

    resetRegistryCache();
    const record = getSystemRecord("real:dental", STATE);
    expect(record?.remoteCommit).toBe(sha("dental-commit"));
  });
});

describe("adminSystemViews", () => {
  it("separates demo and real and reports an available update", async () => {
    await patchRecord("demo:clinicos", { deployedCommit: "aaa", remoteCommit: "bbb" }, STATE);
    await patchRecord("real:clinicos", { deployedCommit: "ccc", remoteCommit: "ccc" }, STATE);

    const views = adminSystemViews();
    const demo = views.find((v) => v.id === "demo:clinicos")!;
    const real = views.find((v) => v.id === "real:clinicos")!;

    expect(demo.kind).toBe("demo");
    expect(demo.updateAvailable).toBe(true);
    expect(real.updateAvailable).toBe(false);
  });
});

describe("reconcileAgainstGithub (the fallback sweep)", () => {
  it("queues a system whose branch head moved past its deployed commit", async () => {
    await patchRecord("demo:clinicos", { deployedCommit: "old", status: "live" }, STATE);
    headSha = "b".repeat(40);

    const queued = await reconcileAgainstGithub(noopHooks);
    expect(queued).toContain("demo:clinicos");

    resetRegistryCache();
    expect(getSystemRecord("demo:clinicos", STATE)?.remoteCommit).toBe(headSha);
  });

  it("does not requeue a system already at the branch head", async () => {
    headSha = "c".repeat(40);
    await patchRecord("demo:clinicos", { deployedCommit: headSha, status: "live" }, STATE);
    await patchRecord("real:clinicos", { deployedCommit: headSha, status: "live" }, STATE);
    await patchRecord("real:dental", { deployedCommit: headSha, status: "live" }, STATE);

    const queued = await reconcileAgainstGithub(noopHooks);
    expect(queued).toEqual([]);
  });

  it("leaves an in-flight system alone", async () => {
    await patchRecord("demo:clinicos", { deployedCommit: "old", status: "building" }, STATE);
    headSha = "d".repeat(40);
    const queued = await reconcileAgainstGithub(noopHooks);
    expect(queued).not.toContain("demo:clinicos");
  });
});
