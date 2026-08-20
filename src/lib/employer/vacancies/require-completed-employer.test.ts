import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireCompletedEmployer } from "@/lib/employer/vacancies/require-completed-employer";

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
  verification_requested_at: null,
  verification_reviewed_at: null,
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
    profileMaybeSingle,
    companyMaybeSingle,
  };
}

describe("requireCompletedEmployer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dedupes repeated completed-employer gates on one server Supabase client", async () => {
    const client = makeClient({
      getUser: { data: { user: { id: "emp-1" } }, error: null },
      profile: { data: completedEmployerRow, error: null },
      company: { data: null, error: null },
    });

    const [first, second] = await Promise.all([
      requireCompletedEmployer(client as never),
      requireCompletedEmployer(client as never),
    ]);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(client.auth.getUser).toHaveBeenCalledTimes(1);
    expect(client.profileMaybeSingle).toHaveBeenCalledTimes(1);
    expect(client.companyMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it("preserves unauthenticated failure semantics", async () => {
    const client = makeClient({
      getUser: { data: { user: null }, error: null },
      profile: { data: null, error: null },
      company: { data: null, error: null },
    });

    const result = await requireCompletedEmployer(client as never);

    expect(result).toEqual({
      ok: false,
      reason: "unauthenticated",
      error: "You must be signed in to continue.",
    });
    expect(client.profileMaybeSingle).not.toHaveBeenCalled();
  });

  it("preserves incomplete-employer failure semantics", async () => {
    const client = makeClient({
      getUser: { data: { user: { id: "emp-1" } }, error: null },
      profile: {
        data: { ...completedEmployerRow, onboarding_completed_at: null },
        error: null,
      },
      company: { data: null, error: null },
    });

    const result = await requireCompletedEmployer(client as never);

    expect(result).toEqual({
      ok: false,
      reason: "incomplete",
      error: "Finish employer onboarding before continuing.",
    });
  });

  it("preserves completed-employer success contract", async () => {
    const client = makeClient({
      getUser: { data: { user: { id: "emp-1" } }, error: null },
      profile: { data: completedEmployerRow, error: null },
      company: {
        data: {
          id: "company-1",
          name: "Ada GmbH",
          slug: "ada-gmbh",
        },
        error: null,
      },
    });

    const result = await requireCompletedEmployer(client as never);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.supabase).toBe(client);
    expect(result.userId).toBe("emp-1");
    expect(result.profile.displayName).toBe("Ada");
    expect(result.profile.company).toEqual({
      id: "company-1",
      name: "Ada GmbH",
      slug: "ada-gmbh",
    });
  });

  it("preserves profile-load failure semantics", async () => {
    const client = makeClient({
      getUser: { data: { user: { id: "emp-1" } }, error: null },
      profile: {
        data: null,
        error: { message: "permission denied for table employer_profiles" },
      },
      company: { data: null, error: null },
    });

    const result = await requireCompletedEmployer(client as never);

    expect(result).toEqual({
      ok: false,
      reason: "failed",
      error: "Could not load your employer profile.",
    });
  });
});
