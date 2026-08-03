import { describe, expect, it, vi } from "vitest";

import {
  loadCandidateVacancyDetail,
  type CandidateVacancyDetailDataAccess,
} from "@/lib/matching/load-candidate-vacancy-detail";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const VACANCY_ID = "22222222-2222-4222-8222-222222222201";

const completeProfile = {
  display_name: "Ada Candidate",
  city: "Berlin" as const,
  german_comfort: "comfortable" as const,
  work_authorisation_declared: true,
  job_categories: ["hospitality"],
  employment_types: ["part_time"],
  shift_preferences: ["flexible"],
  available_from: "2026-08-01",
  onboarding_completed_at: "2026-07-01T12:00:00+00:00",
};

const incompleteProfile = {
  ...completeProfile,
  onboarding_completed_at: null,
};

const vacancyRow = {
  id: VACANCY_ID,
  title: "Demo vacancy — Morning kitchen support",
  slug: "demo-morning-kitchen-support",
  city: "Berlin",
  job_category: "hospitality",
  employment_types: ["part_time", "mini_job"],
  shift_requirements: ["morning", "daytime"],
  german_requirement: "basic",
  available_from: null,
  published_at: "2026-01-15T09:00:00+00:00",
  expires_at: "2027-12-31T23:59:59+00:00",
  source: "seed",
  publication_state: "published",
  companies: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Demo Berlin Work Co",
    slug: "demo-berlin-work-co",
    source: "seed",
  },
};

function createAccess(
  overrides: Partial<CandidateVacancyDetailDataAccess> = {},
): CandidateVacancyDetailDataAccess {
  return {
    getUserId: vi.fn().mockResolvedValue(USER_ID),
    loadCandidateProfile: vi.fn().mockResolvedValue({
      ok: true,
      profile: completeProfile,
    }),
    loadCandidateLanguages: vi.fn().mockResolvedValue({
      ok: true,
      languages: [{ language_code: "en", proficiency: "native" }],
    }),
    loadVisibleVacancyById: vi.fn().mockResolvedValue({
      ok: true,
      vacancy: vacancyRow,
    }),
    loadVisibleLanguageRequirementsForVacancy: vi.fn().mockResolvedValue({
      ok: true,
      requirements: [
        {
          vacancy_id: VACANCY_ID,
          language_code: "en",
          min_proficiency: "basic",
        },
      ],
    }),
    loadOwnedApplicationForVacancy: vi.fn().mockResolvedValue({
      ok: true,
      application: null,
    }),
    ...overrides,
  };
}

