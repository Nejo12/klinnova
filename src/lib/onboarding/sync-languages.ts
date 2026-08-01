import { type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type LanguageEntry = {
  languageCode: string;
  proficiency: string;
};

/**
 * Diff-based language sync under owner RLS.
 * Inserts/updates first, then deletes removed codes, so a failed insert
 * cannot wipe existing languages.
 */
export async function syncCandidateLanguages(
  supabase: SupabaseClient<Database>,
  candidateId: string,
  next: readonly LanguageEntry[],
): Promise<{ ok: true } | { ok: false }> {
  const { data: existing, error: loadError } = await supabase
    .from("candidate_languages")
    .select("id, language_code, proficiency")
    .eq("candidate_id", candidateId);

  if (loadError !== null) {
    return { ok: false };
  }

  const existingRows = existing ?? [];
  const nextByCode = new Map(
    next.map((entry) => [entry.languageCode, entry.proficiency]),
  );
  const existingByCode = new Map(
    existingRows.map((row) => [row.language_code, row]),
  );
  const now = new Date().toISOString();

  for (const [code, proficiency] of nextByCode) {
    const current = existingByCode.get(code);
    if (current === undefined) {
      const { error } = await supabase.from("candidate_languages").insert({
        candidate_id: candidateId,
        language_code: code,
        proficiency,
        updated_at: now,
      });
      if (error !== null) {
        return { ok: false };
      }
      continue;
    }

    if (current.proficiency !== proficiency) {
      const { error } = await supabase
        .from("candidate_languages")
        .update({ proficiency, updated_at: now })
        .eq("id", current.id)
        .eq("candidate_id", candidateId);
      if (error !== null) {
        return { ok: false };
      }
    }
  }

  for (const row of existingRows) {
    if (!nextByCode.has(row.language_code)) {
      const { error } = await supabase
        .from("candidate_languages")
        .delete()
        .eq("id", row.id)
        .eq("candidate_id", candidateId);
      if (error !== null) {
        return { ok: false };
      }
    }
  }

  return { ok: true };
}
