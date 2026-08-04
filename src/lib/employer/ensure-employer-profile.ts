import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { EmployerType } from "@/lib/employer/schemas";
import type { Database } from "@/types/database";

export type EnsureEmployerProfileResult =
  | {
      ok: true;
      created: boolean;
      userId: string;
      employerType: EmployerType;
    }
  | {
      ok: false;
      error: string;
      reason: "unauthenticated" | "type_locked" | "failed";
    };

type EmployerClient = SupabaseClient<Database>;

/**
 * Idempotent employer profile creation/type selection for the session user.
 * Never accepts a client-supplied user id. Does not write server-owned columns.
 */
export async function ensureEmployerProfile(
  supabase: EmployerClient,
  employerType: EmployerType,
): Promise<EnsureEmployerProfileResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return {
      ok: false,
      error: "You must be signed in to continue.",
      reason: "unauthenticated",
    };
  }

  const { data: existing, error: selectError } = await supabase
    .from("employer_profiles")
    .select("id, employer_type, onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    return {
      ok: false,
      error: "Could not load your employer profile.",
      reason: "failed",
    };
  }

  if (existing === null) {
    const { error: insertError } = await supabase
      .from("employer_profiles")
      .insert({
        id: user.id,
        employer_type: employerType,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: raced } = await supabase
          .from("employer_profiles")
          .select("id, employer_type")
          .eq("id", user.id)
          .maybeSingle();

        if (raced !== null) {
          return {
            ok: true,
            created: false,
            userId: raced.id,
            employerType: raced.employer_type as EmployerType,
          };
        }
      }

      return {
        ok: false,
        error: "Could not create your employer profile.",
        reason: "failed",
      };
    }

    return {
      ok: true,
      created: true,
      userId: user.id,
      employerType,
    };
  }

  if (existing.employer_type === employerType) {
    return {
      ok: true,
      created: false,
      userId: existing.id,
      employerType,
    };
  }

  const { error: updateError } = await supabase
    .from("employer_profiles")
    .update({
      employer_type: employerType,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    if (
      updateError.code === "23514" ||
      updateError.message.includes("employer_type_locked")
    ) {
      return {
        ok: false,
        error: "Your employer type can no longer be changed for this account.",
        reason: "type_locked",
      };
    }

    return {
      ok: false,
      error: "Could not update your employer type.",
      reason: "failed",
    };
  }

  return {
    ok: true,
    created: false,
    userId: existing.id,
    employerType,
  };
}
