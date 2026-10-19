import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Where this system is mounted.
 *
 * Standalone it is `/clinicos`. When the platform runs an organization's own
 * copy, the process is started with `SYSTEM_BASE_PATH=/{org}/clinicos` so the
 * customer's URL, this app's links and its asset URLs are all the same thing.
 *
 * This has to be read here rather than hardcoded: Next bakes `basePath` into
 * the build, so a literal path would serve every clone at a path its own proxy
 * does not forward to, and every page and `/_next/static` request would 404.
 *
 * The platform's `systemContract` refuses to install a system whose build
 * config does not read `SYSTEM_BASE_PATH`.
 */
const basePath = process.env.SYSTEM_BASE_PATH ?? "/clinicos";

/**
 * The same mount, for the browser half.
 *
 * `basePath` above is what Next prefixes to links and asset URLs; this is what
 * the app's own code reads (`lib/pwa.ts`) to build the manifest's `id`,
 * `scope`, `start_url` and icon URLs, to register its own service worker, and
 * to point the auth client at its own `/api/auth`. Nothing normalizes those by
 * hand, and they are all compiled into the client bundle, so a divergence here
 * is a manifest scoped to "/" — an installed app that opens the platform home
 * and fetches the platform's icons.
 *
 * The platform's supervisor already sets both to the org's mount, so this is a
 * no-op for an installed copy. It exists for the standalone run (`npm run dev`,
 * or a build with no `SYSTEM_BASE_PATH`), where nothing else supplies it and
 * the app would otherwise be built for `/clinicos` while its client half
 * assumed the origin root.
 */
process.env.NEXT_PUBLIC_BASE_PATH ??= basePath;

// This app is a standalone project nested inside the ERP repo, so Turbopack
// used to walk up, find the ERP package-lock.json as well as its own, and infer
// the ERP as the workspace root. Pin the root to this folder so file watching
// and module resolution stay inside the app that is actually running.
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  basePath,
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
};

export default withNextIntl(nextConfig);
