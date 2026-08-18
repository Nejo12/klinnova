import { describe, expect, it } from "vitest";

import {
  employerApplicationDetailSchema,
  employerApplicationListRowSchema,
  employerOutcomeEventListSchema,
  recordApplicationOutcomeRpcResultSchema,
  recordOutcomeFormSchema,
  transitionApplicationRpcResultSchema,
  transitionFormSchema,
  voidApplicationOutcomeRpcResultSchema,
  voidOutcomeFormSchema,
} from "@/lib/employer/applications/schemas";

const applicationId = "11111111-1111-4111-8111-111111111111";
const vacancyId = "22222222-2222-4222-8222-222222222222";
const outcomeEventId = "44444444-4444-4444-8444-444444444444";

describe("employerApplicationListRowSchema", () => {
  const liveRow = {
    candidate_deleted: false,
    application_id: applicationId,
    vacancy_id: vacancyId,
    vacancy_title: "Morning kitchen support",
    candidate_display_name: "J. Doe",
    job_category: "hospitality",
    german_comfort: "basic",
    available_from: "2026-09-01",
    current_status: "submitted",
    submitted_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    employer_seen_at: null,
  };

  it("accepts a live-candidate row with every real attribute", () => {
    expect(employerApplicationListRowSchema.safeParse(liveRow).success).toBe(
      true,
    );
  });

  it("accepts a deleted-candidate row with no candidate attributes", () => {
    const deletedRow = {
      candidate_deleted: true,
      application_id: applicationId,
      vacancy_id: vacancyId,
      vacancy_title: "Morning kitchen support",
      candidate_display_name: "Deleted candidate",
      job_category: null,
      german_comfort: null,
      available_from: null,
      current_status: "submitted",
      submitted_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
      employer_seen_at: null,
    };
    const parsed = employerApplicationListRowSchema.safeParse(deletedRow);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.candidate_display_name).toBe("Deleted candidate");
    }
  });

  it("rejects a deleted row that does not use the literal 'Deleted candidate' label", () => {
    const parsed = employerApplicationListRowSchema.safeParse({
      candidate_deleted: true,
      application_id: applicationId,
      vacancy_id: vacancyId,
      vacancy_title: "Morning kitchen support",
      candidate_display_name: "Ada Candidate",
      job_category: null,
      german_comfort: null,
      available_from: null,
      current_status: "submitted",
      submitted_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
      employer_seen_at: null,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a live row missing a required candidate attribute (never coerced to the deleted shape)", () => {
    const withoutJobCategory: Record<string, unknown> = { ...liveRow };
    delete withoutJobCategory.job_category;
    expect(
      employerApplicationListRowSchema.safeParse(withoutJobCategory).success,
    ).toBe(false);
  });

  it.each([["live", false] as const, ["deleted", true] as const])(
    "accepts and round-trips a null employer_seen_at on the %s branch",
    (_label, candidateDeleted) => {
      const base = candidateDeleted
        ? {
            candidate_deleted: true,
            application_id: applicationId,
            vacancy_id: vacancyId,
            vacancy_title: "Morning kitchen support",
            candidate_display_name: "Deleted candidate",
            job_category: null,
            german_comfort: null,
            available_from: null,
            current_status: "submitted",
            submitted_at: "2026-08-01T00:00:00Z",
            updated_at: "2026-08-01T00:00:00Z",
          }
        : liveRow;
      const parsed = employerApplicationListRowSchema.safeParse({
        ...base,
        employer_seen_at: null,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.employer_seen_at).toBeNull();
      }
    },
  );

  it.each([["live", false] as const, ["deleted", true] as const])(
    "accepts and round-trips a real ISO timestamp employer_seen_at on the %s branch",
    (_label, candidateDeleted) => {
      const base = candidateDeleted
        ? {
            candidate_deleted: true,
            application_id: applicationId,
            vacancy_id: vacancyId,
            vacancy_title: "Morning kitchen support",
            candidate_display_name: "Deleted candidate",
            job_category: null,
            german_comfort: null,
            available_from: null,
            current_status: "submitted",
            submitted_at: "2026-08-01T00:00:00Z",
            updated_at: "2026-08-01T00:00:00Z",
          }
        : liveRow;
      const parsed = employerApplicationListRowSchema.safeParse({
        ...base,
        employer_seen_at: "2026-08-10T09:00:00Z",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.employer_seen_at).toBe("2026-08-10T09:00:00Z");
      }
    },
  );
});

