import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Using standard build for dynamic routes, not static export
  // output: 'export',
  // trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // PWA config will be added via next-pwa
  typedRoutes: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001',
    NEXT_PUBLIC_APP_NAME: 'OpenChat PWA',
  },
}

export default nextConfig
