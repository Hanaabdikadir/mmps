import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: ["172.20.10.2", "localhost"],
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [{ source: "/api/livestock", destination: "/api/livestock/prices" }];
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
  images: {
    qualities: [70, 75, 80, 85, 90, 95, 100],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "ichef.bbci.co.uk", pathname: "/**" },
      { protocol: "https", hostname: "radioergo.org", pathname: "/**" },
    ],
  },
};

export default nextConfig;
