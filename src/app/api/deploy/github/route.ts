import { NextResponse } from "next/server";
import { logger } from "@/core/logging/logger";
import { handleWebhook } from "@/core/deploy/orchestrator";
import { SIGNATURE_HEADER } from "@/core/deploy/signature";

/**
 * The GitHub push webhook: `POST /api/deploy/github`.
 *
 * This is the only public endpoint that can start a production build, so its
 * shape is dictated by two hard requirements and one convenience:
 *
 *   - **Read the raw bytes first.** The signature is an HMAC of the exact body
 *     GitHub sent. `await request.text()` is called before anything else, and the
 *     parsed JSON is never re-serialised for verification. `request.json()`
 *     followed by verification is the classic bug here: it re-spaces the body,
 *     the digest never matches, and the temptation is to stop verifying.
 *   - **Answer fast.** GitHub retries a delivery that does not get a 2xx within
 *     ~10s, and a build takes minutes. The route therefore queues the work and
 *     returns 202 immediately; `handleWebhook` never awaits a build.
 *   - **Never leak the secret.** The secret is read inside the orchestrator from
 *     the environment; this route only forwards the header.
 *
 * Status codes are chosen so GitHub's retry behaviour is right:
 *   202 — accepted (deploy queued, a ping, or deliberately ignored)
 *   401 — the signature did not verify; GitHub may be misconfigured
 *   503 — the deployment has no webhook secret configured, so nothing can be
 *          trusted; a 200 here would let an unverified push look successful
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim();
  if (!secret) {
    // Fail closed. An endpoint that answers 200 without a secret is a build
    // trigger for anyone who finds the URL.
    logger.error({}, "[deploy] webhook received but GITHUB_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { ok: false, error: "webhook secret is not configured" },
      { status: 503 },
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (err) {
    logger.error({ err }, "[deploy] could not read webhook body");
    return NextResponse.json({ ok: false, error: "unreadable body" }, { status: 400 });
  }

  try {
    const result = await handleWebhook({
      rawBody,
      signature: request.headers.get(SIGNATURE_HEADER),
      event: request.headers.get("x-github-event"),
      deliveryId: request.headers.get("x-github-delivery"),
      secret,
    });

    if (!result.accepted) {
      return NextResponse.json(
        { ok: false, outcome: result.plan.outcome, reason: result.plan.reason },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        outcome: result.plan.outcome,
        queued: result.queued,
        duplicate: result.duplicate,
      },
      { status: 202 },
    );
  } catch (err) {
    // A 500 tells GitHub to retry, which is right for an unexpected failure.
    logger.error({ err }, "[deploy] webhook handling threw");
    return NextResponse.json({ ok: false, error: "internal error" }, { status: 500 });
  }
}
