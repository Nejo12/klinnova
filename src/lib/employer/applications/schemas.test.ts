import { describe, expect, it } from "vitest";

import {
  employerApplicationDetailSchema,
  employerApplicationListRowSchema,
  transitionApplicationRpcResultSchema,
  transitionFormSchema,
} from "@/lib/employer/applications/schemas";

const applicationId = "11111111-1111-4111-8111-111111111111";
const vacancyId = "22222222-2222-4222-8222-222222222222";

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
