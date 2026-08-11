import * as Sentry from "@sentry/nextjs";

/**
 * No `sentry.edge.config.ts`/edge branch here (M5.1 Unit G): Next.js 16's
 * Proxy runtime is fixed to `nodejs` and cannot be configured to Edge
 * (confirmed against Next.js's own current upgrade docs), and this app has
 * no Edge Route Handlers. If either changes, add the edge config + branch
 * back at that point — not preemptively.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
}

/**
 * Captures errors from Server Components, Server Actions, route handlers,
 * and `src/proxy.ts` (Next.js's own `onRequestError` hook — this is the
 * one instrumentation point that gets everything not caught by
 * `error.tsx`/`global-error.tsx`, and the account-deletion processor's own
 * manual `Sentry.captureException` call, see M5.1 Unit G, G4).
 */
export const onRequestError = Sentry.captureRequestError;
