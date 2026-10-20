import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
    formats: ["image/avif"],
  },
  experimental: {
    proxyClientMaxBodySize: 15728640,
  },
};

export default nextConfig;
