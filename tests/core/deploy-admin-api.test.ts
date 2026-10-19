import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { stateFilePath } from "./helpers/deploy-state";

/**
 * The platform-admin deploy API.
 *
 * The property that must not regress is the gate: this endpoint can read deploy
 * state and trigger a sweep, so a non-admin must be refused before any of that
 * work happens. The session lookup is mocked, which lets the test drive the
 * three cases that matter — no session, a non-admin, an admin — without a real
 * auth round trip.
 */

const getSession = vi.fn();
vi.mock("@/core/auth/server", () => ({
  auth: { api: { getSession: (...args: unknown[]) => getSession(...args) } },
}));

// The sweep reaches GitHub; stub it so this suite stays offline.
const reconcileAgainstGithub = vi.fn(async () => ["real:dental"]);
vi.mock("@/core/deploy/orchestrator", async (orig) => {
  const actual = await orig<typeof import("@/core/deploy/orchestrator")>();
  return { ...actual, reconcileAgainstGithub };
});

const STATE = stateFilePath();

/**
 * A dummy DSN, set before the route is imported.
 *
 * The route pulls in `@/core/http/api`, which builds the shared Prisma client at
 * module load. This suite never touches the database — the gate is mocked — but
 * the import still needs a parseable `DATABASE_URL` to get that far.
 */
process.env.DATABASE_URL ??= "postgresql://u:p@localhost:5432/businessos?schema=businessos";

const { GET, POST } = await import("@/app/api/platform/deploy/route");
const { reconcile, resetRegistryCache } = await import("@/core/deploy/store");
const { discoverSystems } = await import("@/core/deploy/discovery");

/** A tree with one demo and one real system. */
const sandbox = mkdtempSync(join(tmpdir(), "deploy-admin-"));
for (const [tree, slug] of [
  ["demo-systems", "clinicos"],
  ["system", "clinicos"],
] as const) {
  mkdirSync(join(sandbox, tree, slug), { recursive: true });
  writeFileSync(join(sandbox, tree, slug, "package.json"), JSON.stringify({ name: slug }));
}

afterAll(() => rmSync(sandbox, { recursive: true, force: true }));

function request(method: "GET" | "POST", body?: unknown): Request {
  return new Request("https://bosc.dpdns.org/api/platform/deploy", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(async () => {
  getSession.mockReset();
  reconcileAgainstGithub.mockClear();
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

describe("the gate", () => {
  it("refuses GET with no session (401)", async () => {
    getSession.mockResolvedValue(null);
    const response = await GET(request("GET"), undefined);
    expect(response.status).toBe(401);
  });

  it("refuses GET for a signed-in non-admin (403)", async () => {
    getSession.mockResolvedValue({ session: { id: "s" }, user: { id: "u", role: "user" } });
    const response = await GET(request("GET"), undefined);
    expect(response.status).toBe(403);
  });

  it("refuses POST for a non-admin, and does NOT run the sweep", async () => {
    getSession.mockResolvedValue({ session: { id: "s" }, user: { id: "u", role: "user" } });
    const response = await POST(request("POST", { action: "sweep" }), undefined);
    expect(response.status).toBe(403);
    expect(reconcileAgainstGithub).not.toHaveBeenCalled();
  });
});

describe("admin access", () => {
  beforeEach(() => {
    getSession.mockResolvedValue({
      session: { id: "s" },
      user: { id: "u", role: "admin", email: "admin@x", name: "Admin" },
    });
  });

  it("returns demo and real systems in separate buckets", async () => {
    const response = await GET(request("GET"), undefined);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      data: { demo: { id: string }[]; real: { id: string }[]; building: string[] };
    };
    expect(body.data.demo.map((s) => s.id)).toContain("demo:clinicos");
    expect(body.data.real.map((s) => s.id)).toContain("real:clinicos");
    // Never merged: the demo bucket holds no real system and vice versa.
    expect(body.data.demo.every((s) => s.id.startsWith("demo:"))).toBe(true);
    expect(body.data.real.every((s) => s.id.startsWith("real:"))).toBe(true);
  });

  it("reports GitHub as unconfigured rather than erroring", async () => {
    const response = await GET(request("GET"), undefined);
    const body = (await response.json()) as { data: { github: { mode: string } } };
    expect(body.data.github.mode).toBe("none");
  });

  it("refuses a sweep with 409 when GitHub is not configured", async () => {
    const response = await POST(request("POST", { action: "sweep" }), undefined);
    expect(response.status).toBe(409);
    expect(reconcileAgainstGithub).not.toHaveBeenCalled();
  });

  it("rejects an unknown action with 400", async () => {
    const response = await POST(request("POST", { action: "rm -rf /" }), undefined);
    expect(response.status).toBe(400);
  });
});
