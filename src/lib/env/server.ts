import "server-only";

import { getPublicEnv, type PublicEnv } from "@/lib/env/public";

/**
 * Server env for Slice 0 equals public Supabase values.
 * Privileged secrets are deferred until a product feature requires them.
 */
export type ServerEnv = PublicEnv;

/** Server-only env access. Never import from Client Components. */
export function getServerEnv(): ServerEnv {
  return getPublicEnv();
}

/** Fail-fast entrypoint for server layouts and other server entry modules. */
export function assertServerEnv(): ServerEnv {
  return getServerEnv();
}
