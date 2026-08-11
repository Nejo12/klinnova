import * as Sentry from "@sentry/nextjs";

import { resolveSentryEnvironment } from "@/lib/observability/sentry-environment";
import {
  scrubBreadcrumb,
  scrubSentryEvent,
} from "@/lib/observability/sentry-scrub";

/**
 * Browser Sentry init — M5.1 Unit G. Mirrors src/sentry.server.config.ts's
 * privacy boundary exactly; see that file's comment for the full rationale.
 *
 * Reads NEXT_PUBLIC_VERCEL_ENV (not VERCEL_ENV, which is server-only and
 * never reaches the browser bundle) — Vercel's own docs list this as a
 * standard Next.js framework environment variable available at both build
 * and runtime with no separate opt-in for a recognized Next.js project;
 * confirm this is actually populated during G2 hosted activation
 * regardless. If unset, resolveSentryEnvironment falls back to
 * "development" rather than guessing "production".
 *
 * No `Sentry.replayIntegration()`, no `Sentry.feedbackIntegration()`, no
 * `integrations` array at all — nothing beyond the SDK's own baseline
 * error-capture integrations is added.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: resolveSentryEnvironment(process.env.NEXT_PUBLIC_VERCEL_ENV),
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  tracesSampleRate: 0,
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

/**
 * Required navigation-instrumentation hook the SDK expects from this file
 * (a build-time "ACTION REQUIRED" warning otherwise). This does not send
 * performance data on its own — tracesSampleRate: 0 above means no
 * transaction is ever sampled/sent — it only feeds "navigation" breadcrumbs
 * through the same scrubbed beforeBreadcrumb pipeline.
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
