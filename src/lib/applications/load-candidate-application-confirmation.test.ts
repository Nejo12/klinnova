import { describe, expect, it, vi } from "vitest";

import {
  loadCandidateApplicationConfirmation,
  type CandidateApplicationConfirmationDataAccess,
} from "@/lib/applications/load-candidate-application-confirmation";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const APPLICATION_ID = "33333333-3333-4333-8333-333333333301";
const VACANCY_ID = "22222222-2222-4222-8222-222222222201";

const validRow = {
  id: APPLICATION_ID,
  status: "submitted",
  submitted_at: "2026-08-03T14:30:00.000Z",
  snapshot_version: 1,
  candidate_snapshot: {
    display_name: "Ada Candidate",
    job_category: "hospitality",
    german_comfort: "basic",
    languages: [],
    work_authorisation_declared: true,
    available_from: "2026-08-04",
    employment_types: ["part_time"],
    shift_preferences: ["morning"],
  },
  vacancy_snapshot: {
    vacancy_id: VACANCY_ID,
    title: "Demo vacancy — Morning kitchen support",
    employer_display_name: "Demo Berlin Work Co",
    source: "seed",
    demo_label: "Demo vacancy",
    city: "Berlin",
    job_category: "hospitality",
    employment_types: ["part_time"],
    shift_requirements: ["morning"],
    german_requirement: "basic",
    language_requirements: [],
    available_from: null,
  },
};

function createAccess(
  overrides: Partial<CandidateApplicationConfirmationDataAccess> = {},
): CandidateApplicationConfirmationDataAccess {
  return {
    getUserId: vi.fn().mockResolvedValue(USER_ID),
    loadOwnedApplicationById: vi.fn().mockResolvedValue({
      ok: true,
      row: validRow,
    }),
    ...overrides,
  };
}

describe("loadCandidateApplicationConfirmation", () => {
  it("returns unavailable for malformed ids without querying", async () => {
    const access = createAccess();
    expect(
      await loadCandidateApplicationConfirmation("not-a-uuid", access),
    ).toEqual({ status: "unavailable" });
    expect(access.getUserId).not.toHaveBeenCalled();
    expect(access.loadOwnedApplicationById).not.toHaveBeenCalled();
  });

  it("returns unauthenticated without loading applications", async () => {
    const access = createAccess({
      getUserId: vi.fn().mockResolvedValue(null),
    });
    expect(
      await loadCandidateApplicationConfirmation(APPLICATION_ID, access),
    ).toEqual({ status: "unauthenticated" });
    expect(access.loadOwnedApplicationById).not.toHaveBeenCalled();
  });

  it("returns ready confirmation for an owned valid application", async () => {
    const access = createAccess();
    const result = await loadCandidateApplicationConfirmation(
      APPLICATION_ID,
      access,
    );
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.confirmation.vacancyTitle).toBe(
        "Demo vacancy — Morning kitchen support",
      );
      expect(result.confirmation.candidateDisplayName).toBe("Ada Candidate");
      expect(result.confirmation.statusLabel).toBe("Submitted");
      expect(result.confirmation.submittedAtLabel).not.toContain(
        APPLICATION_ID,
      );
    }
    expect(access.loadOwnedApplicationById).toHaveBeenCalledWith(
      APPLICATION_ID,
    );
  });

  it("maps missing rows and malformed snapshots to unavailable", async () => {
    const missing = createAccess({
      loadOwnedApplicationById: vi.fn().mockResolvedValue({
        ok: false,
        reason: "missing",
      }),
    });
    expect(
      await loadCandidateApplicationConfirmation(APPLICATION_ID, missing),
    ).toEqual({ status: "unavailable" });

    const malformed = createAccess({
      loadOwnedApplicationById: vi.fn().mockResolvedValue({
        ok: true,
        row: { ...validRow, snapshot_version: 99 },
      }),
    });
    expect(
      await loadCandidateApplicationConfirmation(APPLICATION_ID, malformed),
    ).toEqual({ status: "unavailable" });
  });

  it("maps database errors to safe failure and avoids service-role paths", async () => {
    const access = createAccess({
      loadOwnedApplicationById: vi.fn().mockResolvedValue({
        ok: false,
        reason: "error",
      }),
    });
    expect(
      await loadCandidateApplicationConfirmation(APPLICATION_ID, access),
    ).toEqual({ status: "failure" });
    expect(loadCandidateApplicationConfirmation.toString()).not.toMatch(
      /service.?role|onboarding_completed|matchCandidate/i,
    );
  });
});
