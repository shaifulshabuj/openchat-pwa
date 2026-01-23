import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Conditionally enable static export for GitHub Pages deployment
  // Dynamic routes need generateStaticParams() for static export
  output: process.env.STATIC_EXPORT === 'true' ? 'export' : undefined,
  trailingSlash: process.env.STATIC_EXPORT === 'true',
  basePath: process.env.STATIC_EXPORT === 'true' ? '/openchat-pwa' : '',
  assetPrefix: process.env.STATIC_EXPORT === 'true' ? '/openchat-pwa' : '',
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
