import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  loadEmployerProfile,
  type EmployerProfileData,
} from "@/lib/employer/load-employer";
import type { Database } from "@/types/database";

export type CompletedEmployerGate =
  | {
      ok: true;
      supabase: SupabaseClient<Database>;
      userId: string;
      profile: EmployerProfileData;
    }
  | {
      ok: false;
      reason: "unauthenticated" | "incomplete" | "failed";
      error: string;
    };

/**
 * Authenticate and require a completed employer profile for vacancy routes/actions.
 */
export async function requireCompletedEmployer(
  supabase: SupabaseClient<Database>,
): Promise<CompletedEmployerGate> {
  const loaded = await loadEmployerProfile(supabase);

  if (!loaded.ok) {
    return {
      ok: false,
      reason:
        loaded.reason === "unauthenticated" ? "unauthenticated" : "failed",
      error: loaded.error,
    };
  }

  if (loaded.data === null || loaded.data.onboardingCompletedAt === null) {
    return {
      ok: false,
      reason: "incomplete",
      error: "Finish employer onboarding before managing vacancy drafts.",
    };
  }

  return {
    ok: true,
    supabase,
    userId: loaded.userId,
    profile: loaded.data,
  };
}
