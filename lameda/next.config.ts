import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/register',
        destination: '/onboard',
        permanent: true,
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT ?? 'lameda',
  // Suppress Sentry CLI output on local builds; CI gets full output
  silent: !process.env.CI,
  // Upload source maps to Sentry but delete them from the deployed bundle
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  // Route Sentry events through /monitoring to avoid ad-blocker drops
  tunnelRoute: '/monitoring',
  // Disable Sentry logger to reduce bundle size
  disableLogger: true,
  // Sentry's webpack plugin conflicts with Turbopack middleware output and
  // prevents middleware.js.nft.json from being written to the expected path.
  // Disable automatic middleware instrumentation to avoid this.
  autoInstrumentMiddleware: false,
})
