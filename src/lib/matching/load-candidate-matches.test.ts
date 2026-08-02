import { describe, expect, it, vi } from "vitest";

import {
  loadCandidateMatches,
  type CandidateMatchesDataAccess,
} from "@/lib/matching/load-candidate-matches";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const completeProfile = {
  city: "Berlin" as const,
  german_comfort: "comfortable" as const,
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
  id: "22222222-2222-4222-8222-222222222201",
  title: "Demo vacancy — Morning kitchen support",
  slug: "demo-morning-kitchen-support",
  summary: "Fictional demo hospitality role.",
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
  overrides: Partial<CandidateMatchesDataAccess> = {},
): CandidateMatchesDataAccess {
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
    loadVisibleVacancies: vi.fn().mockResolvedValue({
      ok: true,
      vacancies: [vacancyRow],
    }),
    loadVisibleLanguageRequirements: vi.fn().mockResolvedValue({
      ok: true,
      requirements: [],
    }),
    ...overrides,
  };
}

describe("loadCandidateMatches", () => {
  it("returns unauthenticated and skips profile and vacancy loading", async () => {
    const access = createAccess({
      getUserId: vi.fn().mockResolvedValue(null),
    });

    const result = await loadCandidateMatches(access);
    expect(result).toEqual({ status: "unauthenticated" });
    expect(access.loadCandidateProfile).not.toHaveBeenCalled();
    expect(access.loadVisibleVacancies).not.toHaveBeenCalled();
    expect(access.loadVisibleLanguageRequirements).not.toHaveBeenCalled();
  });

  it("returns profile_missing and skips vacancy loading", async () => {
    const access = createAccess({
      loadCandidateProfile: vi.fn().mockResolvedValue({
        ok: false,
        reason: "missing",
      }),
    });

    const result = await loadCandidateMatches(access);
    expect(result).toEqual({ status: "profile_missing" });
    expect(access.loadVisibleVacancies).not.toHaveBeenCalled();
    expect(access.loadVisibleLanguageRequirements).not.toHaveBeenCalled();
  });

  it("rejects incomplete candidates before vacancy inventory queries", async () => {
    const access = createAccess({
      loadCandidateProfile: vi.fn().mockResolvedValue({
        ok: true,
        profile: incompleteProfile,
      }),
    });

    const result = await loadCandidateMatches(access);
    expect(result).toEqual({ status: "onboarding_incomplete" });
    expect(access.loadCandidateLanguages).toHaveBeenCalledWith(USER_ID);
    expect(access.loadVisibleVacancies).not.toHaveBeenCalled();
    expect(access.loadVisibleLanguageRequirements).not.toHaveBeenCalled();
  });

  it("derives candidate identity only from getUserId / session", async () => {
    const access = createAccess();
    const result = await loadCandidateMatches(access);

    expect(result.status).toBe("success");
    expect(access.getUserId).toHaveBeenCalledOnce();
    expect(access.loadCandidateProfile).toHaveBeenCalledWith(USER_ID);
    expect(access.loadCandidateLanguages).toHaveBeenCalledWith(USER_ID);
    expect(loadCandidateMatches.length).toBeLessThanOrEqual(1);
  });

  it("loads visible inventory and returns matches for a complete candidate", async () => {
    const access = createAccess();
    const result = await loadCandidateMatches(access);

    expect(access.loadVisibleVacancies).toHaveBeenCalledOnce();
    expect(access.loadVisibleLanguageRequirements).toHaveBeenCalledOnce();
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0]?.vacancy.id).toBe(vacancyRow.id);
      expect(result.matches[0]?.reasons[0]?.code).toBe("category_match");
    }
  });

  it("maps database errors to safe load failures", async () => {
    const profileError = createAccess({
      loadCandidateProfile: vi.fn().mockResolvedValue({
        ok: false,
        reason: "error",
      }),
    });
    expect(await loadCandidateMatches(profileError)).toEqual({
      status: "failure",
      reason: "load",
    });

    const vacancyError = createAccess({
      loadVisibleVacancies: vi.fn().mockResolvedValue({ ok: false }),
    });
    expect(await loadCandidateMatches(vacancyError)).toEqual({
      status: "failure",
      reason: "load",
    });
  });

  it("maps malformed visible vacancy data to invariant failure", async () => {
    const access = createAccess({
      loadVisibleVacancies: vi.fn().mockResolvedValue({
        ok: true,
        vacancies: [{ ...vacancyRow, published_at: null }],
      }),
    });

    expect(await loadCandidateMatches(access)).toEqual({
      status: "failure",
      reason: "invariant",
    });
  });

  it("distinguishes success with zero matches from failure", async () => {
    const access = createAccess({
      loadCandidateProfile: vi.fn().mockResolvedValue({
        ok: true,
        profile: {
          ...completeProfile,
          job_categories: ["moving"],
        },
      }),
    });

    const result = await loadCandidateMatches(access);
    expect(result).toEqual({ status: "success", matches: [] });
  });

  it("does not accept a caller-supplied candidate id parameter", () => {
    expect(loadCandidateMatches.length).toBeLessThanOrEqual(1);
    // Signature is (dataAccess?), never (candidateId, ...).
    expect(loadCandidateMatches.toString()).not.toMatch(/candidateId/);
  });
});
