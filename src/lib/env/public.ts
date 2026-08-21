import { z } from "zod";

import { formatEnvError } from "@/lib/env/format-error";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  /** Optional canonical site origin for Auth email redirects (e.g. https://klinnova.com). */
  NEXT_PUBLIC_SITE_URL: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim().length === 0
        ? undefined
        : value,
    z.string().url().optional(),
  ),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cachedPublicEnv: PublicEnv | undefined;

function readPublicEnv(): PublicEnv {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    throw new Error(formatEnvError(parsed.error));
  }

  return parsed.data;
}

/** Browser-safe env. Safe to import from Client Components. */
export function getPublicEnv(): PublicEnv {
  if (cachedPublicEnv === undefined) {
    cachedPublicEnv = readPublicEnv();
  }

  return cachedPublicEnv;
}

/** Test helper: clear cached env between Vitest cases. */
export function resetPublicEnvCache(): void {
  cachedPublicEnv = undefined;
}
