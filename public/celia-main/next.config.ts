import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/celia",
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 60,
    },
  },
};

export default nextConfig;
