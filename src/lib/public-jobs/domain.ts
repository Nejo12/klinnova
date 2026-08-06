import type {
  PublicVacancyLanguageRow,
  PublicVacancyRow,
} from "@/lib/public-jobs/schemas";

export type PublicVacancy = {
  vacancyId: string;
  title: string;
  description: string | null;
  jobCategory: PublicVacancyRow["job_category"];
  publicLocality: string | null;
  workplaceType: PublicVacancyRow["workplace_type"];
  workFrequency: PublicVacancyRow["work_frequency"];
  cvRequired: boolean | null;
  interviewEnglishOk: boolean | null;
  source: "seed" | "employer";
  employerDisplayName: string | null;
  companyName: string | null;
  website: string | null;
  expiresAt: string;
};

export type PublicVacancyLanguage = {
  languageCode: PublicVacancyLanguageRow["language_code"];
  minProficiency: PublicVacancyLanguageRow["min_proficiency"];
};

/** `published_at` is intentionally omitted — not part of this PR's approved
 * public rendering field list. */
export function mapPublicVacancy(row: PublicVacancyRow): PublicVacancy {
  return {
    vacancyId: row.vacancy_id,
    title: row.title,
    description: row.description,
    jobCategory: row.job_category,
    publicLocality: row.public_locality,
    workplaceType: row.workplace_type,
    workFrequency: row.work_frequency,
    cvRequired: row.cv_required,
    interviewEnglishOk: row.interview_english_ok,
    source: row.source,
    employerDisplayName: row.employer_display_name,
    companyName: row.company_name,
    website: row.website,
    expiresAt: row.expires_at,
  };
}

export function mapPublicVacancyLanguage(
  row: PublicVacancyLanguageRow,
): PublicVacancyLanguage {
  return {
    languageCode: row.language_code,
    minProficiency: row.min_proficiency,
  };
}
