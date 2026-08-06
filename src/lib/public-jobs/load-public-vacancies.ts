import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapPublicVacancy,
  mapPublicVacancyLanguage,
  type PublicVacancy,
  type PublicVacancyLanguage,
} from "@/lib/public-jobs/domain";
import {
  publicVacancyLanguageListSchema,
  publicVacancyListRowsSchema,
  publicVacancyRowSchema,
} from "@/lib/public-jobs/schemas";
import type { Database } from "@/types/database";

export type PublicVacancyListItem = {
  vacancy: PublicVacancy;
  languages: PublicVacancyLanguage[];
};

export type LoadPublicVacanciesResult =
  { ok: true; vacancies: PublicVacancyListItem[] } | { ok: false };

/**
 * Public list loader. Uses only `list_effective_public_vacancies()` and
 * `get_effective_public_vacancy_languages(uuid)` — no direct table read.
 * One malformed row is dropped, not fatal to the whole list. RPC ordering
 * (`published_at DESC, vacancy_id ASC`) is preserved; never re-sorted here.
 */
export async function loadPublicVacancies(
  supabase: SupabaseClient<Database>,
): Promise<LoadPublicVacanciesResult> {
  const { data, error } = await supabase.rpc("list_effective_public_vacancies");
  if (error !== null) {
    return { ok: false };
  }

  const parsedRows = publicVacancyListRowsSchema.safeParse(data);
  if (!parsedRows.success) {
    return { ok: false };
  }

  const vacancies: PublicVacancyListItem[] = [];
  for (const rawRow of parsedRows.data) {
    const parsedRow = publicVacancyRowSchema.safeParse(rawRow);
    if (!parsedRow.success) {
      continue;
    }
    const vacancy = mapPublicVacancy(parsedRow.data);

    const { data: langData, error: langError } = await supabase.rpc(
      "get_effective_public_vacancy_languages",
      { p_vacancy_id: vacancy.vacancyId },
    );
    if (langError !== null) {
      return { ok: false };
    }
    const parsedLanguages = publicVacancyLanguageListSchema.safeParse(langData);
    if (!parsedLanguages.success) {
      return { ok: false };
    }

    vacancies.push({
      vacancy,
      languages: parsedLanguages.data.map(mapPublicVacancyLanguage),
    });
  }

  return { ok: true, vacancies };
}