describe("loadCandidateVacancyDetail", () => {
  it("returns unavailable for malformed vacancy IDs without querying", async () => {
    const access = createAccess();
    const result = await loadCandidateVacancyDetail("not-a-uuid", access);

    expect(result).toEqual({ status: "unavailable" });
    expect(access.getUserId).not.toHaveBeenCalled();
    expect(access.loadVisibleVacancyById).not.toHaveBeenCalled();
  });

  it("returns unauthenticated and skips profile and vacancy loading", async () => {
    const access = createAccess({
      getUserId: vi.fn().mockResolvedValue(null),
    });

    const result = await loadCandidateVacancyDetail(VACANCY_ID, access);
    expect(result).toEqual({ status: "unauthenticated" });
    expect(access.loadCandidateProfile).not.toHaveBeenCalled();
    expect(access.loadVisibleVacancyById).not.toHaveBeenCalled();
  });

  it("returns profile_missing and skips vacancy loading", async () => {
    const access = createAccess({
      loadCandidateProfile: vi.fn().mockResolvedValue({
        ok: false,
        reason: "missing",
      }),
    });

    const result = await loadCandidateVacancyDetail(VACANCY_ID, access);
    expect(result).toEqual({ status: "profile_missing" });
    expect(access.loadVisibleVacancyById).not.toHaveBeenCalled();
  });

  it("rejects incomplete candidates before vacancy queries", async () => {
    const access = createAccess({
      loadCandidateProfile: vi.fn().mockResolvedValue({
        ok: true,
        profile: incompleteProfile,
      }),
    });

    const result = await loadCandidateVacancyDetail(VACANCY_ID, access);
    expect(result).toEqual({ status: "incomplete" });
    expect(access.loadVisibleVacancyById).not.toHaveBeenCalled();
    expect(
      access.loadVisibleLanguageRequirementsForVacancy,
    ).not.toHaveBeenCalled();
  });

  it("returns unavailable when the vacancy is missing under RLS", async () => {
    const access = createAccess({
      loadVisibleVacancyById: vi.fn().mockResolvedValue({
        ok: false,
        reason: "missing",
      }),
    });

    const result = await loadCandidateVacancyDetail(VACANCY_ID, access);
    expect(result).toEqual({ status: "unavailable" });
  });

  it("returns ready for a current matching vacancy", async () => {
    const access = createAccess();
    const result = await loadCandidateVacancyDetail(VACANCY_ID, access);

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.detail.vacancyId).toBe(VACANCY_ID);
      expect(result.detail.title).toBe(
        "Demo vacancy — Morning kitchen support",
      );
      expect(result.detail.employerDisplayName).toBe("Demo Berlin Work Co");
      expect(result.detail.demoLabel).toBe("Demo vacancy");
      expect(result.detail.city).toBe("Berlin");
      expect(result.detail.languageRequirements).toEqual([
        {
          languageCode: "en",
          languageLabel: "English",
          minProficiencyLabel: "Basic",
        },
      ]);
      expect(result.detail.matchReasons.length).toBeGreaterThan(0);
      expect(result.detail.matchReasons.length).toBeLessThanOrEqual(4);
      expect(result.preview.candidateDisplayName).toBe("Ada Candidate");
      expect(result.preview.matchedJobCategoryLabel).toBe("Hospitality");
      expect(result.preview.vacancyId).toBe(VACANCY_ID);
      expect(result.application).toBeNull();
    }
    expect(access.loadVisibleVacancyById).toHaveBeenCalledWith(VACANCY_ID);
    expect(
      access.loadVisibleLanguageRequirementsForVacancy,
    ).toHaveBeenCalledWith(VACANCY_ID);
  });

  it("returns not_matching for a visible vacancy that fails the matcher", async () => {
    const access = createAccess({
      loadCandidateProfile: vi.fn().mockResolvedValue({
        ok: true,
        profile: {
          ...completeProfile,
          job_categories: ["moving"],
        },
      }),
    });

    const result = await loadCandidateVacancyDetail(VACANCY_ID, access);
    expect(result).toEqual({ status: "not_matching" });
  });

  it("maps database errors to safe load failures", async () => {
    const profileError = createAccess({
      loadCandidateProfile: vi.fn().mockResolvedValue({
        ok: false,
        reason: "error",
      }),
    });
    expect(await loadCandidateVacancyDetail(VACANCY_ID, profileError)).toEqual({
      status: "failure",
      reason: "load",
    });

    const vacancyError = createAccess({
      loadVisibleVacancyById: vi.fn().mockResolvedValue({
        ok: false,
        reason: "error",
      }),
    });
    expect(await loadCandidateVacancyDetail(VACANCY_ID, vacancyError)).toEqual({
      status: "failure",
      reason: "load",
    });
  });

  it("maps malformed vacancy data to invariant failure", async () => {
    const access = createAccess({
      loadVisibleVacancyById: vi.fn().mockResolvedValue({
        ok: true,
        vacancy: { ...vacancyRow, published_at: null },
      }),
    });

    expect(await loadCandidateVacancyDetail(VACANCY_ID, access)).toEqual({
      status: "failure",
      reason: "invariant",
    });
  });

  it("returns owned application summary when present", async () => {
    const access = createAccess({
      loadOwnedApplicationForVacancy: vi.fn().mockResolvedValue({
        ok: true,
        application: {
          id: "33333333-3333-4333-8333-333333333301",
          vacancy_id: VACANCY_ID,
          status: "submitted",
          submitted_at: "2026-08-03T14:30:00.000Z",
        },
      }),
    });

    const result = await loadCandidateVacancyDetail(VACANCY_ID, access);
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.application).toEqual({
        applicationId: "33333333-3333-4333-8333-333333333301",
        vacancyId: VACANCY_ID,
        status: "submitted",
        submittedAt: "2026-08-03T14:30:00.000Z",
      });
    }
  });

  it("maps application lookup failures to safe load failures", async () => {
    const access = createAccess({
      loadOwnedApplicationForVacancy: vi.fn().mockResolvedValue({ ok: false }),
    });
    expect(await loadCandidateVacancyDetail(VACANCY_ID, access)).toEqual({
      status: "failure",
      reason: "load",
    });
  });

  it("does not accept a caller-supplied candidate id", () => {
    expect(loadCandidateVacancyDetail.length).toBeLessThanOrEqual(2);
    expect(loadCandidateVacancyDetail.toString()).not.toMatch(/candidateId/);
    expect(loadCandidateVacancyDetail.toString()).not.toMatch(/service.?role/i);
  });
});
