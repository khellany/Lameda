import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const nextConfig: NextConfig = {
  /* config options here */
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
})
