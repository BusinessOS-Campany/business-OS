/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/hospital",
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
    // Trim unused exports from large barrel packages to shrink client bundles.
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
    // Keep recently visited dynamic routes in the client router cache so
    // back/forward and repeat navigation is instant instead of refetching.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;