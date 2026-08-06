import { describe, expect, it } from "vitest";

import {
  mapPublicVacancy,
  mapPublicVacancyLanguage,
} from "@/lib/public-jobs/domain";
import type { PublicVacancyRow } from "@/lib/public-jobs/schemas";

const fullRow: PublicVacancyRow = {
  vacancy_id: "11111111-1111-4111-8111-111111111111",
  title: "Evening cleaner",
  description: "Two hours, weekday evenings.",
  job_category: "cleaning",
  public_locality: "Mitte",
  workplace_type: "private_home",
  work_frequency: "recurring",
  cv_required: false,
  interview_english_ok: true,
  source: "employer",
  employer_type: "private",
  employer_display_name: "Ada Lovelace",
  company_name: null,
  website: "https://example.test",
  published_at: "2026-08-01T00:00:00Z",
  expires_at: "2026-09-01T00:00:00Z",
};

const nullableRow: PublicVacancyRow = {
  vacancy_id: "22222222-2222-4222-8222-222222222222",
  title: "Warehouse picker",
  description: null,
  job_category: "warehousing",
  public_locality: null,
  workplace_type: null,
  work_frequency: null,
  cv_required: null,
  interview_english_ok: null,
  source: "seed",
  employer_type: null,
  employer_display_name: "Demo Logistics GmbH",
  company_name: "Demo Logistics GmbH",
  website: null,
  published_at: "2026-08-01T00:00:00Z",
  expires_at: "2026-09-01T00:00:00Z",
};

describe("mapPublicVacancy", () => {
  it("copies every field for a full row", () => {
    expect(mapPublicVacancy(fullRow)).toEqual({
      vacancyId: fullRow.vacancy_id,
      title: fullRow.title,
      description: fullRow.description,
      jobCategory: fullRow.job_category,
      publicLocality: fullRow.public_locality,
      workplaceType: fullRow.workplace_type,
      workFrequency: fullRow.work_frequency,
      cvRequired: fullRow.cv_required,
      interviewEnglishOk: fullRow.interview_english_ok,
      source: fullRow.source,
      employerDisplayName: fullRow.employer_display_name,
      companyName: fullRow.company_name,
      website: fullRow.website,
      expiresAt: fullRow.expires_at,
    });
  });

  it("preserves null for every runtime-nullable field", () => {
    const mapped = mapPublicVacancy(nullableRow);
    expect(mapped.description).toBeNull();
    expect(mapped.publicLocality).toBeNull();
    expect(mapped.workplaceType).toBeNull();
    expect(mapped.workFrequency).toBeNull();
    expect(mapped.cvRequired).toBeNull();
    expect(mapped.interviewEnglishOk).toBeNull();
    expect(mapped.website).toBeNull();
    expect(mapped.companyName).toBe("Demo Logistics GmbH");
  });
});

describe("mapPublicVacancyLanguage", () => {
  it("copies language fields", () => {
    expect(
      mapPublicVacancyLanguage({
        language_code: "en",
        min_proficiency: "basic",
      }),
    ).toEqual({ languageCode: "en", minProficiency: "basic" });
  });
});
