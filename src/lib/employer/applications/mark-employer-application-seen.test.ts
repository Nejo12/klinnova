import { beforeEach, describe, expect, it, vi } from "vitest";

const loadEmployerProfile = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/employer/load-employer", () => ({
  loadEmployerProfile,
}));

import { markEmployerApplicationSeen } from "@/lib/employer/applications/mark-employer-application-seen";

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

describe("markEmployerApplicationSeen", () => {
  beforeEach(() => {
    loadEmployerProfile.mockReset();
    rpc.mockReset();
    loadEmployerProfile.mockResolvedValue(completedProfile);
  });

  it("treats a malformed application id as failure without calling the RPC", async () => {
    const result = await markEmployerApplicationSeen(
      makeClient() as never,
      "not-a-uuid",
    );
    expect(result.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls the RPC with exactly the application id and succeeds on result:ok", async () => {
    rpc.mockResolvedValue({ data: { result: "ok" }, error: null });

    const result = await markEmployerApplicationSeen(
      makeClient() as never,
      applicationId,
    );

    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("mark_employer_application_seen", {
      p_application_id: applicationId,
    });
  });

  it("fails (without throwing) when the RPC reports unavailable (cross-employer ownership)", async () => {
    rpc.mockResolvedValue({ data: { result: "unavailable" }, error: null });

    const result = await markEmployerApplicationSeen(
      makeClient() as never,
      applicationId,
    );

    expect(result.ok).toBe(false);
  });

  it("fails when the RPC reports employer_unavailable", async () => {
    rpc.mockResolvedValue({
      data: { result: "employer_unavailable" },
      error: null,
    });

    const result = await markEmployerApplicationSeen(
      makeClient() as never,
      applicationId,
    );

    expect(result.ok).toBe(false);
  });

  it("fails safely on a transport error without leaking raw details", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied for table applications" },
    });

    const result = await markEmployerApplicationSeen(
      makeClient() as never,
      applicationId,
    );

    expect(result.ok).toBe(false);
  });

  it("fails when the caller is not a completed employer (incomplete/unauthenticated)", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: false,
      reason: "unauthenticated",
      error: "not signed in",
    });

    const result = await markEmployerApplicationSeen(
      makeClient() as never,
      applicationId,
    );

    expect(result.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("succeeds identically on a repeated call for the same application (idempotent from the caller's perspective)", async () => {
    rpc.mockResolvedValue({ data: { result: "ok" }, error: null });

    const first = await markEmployerApplicationSeen(
      makeClient() as never,
      applicationId,
    );
    const second = await markEmployerApplicationSeen(
      makeClient() as never,
      applicationId,
    );

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
  });
});
