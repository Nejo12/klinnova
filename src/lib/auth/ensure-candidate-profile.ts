import "server-only";

import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { displayNameSchema } from "@/lib/auth/schemas";
import type { Database } from "@/types/database";

export type EnsureCandidateProfileResult =
  | { ok: true; created: boolean; userId: string; displayName: string }
  | {
      ok: false;
      error: string;
      reason: "unauthenticated" | "profile" | "failed";
    };

type CandidateClient = SupabaseClient<Database>;

/** Prefer user_metadata.display_name; no silent invented names. */
export function resolveDisplayName(
  metadata: User["user_metadata"] | undefined,
): string | null {
  const fromMeta = metadata?.["display_name"];
  if (typeof fromMeta === "string") {
    const trimmed = fromMeta.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return null;
}

/**
 * Idempotent application-controlled profile creation (D-024).
 * Authenticates via getUser(); never accepts a client-supplied user id.
 * Select-then-insert; never overwrites an existing row.
 */
export async function ensureCandidateProfile(
  supabase: CandidateClient,
): Promise<EnsureCandidateProfileResult> {
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
    .from("candidate_profiles")
    .select("id, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    return {
      ok: false,
      error: "Could not load your candidate profile.",
      reason: "failed",
    };
  }

  if (existing !== null) {
    return {
      ok: true,
      created: false,
      userId: existing.id,
      displayName: existing.display_name,
    };
  }

  const resolvedName = resolveDisplayName(user.user_metadata);
  const parsedName = displayNameSchema.safeParse(resolvedName ?? "");
  if (!parsedName.success) {
    return {
      ok: false,
      error:
        "Your account needs a display name before you can continue. Register again with a display name.",
      reason: "profile",
    };
  }

  // Omit server-owned timestamps; leave progressive fields null / default arrays.
  const { error: insertError } = await supabase
    .from("candidate_profiles")
    .insert({
      id: user.id,
      display_name: parsedName.data,
    });

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: raced } = await supabase
        .from("candidate_profiles")
        .select("id, display_name")
        .eq("id", user.id)
        .maybeSingle();

      if (raced !== null) {
        return {
          ok: true,
          created: false,
          userId: raced.id,
          displayName: raced.display_name,
        };
      }
    }

    return {
      ok: false,
      error: "Could not create your candidate profile.",
      reason: "failed",
    };
  }

  return {
    ok: true,
    created: true,
    userId: user.id,
    displayName: parsedName.data,
  };
}
