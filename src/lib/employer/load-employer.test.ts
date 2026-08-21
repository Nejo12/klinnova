import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadEmployerProfile } from "@/lib/employer/load-employer";

const completedEmployerRow = {
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
};

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
    profileMaybeSingle,
    companyMaybeSingle,
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

  it("dedupes two equivalent same-request calls on one server Supabase client", async () => {
    const client = makeClient({
      getUser: { data: { user: { id: "emp-1" } }, error: null },
      profile: { data: completedEmployerRow, error: null },
      company: { data: null, error: null },
    });

    const [first, second] = await Promise.all([
      loadEmployerProfile(client as never),
      loadEmployerProfile(client as never),
    ]);

    expect(first).toEqual(second);
    expect(client.auth.getUser).toHaveBeenCalledTimes(1);
    expect(client.from).toHaveBeenCalledWith("employer_profiles");
    expect(client.from).toHaveBeenCalledWith("companies");
    expect(client.profileMaybeSingle).toHaveBeenCalledTimes(1);
    expect(client.companyMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it("dedupes three equivalent same-request calls on one server Supabase client", async () => {
    const client = makeClient({
      getUser: { data: { user: { id: "emp-1" } }, error: null },
      profile: { data: completedEmployerRow, error: null },
      company: { data: null, error: null },
    });

    await Promise.all([
      loadEmployerProfile(client as never),
      loadEmployerProfile(client as never),
      loadEmployerProfile(client as never),
    ]);

    expect(client.auth.getUser).toHaveBeenCalledTimes(1);
    expect(client.profileMaybeSingle).toHaveBeenCalledTimes(1);
    expect(client.companyMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it("does not reuse cached employer state across fresh server Supabase clients", async () => {
    const firstClient = makeClient({
      getUser: { data: { user: { id: "emp-1" } }, error: null },
      profile: {
        data: { ...completedEmployerRow, display_name: "First Employer" },
        error: null,
      },
      company: { data: null, error: null },
    });
    const secondClient = makeClient({
      getUser: { data: { user: { id: "emp-2" } }, error: null },
      profile: {
        data: {
          ...completedEmployerRow,
          id: "emp-2",
          display_name: "Second Employer",
        },
        error: null,
      },
      company: { data: null, error: null },
    });

    const first = await loadEmployerProfile(firstClient as never);
    const second = await loadEmployerProfile(secondClient as never);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }
    expect(first.data?.displayName).toBe("First Employer");
    expect(second.data?.displayName).toBe("Second Employer");
    expect(firstClient.auth.getUser).toHaveBeenCalledTimes(1);
    expect(secondClient.auth.getUser).toHaveBeenCalledTimes(1);
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

  it("preserves employer-profile query error semantics", async () => {
    const client = makeClient({
      getUser: { data: { user: { id: "emp-1" } }, error: null },
      profile: {
        data: null,
        error: { message: "permission denied for table employer_profiles" },
      },
      company: { data: null, error: null },
    });

    const result = await loadEmployerProfile(client as never);

    expect(result).toEqual({
      ok: false,
      reason: "failed",
      error: "Could not load your employer profile.",
    });
    expect(client.companyMaybeSingle).not.toHaveBeenCalled();
  });

  it("preserves company-query error semantics", async () => {
    const client = makeClient({
      getUser: { data: { user: { id: "emp-1" } }, error: null },
      profile: { data: completedEmployerRow, error: null },
      company: {
        data: null,
        error: { message: "permission denied for table companies" },
      },
    });

    const result = await loadEmployerProfile(client as never);

    expect(result).toEqual({
      ok: false,
      reason: "failed",
      error: "Could not load your organisation details.",
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
