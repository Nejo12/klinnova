import * as Sentry from "@sentry/nextjs";

import { resolveSentryEnvironment } from "@/lib/observability/sentry-environment";
import {
  scrubBreadcrumb,
  scrubSentryEvent,
} from "@/lib/observability/sentry-scrub";

/**
 * Server-runtime (Node.js) Sentry init — M5.1 Unit G. No hosted DSN exists
 * yet (G2, not authorized); `Sentry.init` with an unset `dsn` no-ops
 * (validated locally without one), so this file is safe to ship ahead of
 * hosted activation.
 *
 * Privacy boundary (D-M5-5 / Unit G discovery, all explicit rather than
 * relying on SDK defaults):
 * - error monitoring only — tracesSampleRate/profileSessionSampleRate: 0
 * - sendDefaultPii: false, and dataCollection explicitly narrowed too,
 *   since dataCollection's own defaults collect broadly regardless of
 *   sendDefaultPii once dataCollection is the primary control (current
 *   Sentry docs) — stackFrameVariables is turned off deliberately, since
 *   local-variable capture is a real path for secrets (DB clients, API
 *   keys) to leak from a caught exception's stack frame.
 * - no Session Replay, no PostHog, no product analytics, no Sentry Logs
 *   product (enableLogs: false)
 * - beforeSend/beforeBreadcrumb wired to the tested scrubbers in
 *   src/lib/observability/sentry-scrub.ts
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: resolveSentryEnvironment(process.env.VERCEL_ENV),
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  tracesSampleRate: 0,
  profileSessionSampleRate: 0,
  enableLogs: false,

  sendDefaultPii: false,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { request: false, response: false },
    httpBodies: [],
    urlQueryParams: false,
    stackFrameVariables: false,
  },

  beforeSend: (event) => scrubSentryEvent(event),
  beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
});
