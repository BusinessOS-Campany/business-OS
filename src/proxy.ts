import { NextResponse, type NextRequest } from "next/server";

/**
 * Security headers applied to every response. CSP is report-only in
 * development so it doesn't block inline scripts from dev tooling.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "0",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

/* Domains required by the Sketchfab 3D-model viewer embed */
const SKETCHFAB = [
  "sketchfab.com",
  "*.sketchfab.com",
  "static.sketchfab.com",
  "*.static.sketchfab.com",
  "*.s3.amazonaws.com",
  "*.cloudfront.net",
].join(" ");
const FRAME_SRC = [
  "sketchfab.com",
  "*.sketchfab.com",
  "static.sketchfab.com",
  "*.static.sketchfab.com",
].join(" ");

const CSP_DIRECTIVES = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${SKETCHFAB}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${SKETCHFAB}`,
  "font-src 'self' data:",
  `connect-src 'self' ${SKETCHFAB}`,
  `frame-src 'self' ${FRAME_SRC}`,
  `child-src ${FRAME_SRC}`,
  `worker-src 'self' ${FRAME_SRC}`,
  "base-uri 'self'",
  "form-action 'self'",
  "media-src 'self' blob:",
].join("; ");

/**
 * Edge middleware (Next.js 16 `proxy` convention — replaces legacy
 * middleware.ts). Attaches/propagates a request id, sets security headers.
 */
export function proxy(request: NextRequest) {
  const requestId =
    request.headers.get("x-request-id") ??
    globalThis.crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  const isDev = process.env.NODE_ENV === "development";
  response.headers.set(
    "Content-Security-Policy",
    isDev ? `${CSP_DIRECTIVES}; report-uri /api/csp-report` : CSP_DIRECTIVES,
  );

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