describe("employerApplicationDetailSchema", () => {
  const liveReady = {
    status: "ready",
    candidate_deleted: false,
    application_id: applicationId,
    vacancy_id: vacancyId,
    vacancy_title: "Morning kitchen support",
    submitted_at: "2026-08-01T00:00:00Z",
    current_status: "submitted",
    candidate_display_name: "J. Doe",
    matched_job_category: "hospitality",
    german_comfort: "basic",
    languages: [],
    work_authorisation_declared: true,
    available_from: null,
    employment_types: ["full_time"],
    shift_preferences: ["morning"],
    allowed_transitions: ["reviewing", "shortlisted", "accepted", "rejected"],
    status_history: [],
  };

  it("accepts a live-candidate ready detail", () => {
    expect(employerApplicationDetailSchema.safeParse(liveReady).success).toBe(
      true,
    );
  });

  it("accepts a deleted-candidate ready detail without requiring german_comfort/job_category/preferences", () => {
    const deletedReady = {
      status: "ready",
      candidate_deleted: true,
      application_id: applicationId,
      vacancy_id: vacancyId,
      vacancy_title: "Morning kitchen support",
      submitted_at: "2026-08-01T00:00:00Z",
      current_status: "submitted",
      candidate_display_name: "Deleted candidate",
      allowed_transitions: [],
      status_history: [],
    };
    const parsed = employerApplicationDetailSchema.safeParse(deletedReady);
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.status === "ready") {
      expect(parsed.data.candidate_deleted).toBe(true);
      expect("matched_job_category" in parsed.data).toBe(false);
      expect("german_comfort" in parsed.data).toBe(false);
      expect("employment_types" in parsed.data).toBe(false);
      expect("shift_preferences" in parsed.data).toBe(false);
    }
  });

  it("rejects a deleted-candidate ready detail with a non-empty allowed_transitions (D-087)", () => {
    const parsed = employerApplicationDetailSchema.safeParse({
      status: "ready",
      candidate_deleted: true,
      application_id: applicationId,
      vacancy_id: vacancyId,
      vacancy_title: "Morning kitchen support",
      submitted_at: "2026-08-01T00:00:00Z",
      current_status: "submitted",
      candidate_display_name: "Deleted candidate",
      allowed_transitions: ["reviewing"],
      status_history: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("still accepts the unavailable status", () => {
    expect(
      employerApplicationDetailSchema.safeParse({ status: "unavailable" })
        .success,
    ).toBe(true);
  });
});

describe("transitionApplicationRpcResultSchema", () => {
  it("accepts every documented result discriminant", () => {
    expect(
      transitionApplicationRpcResultSchema.safeParse({
        result: "updated",
        application_id: applicationId,
        previous_status: "submitted",
        current_status: "reviewing",
        occurred_at: "2026-08-06T00:00:00Z",
      }).success,
    ).toBe(true);
    expect(
      transitionApplicationRpcResultSchema.safeParse({
        result: "already_in_state",
        application_id: applicationId,
        current_status: "reviewing",
      }).success,
    ).toBe(true);
    expect(
      transitionApplicationRpcResultSchema.safeParse({
        result: "invalid_transition",
      }).success,
    ).toBe(true);
    expect(
      transitionApplicationRpcResultSchema.safeParse({ result: "unavailable" })
        .success,
    ).toBe(true);
    expect(
      transitionApplicationRpcResultSchema.safeParse({
        result: "employer_unavailable",
      }).success,
    ).toBe(true);
  });

  it("rejects an unrecognised discriminant", () => {
    expect(
      transitionApplicationRpcResultSchema.safeParse({ result: "ok" }).success,
    ).toBe(false);
  });
});

describe("transitionFormSchema", () => {
  it("normalizes a blank reason to null", () => {
    const parsed = transitionFormSchema.safeParse({
      applicationId,
      targetStatus: "reviewing",
      reason: "   ",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.reason).toBeNull();
  });

  it("trims a non-blank reason for UX only — server remains authoritative", () => {
    const parsed = transitionFormSchema.safeParse({
      applicationId,
      targetStatus: "rejected",
      reason: "  Not a fit  ",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.reason).toBe("Not a fit");
  });

  it("rejects a reason over 1000 characters", () => {
    const parsed = transitionFormSchema.safeParse({
      applicationId,
      targetStatus: "rejected",
      reason: "x".repeat(1001),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a malformed application id", () => {
    const parsed = transitionFormSchema.safeParse({
      applicationId: "not-a-uuid",
      targetStatus: "reviewing",
      reason: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown target status", () => {
    const parsed = transitionFormSchema.safeParse({
      applicationId,
      targetStatus: "archived",
      reason: "",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("employerOutcomeEventListSchema", () => {
  it("accepts a well-formed row with a null voided_at", () => {
    const parsed = employerOutcomeEventListSchema.safeParse([
      {
        outcome_event_id: outcomeEventId,
        outcome_type: "hired",
        occurred_at: "2026-08-05T00:00:00Z",
        recorded_at: "2026-08-05T00:00:00Z",
        voided_at: null,
      },
    ]);
    expect(parsed.success).toBe(true);
  });

  it("rejects an outcome_type outside interview_completed/hired", () => {
    const parsed = employerOutcomeEventListSchema.safeParse([
      {
        outcome_event_id: outcomeEventId,
        outcome_type: "interview_set",
        occurred_at: "2026-08-05T00:00:00Z",
        recorded_at: "2026-08-05T00:00:00Z",
        voided_at: null,
      },
    ]);
    expect(parsed.success).toBe(false);
  });

  it("does not accept recorded_by/voided_by even if present", () => {
    const parsed = employerOutcomeEventListSchema.safeParse([
      {
        outcome_event_id: outcomeEventId,
        outcome_type: "hired",
        occurred_at: "2026-08-05T00:00:00Z",
        recorded_at: "2026-08-05T00:00:00Z",
        voided_at: null,
        recorded_by: "leaked-actor-id",
      },
    ]);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data[0]).not.toHaveProperty("recorded_by");
    }
  });
});

describe("recordApplicationOutcomeRpcResultSchema", () => {
  it("accepts the ok result shape", () => {
    const parsed = recordApplicationOutcomeRpcResultSchema.safeParse({
      result: "ok",
      outcome_event_id: outcomeEventId,
      outcome_type: "hired",
      occurred_at: "2026-08-05T00:00:00Z",
      recorded_at: "2026-08-05T00:00:00Z",
    });
    expect(parsed.success).toBe(true);
  });

  it.each([
    "already_hired",
    "invalid_outcome_type",
    "invalid_occurred_at",
    "unavailable",
  ])("accepts the bare %s result", (result) => {
    const parsed = recordApplicationOutcomeRpcResultSchema.safeParse({
      result,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a discriminant the RPC does not produce (no invented employer_unavailable)", () => {
    const parsed = recordApplicationOutcomeRpcResultSchema.safeParse({
      result: "employer_unavailable",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("voidApplicationOutcomeRpcResultSchema", () => {
  it("accepts the ok result shape", () => {
    const parsed = voidApplicationOutcomeRpcResultSchema.safeParse({
      result: "ok",
      outcome_event_id: outcomeEventId,
      voided_at: "2026-08-05T00:00:00Z",
    });
    expect(parsed.success).toBe(true);
  });

  it.each(["already_voided", "unavailable"])(
    "accepts the bare %s result",
    (result) => {
      const parsed = voidApplicationOutcomeRpcResultSchema.safeParse({
        result,
      });
      expect(parsed.success).toBe(true);
    },
  );

  it("rejects a discriminant the RPC does not produce", () => {
    const parsed = voidApplicationOutcomeRpcResultSchema.safeParse({
      result: "employer_unavailable",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("recordOutcomeFormSchema", () => {
  it("accepts a well-formed submission", () => {
    const parsed = recordOutcomeFormSchema.safeParse({
      applicationId,
      outcomeType: "interview_completed",
      occurredAtDate: "2026-08-05",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an outcome type outside the allowed vocabulary", () => {
    const parsed = recordOutcomeFormSchema.safeParse({
      applicationId,
      outcomeType: "interview_set",
      occurredAtDate: "2026-08-05",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a malformed date string", () => {
    const parsed = recordOutcomeFormSchema.safeParse({
      applicationId,
      outcomeType: "hired",
      occurredAtDate: "not-a-date",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("voidOutcomeFormSchema", () => {
  it("accepts a well-formed submission", () => {
    const parsed = voidOutcomeFormSchema.safeParse({
      applicationId,
      outcomeEventId,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a malformed outcome event id", () => {
    const parsed = voidOutcomeFormSchema.safeParse({
      applicationId,
      outcomeEventId: "not-a-uuid",
    });
    expect(parsed.success).toBe(false);
  });
});
