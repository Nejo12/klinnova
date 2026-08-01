import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/env/public";

/**
 * Browser Supabase client factory.
 * Unused by product UI in PR 0.3; available for later slices.
 */
export function createBrowserSupabaseClient() {
  const env = getPublicEnv();

  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
