export type SentryEnvironment = "preview" | "production" | "development";

const ALLOWED_SENTRY_ENVIRONMENTS: readonly string[] = [
  "preview",
  "production",
  "development",
];

/**
 * Derives the Sentry environment tag from Vercel's own VERCEL_ENV /
 * NEXT_PUBLIC_VERCEL_ENV value only (M5.1 Unit G, G5) — never used to alter
 * application/product/auth/data behavior, Sentry telemetry config only.
 * Falls back to "development" for any unset or unrecognized value, so a
 * missing or misconfigured Vercel environment signal never silently
 * mislabels an event as "production".
 */
export function resolveSentryEnvironment(
  vercelEnv: string | undefined,
): SentryEnvironment {
  if (
    vercelEnv !== undefined &&
    ALLOWED_SENTRY_ENVIRONMENTS.includes(vercelEnv)
  ) {
    return vercelEnv as SentryEnvironment;
  }
  return "development";
}
