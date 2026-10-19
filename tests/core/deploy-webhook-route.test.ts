import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signBody } from "@/core/deploy/signature";

/**
 * The public webhook route.
 *
 * The route is exercised through `POST(request)` with a real `Request`, because
 * the properties that matter — that the RAW body is what gets signed, and that a
 * missing secret fails closed — are behaviours of the HTTP boundary, not of any
 * helper. `handleWebhook` is mocked so the test asserts the route's own contract
 * (status codes, headers read, body passed through) rather than re-testing the
 * orchestrator.
 */

const handleWebhook = vi.fn();

vi.mock("@/core/deploy/orchestrator", () => ({
  handleWebhook: (...args: unknown[]) => handleWebhook(...args),
}));

const { POST } = await import("@/app/api/deploy/github/route");

const SECRET = "whsec_route_test";

/** Builds a Request the way GitHub would send one. */
function webhookRequest(
  body: string,
  headers: Record<string, string> = {},
): Request {
  return new Request("https://bosc.dpdns.org/api/deploy/github", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
}

beforeEach(() => {
  handleWebhook.mockReset();
  handleWebhook.mockResolvedValue({
    accepted: true,
    plan: { outcome: "deploy", systems: ["demo:clinicos"], commit: "abc", branch: "main", repo: "o/r", reason: "" },
    queued: ["demo:clinicos"],
    duplicate: false,
  });
  process.env.GITHUB_WEBHOOK_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.GITHUB_WEBHOOK_SECRET;
});

describe("secret configuration", () => {
  it("fails closed with 503 when no secret is configured", async () => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
    const response = await POST(webhookRequest("{}", { "x-github-event": "push" }));
    expect(response.status).toBe(503);
    // Crucially, nothing was handed to the orchestrator.
    expect(handleWebhook).not.toHaveBeenCalled();
  });
});

describe("body handling", () => {
  it("passes the RAW body through, unmodified", async () => {
    // Spacing and key order that a parse/serialise round trip would change.
    const raw = '{\n  "z": 1,\n  "a": 2\n}';
    handleWebhook.mockResolvedValueOnce({
      accepted: true,
      plan: { outcome: "ping", systems: [], commit: null, branch: null, repo: null, reason: "" },
      queued: [],
      duplicate: false,
    });

    const response = await POST(
      webhookRequest(raw, {
        "x-github-event": "ping",
        "x-github-delivery": "delivery-xyz",
        "x-hub-signature-256": signBody(raw, SECRET),
      }),
    );

    expect(response.status).toBe(202);
    const arg = handleWebhook.mock.calls[0][0] as { rawBody: string };
    // Byte-for-byte, so the HMAC the orchestrator verifies is the one GitHub sent.
    expect(arg.rawBody).toBe(raw);
  });

  it("forwards the signature, event and delivery id headers", async () => {
    await POST(
      webhookRequest("{}", {
        "x-github-event": "push",
        "x-github-delivery": "delivery-1",
        "x-hub-signature-256": "sha256=abc",
      }),
    );
    const arg = handleWebhook.mock.calls[0][0] as Record<string, string>;
    expect(arg.event).toBe("push");
    expect(arg.deliveryId).toBe("delivery-1");
    expect(arg.signature).toBe("sha256=abc");
  });
});

describe("response codes", () => {
  it("answers 202 with the queued systems when accepted", async () => {
    const response = await POST(webhookRequest("{}", { "x-github-event": "push" }));
    expect(response.status).toBe(202);
    const body = (await response.json()) as { ok: boolean; queued: string[] };
    expect(body.ok).toBe(true);
    expect(body.queued).toEqual(["demo:clinicos"]);
  });

  it("answers 401 when the signature is rejected", async () => {
    handleWebhook.mockResolvedValueOnce({
      accepted: false,
      plan: { outcome: "rejected-signature", systems: [], commit: null, branch: null, repo: null, reason: "signature did not verify" },
      queued: [],
      duplicate: false,
    });
    const response = await POST(webhookRequest("{}", { "x-github-event": "push" }));
    expect(response.status).toBe(401);
  });

  it("answers 500 when handling throws, so GitHub retries", async () => {
    handleWebhook.mockRejectedValueOnce(new Error("boom"));
    const response = await POST(webhookRequest("{}", { "x-github-event": "push" }));
    expect(response.status).toBe(500);
  });
});
