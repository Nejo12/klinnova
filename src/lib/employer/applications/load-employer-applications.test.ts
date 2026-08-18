import { beforeEach, describe, expect, it, vi } from "vitest";

const loadEmployerProfile = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/employer/load-employer", () => ({
  loadEmployerProfile,
}));

import { loadEmployerApplications } from "@/lib/employer/applications/load-employer-applications";

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
    verificationState: "unverified",
    onboardingCompletedAt: "2026-08-01T00:00:00Z",
    company: null,
    typeLocked: true,
  },
};

const row = {
  candidate_deleted: false,
  application_id: "11111111-1111-4111-8111-111111111111",
  vacancy_id: "22222222-2222-4222-8222-222222222222",
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

describe("loadEmployerApplications", () => {
  beforeEach(() => {
    loadEmployerProfile.mockReset();
    rpc.mockReset();
    loadEmployerProfile.mockResolvedValue(completedProfile);
  });

  it("denies an unauthenticated caller without calling the RPC", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: false,
      reason: "unauthenticated",
      error: "You must be signed in to continue.",
    });

    const result = await loadEmployerApplications(makeClient() as never, {
      vacancyId: null,
      status: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("unauthenticated");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("denies an incomplete employer without calling the RPC — no verification-state check", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      userId: "emp-1",
      data: null,
    });

    const result = await loadEmployerApplications(makeClient() as never, {
      vacancyId: null,
      status: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("incomplete");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls list_current_employer_applications with the parsed filter and no caller-supplied identity", async () => {
    rpc.mockResolvedValue({ data: [row], error: null });

    await loadEmployerApplications(makeClient() as never, {
      vacancyId: "22222222-2222-4222-8222-222222222222",
      status: "submitted",
    });

    expect(rpc).toHaveBeenCalledWith("list_current_employer_applications", {
      p_vacancy_id: "22222222-2222-4222-8222-222222222222",
      p_status: "submitted",
    });
  });

  it("preserves the RPC's own row order and never re-sorts", async () => {
    const rowB = {
      ...row,
      application_id: "33333333-3333-4333-8333-333333333333",
      candidate_display_name: "A. Later",
    };
    rpc.mockResolvedValue({ data: [row, rowB], error: null });

    const result = await loadEmployerApplications(makeClient() as never, {
      vacancyId: null,
      status: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applications.map((a) => a.application_id)).toEqual([
      row.application_id,
      rowB.application_id,
    ]);
  });

  it("fails closed on a malformed row (whole response fails, not a partial list)", async () => {
    rpc.mockResolvedValue({
      data: [{ ...row, current_status: "not-a-real-status" }],
      error: null,
    });

    const result = await loadEmployerApplications(makeClient() as never, {
      vacancyId: null,
      status: null,
    });

    expect(result.ok).toBe(false);
  });

  it("normalizes a transport error without leaking raw details", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied for table applications" },
    });

    const result = await loadEmployerApplications(makeClient() as never, {
      vacancyId: null,
      status: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).not.toMatch(/permission denied/i);
  });

  it("accepts a deleted-candidate row (D-078 preserved application) without fabricated attributes", async () => {
    const deletedRow = {
      candidate_deleted: true,
      application_id: "44444444-4444-4444-8444-444444444444",
      vacancy_id: "22222222-2222-4222-8222-222222222222",
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
    rpc.mockResolvedValue({ data: [deletedRow], error: null });

    const result = await loadEmployerApplications(makeClient() as never, {
      vacancyId: null,
      status: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applications[0]?.candidate_display_name).toBe(
      "Deleted candidate",
    );
    expect(result.applications[0]?.candidate_deleted).toBe(true);
  });
});
