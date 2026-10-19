import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * GitHub webhook signature verification.
 *
 * GitHub signs the RAW request body with the webhook secret and sends it in
 * `X-Hub-Signature-256` as `sha256=<hex>`. Two details decide whether this is
 * real security or decoration:
 *
 *   - The digest is over the **raw bytes**, not a re-serialised JSON object.
 *     `JSON.parse` followed by `JSON.stringify` reorders and re-spaces the body,
 *     producing a different digest, so a handler that verifies after parsing can
 *     never match — and the usual "fix" is to skip verification. This module
 *     therefore takes the raw string and compares before anything parses it.
 *   - The comparison is constant-time. A `===` on the hex leaks, byte by byte,
 *     how far a guess matched, which is enough to forge a signature offline.
 *
 * The replay window is the caller's job (see `isFresh`), because clock skew and
 * a legitimate retry are policy, not cryptography.
 */

/** The header GitHub sends. */
export const SIGNATURE_HEADER = "x-hub-signature-256";

/** The digest GitHub uses. */
export const SIGNATURE_ALGORITHM = "sha256";

/** `sha256=<hex>` for a raw body, as GitHub computes it. */
export function signBody(rawBody: string, secret: string): string {
  const digest = createHmac(SIGNATURE_ALGORITHM, secret).update(rawBody, "utf8").digest("hex");
  return `${SIGNATURE_ALGORITHM}=${digest}`;
}

/**
 * True when `signature` is a valid `sha256=<hex>` of `rawBody` under `secret`.
 *
 * A missing signature, a missing secret, or a malformed header is `false` —
 * never "skip". The one thing worse than a rejected webhook is an accepted
 * unverified one, because that endpoint starts production builds.
 */
export function verifySignature(rawBody: string, signature: string | null | undefined, secret: string | null | undefined): boolean {
  if (!signature || !secret) return false;

  const expected = signBody(rawBody, secret);
  const actual = signature.trim();

  // Compare as bytes of equal length; `timingSafeEqual` throws on a mismatch,
  // which would itself be an oracle, so the lengths are checked first and in a
  // way that does not short-circuit the constant-time path for equal-length
  // inputs.
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(actual, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

/** Default replay window: five minutes, GitHub's own retry horizon. */
export const DEFAULT_MAX_AGE_SECONDS = 300;

/**
 * True when a webhook delivery is recent enough to act on.
 *
 * `X-GitHub-Delivery` is a UUID and GitHub retries a failed delivery, so a
 * timestamp alone cannot make a delivery single-use — that is the idempotency
 * store's job. This only rejects a body that is obviously old, which is the
 * cheap half of replay defence.
 *
 * An unparsable or missing timestamp is treated as fresh: GitHub has sent these
 * headers for years, and rejecting on a missing header would silently drop
 * deliveries during a format change.
 */
export function isFresh(
  headerValue: string | null | undefined,
  now: number = Date.now(),
  maxAgeSeconds: number = DEFAULT_MAX_AGE_SECONDS,
): boolean {
  if (!headerValue) return true;
  const seconds = Number(headerValue.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) return true;
  const ageSeconds = now / 1000 - seconds;
  // Negative age (a future timestamp) is a clock skew on our side, not an
  // attack worth dropping a real deploy over; only a large positive age is.
  return ageSeconds <= maxAgeSeconds;
}

/**
 * The event types this deployment acts on, and nothing else.
 *
 * `ping` is deliberately accepted separately by the route (to confirm a hook is
 * wired) but is not a deploy trigger.
 */
export type DeployEvent = "push" | "ping" | "other";

export function classifyEvent(eventHeader: string | null | undefined): DeployEvent {
  const event = (eventHeader ?? "").trim().toLowerCase();
  if (event === "push") return "push";
  if (event === "ping") return "ping";
  return "other";
}

/** Whether a push targets the branch a system builds from. */
export function isProductionBranch(branchRef: string | null | undefined, productionBranch: string): boolean {
  if (!branchRef) return false;
  const name = branchRef.replace(/^refs\/heads\//, "").trim();
  return name === productionBranch;
}

/** The branch name from a `refs/heads/<name>` ref. */
export function branchFromRef(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const match = /^refs\/heads\/(.+)$/.exec(ref.trim());
  return match ? match[1] : null;
}
