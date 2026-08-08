import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { formatEnvError } from "@/lib/env/format-error";
import { getPublicEnv } from "@/lib/env/public";
import type { Database } from "@/types/database";

const privilegedEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

/**
 * D-080 privileged Auth Admin client. Never exported outside this module —
 * the account-deletion processor (`processor.ts`) is the only intended
 * caller. Fails closed when the service-role secret is absent; never falls
 * back to the publishable/anon key or an ordinary session client.
 */
export function createPrivilegedDeletionClient() {
  const parsed = privilegedEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!parsed.success) {
    throw new Error(formatEnvError(parsed.error));
  }

  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();

  return createClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    parsed.data.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
