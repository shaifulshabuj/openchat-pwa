import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed static export for development to support dynamic routes
  // output: 'export',
  // trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // PWA config will be added via next-pwa
  experimental: {
    typedRoutes: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001',
    NEXT_PUBLIC_APP_NAME: 'OpenChat PWA',
  },
};

export default nextConfig;
