import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// This app is a standalone project nested inside the ERP repo, so Turbopack
// used to walk up, find the ERP package-lock.json as well as its own, and infer
// the ERP as the workspace root. Pin the root to this folder so file watching
// and module resolution stay inside the app that is actually running.
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Must match `rootPath` for slug "clinicos" in the platform registry
  // (src/core/demo/demo-systems.ts), which derives it from sourceDir. A sub-app
  // serves itself at whatever basePath it was built with, so if the platform
  // rewrote a different path here every in-app link would 404.
  //
  // A literal rather than the `SYSTEM_BASE_PATH ?? …` read the installable
  // system uses: the demo is only ever served at this one mount, and the
  // platform's mount-path test requires the literal here.
  basePath: "/demo/clinicos",
  turbopack: {
    root: projectRoot,
  },
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  experimental: {
    // Keep visited route segments in the client router cache so a second visit
    // renders instantly instead of re-paying the server round trip.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/reports/**": ["./node_modules/@sparticuz/chromium/**"],
  },
  async headers() {
    return [
      {
        // Service worker updates must never be served stale by the browser.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-store, no-cache, must-revalidate" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
