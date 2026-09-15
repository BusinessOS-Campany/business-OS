import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  register: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    const groceryUrl = process.env.GROCERY_URL ?? "http://localhost:3101";
    const samaWebUrl = process.env.SAMA_WEB_URL ?? "http://localhost:3102";
    const samaApiUrl = process.env.SAMA_API_URL ?? "http://localhost:3103";
    const celiaUrl = process.env.CELIA_URL ?? "http://localhost:3104";
    const hospitalUrl = process.env.HOSPITAL_URL ?? "http://localhost:3105";
    return {
      beforeFiles: [
        {
          // The standalone grocery demo app (public/muafa-store-main) lives at
          // /grocery (basePath in its next.config.ts) and is reverse-proxied
          // same-origin. Exact root first so the empty :path* below does not
          // send /grocery to a trailing-slash URL (downstream 308-loops).
          source: "/grocery",
          destination: `${groceryUrl}/grocery`,
        },
        {
          source: "/grocery/:path*",
          destination: `${groceryUrl}/grocery/:path*`,
        },
        {
          // SAMA Center (Vite SPA + Express API) demo. API first so it is not
          // swallowed by the SPA catch-all below.
          source: "/sama/api/:path*",
          destination: `${samaApiUrl}/api/:path*`,
        },
        {
          // SAMA Vite dev server serves the SPA under its own /sama base.
          source: "/sama/:path*",
          destination: `${samaWebUrl}/sama/:path*`,
        },
        {
          // Celia internet-cafe system (standalone Next app in
          // public/celia-main, basePath /celia, port 3104). Pages and
          // better-auth/api routes all live under the same basePath, so one
          // rewrite covers both. Exact root first to avoid the trailing-slash
          // 308-loop described above.
          source: "/celia",
          destination: `${celiaUrl}/celia`,
        },
        {
          source: "/celia/:path*",
          destination: `${celiaUrl}/celia/:path*`,
        },
        {
          // YemenCare HMS (standalone Next app in
          // public/Hospital--main, basePath /hospital, port 3105).
          source: "/hospital",
          destination: `${hospitalUrl}/hospital`,
        },
        {
          source: "/hospital/:path*",
          destination: `${hospitalUrl}/hospital/:path*`,
        },
      ],
    };
  },
};

export default withSerwist(nextConfig);
