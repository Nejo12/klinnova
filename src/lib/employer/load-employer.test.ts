import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadEmployerProfile } from "@/lib/employer/load-employer";

function makeClient(options: {
  getUser: unknown;
  profile: { data: unknown; error: unknown };
  company: { data: unknown; error: unknown };
}) {
  const profileMaybeSingle = vi.fn().mockResolvedValue(options.profile);
  const profileEq = vi.fn(() => ({ maybeSingle: profileMaybeSingle }));
  const profileSelect = vi.fn(() => ({ eq: profileEq }));

  const companyMaybeSingle = vi.fn().mockResolvedValue(options.company);
  const companyEqSource = vi.fn(() => ({ maybeSingle: companyMaybeSingle }));
  const companyEqOwner = vi.fn(() => ({ eq: companyEqSource }));
  const companySelect = vi.fn(() => ({ eq: companyEqOwner }));

  const from = vi.fn((table: string) => {
    if (table === "employer_profiles") {
      return { select: profileSelect };
    }
    return { select: companySelect };
  });

  return {
    auth: { getUser: vi.fn().mockResolvedValue(options.getUser) },
    from,
    profileSelect,
  };
}

describe("loadEmployerProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthenticated when there is no session user", async () => {
    const client = makeClient({
      getUser: { data: { user: null }, error: null },
      profile: { data: null, error: null },
      company: { data: null, error: null },
    });

    const result = await loadEmployerProfile(client as never);
    expect(result).toEqual({
      ok: false,
      reason: "unauthenticated",
      error: expect.any(String),
    });
  });

  it("selects verification requested/reviewed/reason columns", async () => {
    const client = makeClient({
      getUser: { data: { user: { id: "emp-1" } }, error: null },
      profile: { data: null, error: null },
      company: { data: null, error: null },
    });

    await loadEmployerProfile(client as never);

    expect(client.profileSelect).toHaveBeenCalledWith(
      expect.stringContaining("verification_requested_at"),
    );
    expect(client.profileSelect).toHaveBeenCalledWith(
      expect.stringContaining("verification_reviewed_at"),
    );
    expect(client.profileSelect).toHaveBeenCalledWith(
      expect.stringContaining("verification_review_reason"),
    );
  });

  it("maps verification timestamps and reason onto the returned profile", async () => {
    const client = makeClient({
      getUser: { data: { user: { id: "emp-1" } }, error: null },
      profile: {
        data: {
          id: "emp-1",
          employer_type: "private",
          display_name: "Ada",
          berlin_locality: "Mitte",
          phone: null,
          website: null,
          organisation_legal_name: null,
          lawful_hiring_declared: true,
          verification_state: "rejected",
          verification_requested_at: "2026-08-05T09:00:00Z",
          verification_reviewed_at: "2026-08-05T12:00:00Z",
          verification_review_reason: "Profile details need review",
          onboarding_completed_at: "2026-08-01T00:00:00Z",
        },
        error: null,
      },
      company: { data: null, error: null },
    });

    const result = await loadEmployerProfile(client as never);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data).toMatchObject({
      verificationState: "rejected",
      verificationRequestedAt: "2026-08-05T09:00:00Z",
      verificationReviewedAt: "2026-08-05T12:00:00Z",
      verificationReviewReason: "Profile details need review",
    });
  });

  it("does not expose reviewer identity on the returned profile", async () => {
    const client = makeClient({
      getUser: { data: { user: { id: "emp-1" } }, error: null },
      profile: {
        data: {
          id: "emp-1",
          employer_type: "private",
          display_name: "Ada",
          berlin_locality: "Mitte",
          phone: null,
          website: null,
          organisation_legal_name: null,
          lawful_hiring_declared: true,
          verification_state: "verified",
          verification_requested_at: "2026-08-05T09:00:00Z",
          verification_reviewed_at: "2026-08-05T12:00:00Z",
          verification_review_reason: null,
          onboarding_completed_at: "2026-08-01T00:00:00Z",
        },
        error: null,
      },
      company: { data: null, error: null },
    });

    const result = await loadEmployerProfile(client as never);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data).not.toHaveProperty("verificationReviewedBy");
    expect(client.profileSelect).not.toHaveBeenCalledWith(
      expect.stringContaining("verification_reviewed_by"),
    );
  });
});
