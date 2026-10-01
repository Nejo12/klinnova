import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export async function loadCandidateDisplayName(
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  if (
    supabase == null ||
    typeof supabase.auth?.getUser !== "function" ||
    typeof supabase.from !== "function"
  ) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    return null;
  }

  const { data, error } = await supabase
    .from("candidate_profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error !== null || data === null) {
    return null;
  }

  return data.display_name;
}
