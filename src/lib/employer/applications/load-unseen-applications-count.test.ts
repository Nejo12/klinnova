import { beforeEach, describe, expect, it, vi } from "vitest";

const loadEmployerProfile = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/employer/load-employer", () => ({
  loadEmployerProfile,
}));

import { loadUnseenApplicationsCount } from "@/lib/employer/applications/load-unseen-applications-count";

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

describe("loadUnseenApplicationsCount", () => {
  beforeEach(() => {
    loadEmployerProfile.mockReset();
    rpc.mockReset();
    loadEmployerProfile.mockResolvedValue(completedProfile);
  });

  it("returns the RPC's count on result:ok", async () => {
    rpc.mockResolvedValue({ data: { result: "ok", count: 3 }, error: null });

    const count = await loadUnseenApplicationsCount(makeClient() as never);

    expect(count).toBe(3);
    expect(rpc).toHaveBeenCalledWith(
      "count_unseen_current_employer_applications",
    );
  });

  it("returns 0 when the RPC's own count happens to be 0", async () => {
    rpc.mockResolvedValue({ data: { result: "ok", count: 0 }, error: null });

    const count = await loadUnseenApplicationsCount(makeClient() as never);

    expect(count).toBe(0);
  });

  it("returns 0 (not an error) when the RPC reports employer_unavailable", async () => {
    rpc.mockResolvedValue({
      data: { result: "employer_unavailable", count: 0 },
      error: null,
    });

    const count = await loadUnseenApplicationsCount(makeClient() as never);

    expect(count).toBe(0);
  });

  it("returns 0 on a transport error", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    const count = await loadUnseenApplicationsCount(makeClient() as never);

    expect(count).toBe(0);
  });

  it("returns 0 when the caller is not a completed employer, without calling the RPC", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: false,
      reason: "unauthenticated",
      error: "not signed in",
    });

    const count = await loadUnseenApplicationsCount(makeClient() as never);

    expect(count).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns 0 on a malformed RPC payload", async () => {
    rpc.mockResolvedValue({ data: { unexpected: "shape" }, error: null });

    const count = await loadUnseenApplicationsCount(makeClient() as never);

    expect(count).toBe(0);
  });
});
