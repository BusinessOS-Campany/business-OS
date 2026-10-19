import { describe, expect, it } from "vitest";
import {
  branchFromRef,
  classifyEvent,
  DEFAULT_MAX_AGE_SECONDS,
  isFresh,
  isProductionBranch,
  signBody,
  verifySignature,
} from "@/core/deploy/signature";

/**
 * Webhook signature verification, pinned to GitHub's documented algorithm.
 *
 * This is the gate in front of production builds, so the tests that matter are
 * the rejections: a wrong secret, a tampered body, a truncated signature, an
 * absent header. A verifier that accepts any of those is worse than no verifier
 * at all, because it looks safe.
 */

/** GitHub's own published example: secret "It's a Secret to Everybody". */
const GITHUB_EXAMPLE_SECRET = "It's a Secret to Everybody";
const GITHUB_EXAMPLE_BODY = "Hello, World!";

describe("signBody", () => {
  it("matches GitHub's documented example signature", () => {
    // From GitHub's docs: HMAC-SHA256 of "Hello, World!" with that secret.
    expect(signBody(GITHUB_EXAMPLE_BODY, GITHUB_EXAMPLE_SECRET)).toBe(
      "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17",
    );
  });

  it("is stable for the same input", () => {
    expect(signBody("{}", "s")).toBe(signBody("{}", "s"));
  });

  it("changes when the body changes by one byte", () => {
    expect(signBody('{"a":1}', "s")).not.toBe(signBody('{"a":2}', "s"));
  });
});

describe("verifySignature", () => {
  const secret = "whsec_test_123";
  const body = JSON.stringify({ ref: "refs/heads/main", after: "abc123" });
  const good = signBody(body, secret);

  it("accepts a correct signature", () => {
    expect(verifySignature(body, good, secret)).toBe(true);
  });

  it("rejects a signature made with a different secret", () => {
    expect(verifySignature(body, signBody(body, "other-secret"), secret)).toBe(false);
  });

  it("rejects a body that was tampered with after signing", () => {
    const tampered = body.replace("abc123", "evil999");
    expect(verifySignature(tampered, good, secret)).toBe(false);
  });

  it("rejects when the signature header is missing", () => {
    expect(verifySignature(body, null, secret)).toBe(false);
    expect(verifySignature(body, undefined, secret)).toBe(false);
    expect(verifySignature(body, "", secret)).toBe(false);
  });

  it("rejects when no secret is configured — never skips verification", () => {
    expect(verifySignature(body, good, null)).toBe(false);
    expect(verifySignature(body, good, undefined)).toBe(false);
    expect(verifySignature(body, good, "")).toBe(false);
  });

  it("rejects a truncated or padded signature without throwing", () => {
    expect(verifySignature(body, good.slice(0, -1), secret)).toBe(false);
    expect(verifySignature(body, `${good}00`, secret)).toBe(false);
    expect(verifySignature(body, "sha256=", secret)).toBe(false);
    expect(verifySignature(body, "not-a-signature", secret)).toBe(false);
  });

  it("rejects a signature for the right body but the wrong algorithm prefix", () => {
    const hex = good.replace("sha256=", "");
    expect(verifySignature(body, `sha1=${hex}`, secret)).toBe(false);
  });

  it("verifies the RAW body, not a re-serialised one", () => {
    // The failure this prevents: parse then stringify changes key order and
    // spacing, so verification "against the parsed object" can never match and
    // the tempting fix is to stop verifying.
    const raw = '{"b":2,  "a":1}';
    const sig = signBody(raw, secret);
    expect(verifySignature(raw, sig, secret)).toBe(true);
    expect(verifySignature(JSON.stringify(JSON.parse(raw)), sig, secret)).toBe(false);
  });
});

describe("isFresh", () => {
  const now = 1_700_000_000_000;

  it("accepts a delivery inside the window", () => {
    expect(isFresh(String(now / 1000 - 10), now)).toBe(true);
  });

  it("rejects a delivery older than the window", () => {
    expect(isFresh(String(now / 1000 - (DEFAULT_MAX_AGE_SECONDS + 60)), now)).toBe(false);
  });

  it("treats a missing or unparsable timestamp as fresh", () => {
    expect(isFresh(null, now)).toBe(true);
    expect(isFresh("", now)).toBe(true);
    expect(isFresh("not-a-number", now)).toBe(true);
  });

  it("does not drop a delivery over a future timestamp", () => {
    expect(isFresh(String(now / 1000 + 30), now)).toBe(true);
  });
});

describe("event classification", () => {
  it("recognises push and ping, and lumps the rest", () => {
    expect(classifyEvent("push")).toBe("push");
    expect(classifyEvent("PUSH")).toBe("push");
    expect(classifyEvent("ping")).toBe("ping");
    expect(classifyEvent("pull_request")).toBe("other");
    expect(classifyEvent(null)).toBe("other");
  });
});

describe("branch matching", () => {
  it("matches only the configured production branch", () => {
    expect(isProductionBranch("refs/heads/main", "main")).toBe(true);
    expect(isProductionBranch("refs/heads/develop", "main")).toBe(false);
    expect(isProductionBranch("refs/heads/main", "release")).toBe(false);
    expect(isProductionBranch(null, "main")).toBe(false);
  });

  it("extracts a branch name from a ref", () => {
    expect(branchFromRef("refs/heads/main")).toBe("main");
    expect(branchFromRef("refs/heads/feature/x")).toBe("feature/x");
    expect(branchFromRef("refs/tags/v1")).toBeNull();
    expect(branchFromRef(null)).toBeNull();
  });
});
