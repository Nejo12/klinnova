import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {};

/**
 * Source-map upload only runs when SENTRY_ORG/SENTRY_PROJECT/
 * SENTRY_AUTH_TOKEN are present (hosted Sentry activation, M5.1 Unit G2 —
 * not yet done). Without them, the Sentry Next.js build plugin skips
 * upload and next.config.ts falls back to the plain config unchanged; it
 * does not fail the build. `authToken` must never be a NEXT_PUBLIC_*
 * value — it is build-time only.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
