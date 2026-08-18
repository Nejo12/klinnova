import { beforeEach, describe, expect, it, vi } from "vitest";

const loadEmployerProfile = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/employer/load-employer", () => ({
  loadEmployerProfile,
}));

import { loadEmployerApplication } from "@/lib/employer/applications/load-employer-application";

function makeClient() {
  return { rpc, auth: { getUser: vi.fn() } };
}

const completedProfile = {
  ok: true as const,
  userId: "emp-1",
  data: {
    id: "emp-1",
    employerType: "private" as const,
    displayName: "Ada",
    berlinLocality: "Mitte",
    phone: null,
    website: null,
    organisationLegalName: null,
    lawfulHiringDeclared: true,
    verificationState: "revoked",
    onboardingCompletedAt: "2026-08-01T00:00:00Z",
    company: null,
    typeLocked: true,
  },
};

const applicationId = "11111111-1111-4111-8111-111111111111";

const readyPayload = {
  status: "ready",
  candidate_deleted: false,
  application_id: applicationId,
  vacancy_id: "22222222-2222-4222-8222-222222222222",
  vacancy_title: "Morning kitchen support",
  submitted_at: "2026-08-01T00:00:00Z",
  current_status: "submitted",
  candidate_display_name: "J. Doe",
  matched_job_category: "hospitality",
  german_comfort: "basic",
  languages: [{ language_code: "en", proficiency: "proficient" }],
  work_authorisation_declared: true,
  available_from: "2026-09-01",
  employment_types: ["full_time"],
  shift_preferences: ["morning"],
  allowed_transitions: ["reviewing", "shortlisted", "accepted", "rejected"],
  status_history: [
    {
      from_status: null,
      to_status: "submitted",
      reason: null,
      occurred_at: "2026-08-01T00:00:00Z",
    },
  ],
  employer_seen_at: null,
};

describe("loadEmployerApplication", () => {
  beforeEach(() => {
    loadEmployerProfile.mockReset();
    rpc.mockReset();
    loadEmployerProfile.mockResolvedValue(completedProfile);
  });

  it("treats a malformed application id as unavailable without calling the RPC", async () => {
    const result = await loadEmployerApplication(
      makeClient() as never,
      "not-a-uuid",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("unavailable");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("succeeds for a completed employer regardless of current verification state", async () => {
    rpc.mockResolvedValue({ data: readyPayload, error: null });

    const result = await loadEmployerApplication(
      makeClient() as never,
      applicationId,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.application.application_id).toBe(applicationId);
    expect(result.application.status_history[0]?.from_status).toBeNull();
  });

  it("collapses an RPC unavailable payload (unknown or cross-employer-owned) to the same unavailable reason", async () => {
    rpc.mockResolvedValue({ data: { status: "unavailable" }, error: null });

    const result = await loadEmployerApplication(
      makeClient() as never,
      applicationId,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("unavailable");
  });

  it("never recomputes allowed_transitions, only validates known/unique values", async () => {
    rpc.mockResolvedValue({
      data: { ...readyPayload, allowed_transitions: ["accepted", "rejected"] },
      error: null,
    });

    const result = await loadEmployerApplication(
      makeClient() as never,
      applicationId,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.application.allowed_transitions).toEqual([
      "accepted",
      "rejected",
    ]);
  });

  it("rejects a duplicate allowed_transitions array as malformed", async () => {
    rpc.mockResolvedValue({
      data: { ...readyPayload, allowed_transitions: ["accepted", "accepted"] },
      error: null,
    });

    const result = await loadEmployerApplication(
      makeClient() as never,
      applicationId,
    );

    expect(result.ok).toBe(false);
  });

  it("never exposes actor identity fields even if the RPC payload accidentally included them", async () => {
    rpc.mockResolvedValue({
      data: {
        ...readyPayload,
        status_history: [
          {
            from_status: null,
            to_status: "submitted",
            reason: null,
            occurred_at: "2026-08-01T00:00:00Z",
            actor_user_id: "should-be-stripped",
          },
        ],
      },
      error: null,
    });

    const result = await loadEmployerApplication(
      makeClient() as never,
      applicationId,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.application.status_history[0]).not.toHaveProperty(
      "actor_user_id",
    );
  });

  it("normalizes a transport error without leaking raw details", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied for table applications" },
    });

    const result = await loadEmployerApplication(
      makeClient() as never,
      applicationId,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).not.toMatch(/permission denied/i);
  });

  it("stays ready (never unavailable) for a deleted candidate's preserved application, with no fabricated attributes", async () => {
    rpc.mockResolvedValue({
      data: {
        status: "ready",
        candidate_deleted: true,
        application_id: applicationId,
        vacancy_id: "22222222-2222-4222-8222-222222222222",
        vacancy_title: "Morning kitchen support",
        submitted_at: "2026-08-01T00:00:00Z",
        current_status: "submitted",
        candidate_display_name: "Deleted candidate",
        allowed_transitions: [],
        status_history: [
          {
            from_status: null,
            to_status: "submitted",
            reason: null,
            occurred_at: "2026-08-01T00:00:00Z",
          },
        ],
        employer_seen_at: null,
      },
      error: null,
    });

    const result = await loadEmployerApplication(
      makeClient() as never,
      applicationId,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.application.candidate_deleted).toBe(true);
    expect(result.application.candidate_display_name).toBe("Deleted candidate");
    expect("matched_job_category" in result.application).toBe(false);
    expect(result.application.allowed_transitions).toEqual([]);
  });

  it("rejects a deleted-candidate payload with a non-empty allowed_transitions (D-087)", async () => {
    rpc.mockResolvedValue({
      data: {
        status: "ready",
        candidate_deleted: true,
        application_id: applicationId,
        vacancy_id: "22222222-2222-4222-8222-222222222222",
        vacancy_title: "Morning kitchen support",
        submitted_at: "2026-08-01T00:00:00Z",
        current_status: "submitted",
        candidate_display_name: "Deleted candidate",
        allowed_transitions: ["reviewing"],
        status_history: [],
      },
      error: null,
    });

    const result = await loadEmployerApplication(
      makeClient() as never,
      applicationId,
    );

    expect(result.ok).toBe(false);
  });
});
