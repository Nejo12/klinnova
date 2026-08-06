import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  mapPublicVacancy,
  mapPublicVacancyLanguage,
  type PublicVacancy,
  type PublicVacancyLanguage,
} from "@/lib/public-jobs/domain";
import {
  publicVacancyLanguageListSchema,
  publicVacancyRowSchema,
} from "@/lib/public-jobs/schemas";
import type { Database } from "@/types/database";

const vacancyIdSchema = z.string().uuid();

export type LoadPublicVacancyDetailResult =
  | {
      status: "ready";
      vacancy: PublicVacancy;
      languages: PublicVacancyLanguage[];
    }
  | { status: "not_found" }
  | { status: "failure" };

/**
 * Public detail loader. Malformed UUID, unknown id, and every non-public
 * lifecycle/verification state are structurally indistinguishable — the RPC
 * itself returns zero rows for all of them (PR 5.5a), and this loader
 * collapses malformed-input and zero-row cases to the same `not_found`
 * result so the route can call `notFound()` uniformly with no existence
 * oracle.
 */
export async function loadPublicVacancyDetail(
  supabase: SupabaseClient<Database>,
  vacancyId: string,
): Promise<LoadPublicVacancyDetailResult> {
  const parsedId = vacancyIdSchema.safeParse(vacancyId);
  if (!parsedId.success) {
    return { status: "not_found" };
  }

  const { data, error } = await supabase.rpc("get_effective_public_vacancy", {
    p_vacancy_id: parsedId.data,
  });
  if (error !== null) {
    return { status: "failure" };
  }
  if (!Array.isArray(data) || data.length === 0) {
    return { status: "not_found" };
  }

  const parsedRow = publicVacancyRowSchema.safeParse(data[0]);
  if (!parsedRow.success) {
    return { status: "not_found" };
  }

  const { data: langData, error: langError } = await supabase.rpc(
    "get_effective_public_vacancy_languages",
    { p_vacancy_id: parsedId.data },
  );
  if (langError !== null) {
    return { status: "failure" };
  }
  const parsedLanguages = publicVacancyLanguageListSchema.safeParse(langData);
  if (!parsedLanguages.success) {
    return { status: "failure" };
  }

  return {
    status: "ready",
    vacancy: mapPublicVacancy(parsedRow.data),
    languages: parsedLanguages.data.map(mapPublicVacancyLanguage),
  };
}
