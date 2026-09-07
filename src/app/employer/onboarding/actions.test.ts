import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());
const ensureEmployerProfile = vi.hoisted(() => vi.fn());
const writeActiveWorkspace = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
);

vi.mock("next/navigation", () => ({ redirect }));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser },
    from,
    rpc,
  })),
}));

vi.mock("@/lib/employer/ensure-employer-profile", () => ({
  ensureEmployerProfile,
}));

vi.mock("@/lib/workspace/active-workspace.server", () => ({
  writeActiveWorkspace,
}));

import {
  completeEmployerOnboardingAction,
  saveOrganisationEmployerAction,
  savePrivateEmployerAction,
  selectEmployerTypeAction,
} from "@/app/employer/onboarding/actions";

function form(data: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

/**
 * Mirrors the real Supabase query-builder chain shape
 * `.update(...).eq(...).eq(...)?.select("id").maybeSingle()` —
 * `.eq()` is chainable any number of times, `.select()` terminates into
 * `.maybeSingle()`, which is what actually resolves. `data` defaults to a
 * non-null row (a real row was affected) unless the test asks for a
 * zero-row result explicitly.
 */
function mockUpdateChain(
  error: { code?: string; message?: string } | null,
  data: { id: string } | null = { id: "user-1" },
) {
  const maybeSingle = vi
    .fn()
    .mockResolvedValue({ data: error === null ? data : null, error });
  const select = vi.fn(() => ({ maybeSingle }));
  const chain: { eq: ReturnType<typeof vi.fn>; select: typeof select } = {
    eq: vi.fn(),
    select,
  };
  chain.eq.mockReturnValue(chain);
  const update = vi.fn(() => chain);
  return { update, eq: chain.eq, select, maybeSingle };
}

describe("employer onboarding actions", () => {
  beforeEach(() => {
    getUser.mockReset();
    from.mockReset();
    rpc.mockReset();
    ensureEmployerProfile.mockReset();
    writeActiveWorkspace.mockReset();
    redirect.mockClear();
    // is_current_employer_suspended() defaults to "not suspended" for
    // every test unless overridden — this is the pre-check every direct
    // employer_profiles UPDATE now performs first.
    rpc.mockResolvedValue({ data: false, error: null });
  });

  it("rejects unauthenticated type selection", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const state = await selectEmployerTypeAction(
      { error: null, message: null },
      form({ employerType: "private" }),
    );
    expect(state.error).toMatch(/signed in/i);
  });

  it("creates employer profile from session identity", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    ensureEmployerProfile.mockResolvedValue({
      ok: true,
      created: true,
      userId: "user-1",
      employerType: "private",
    });

    await expect(
      selectEmployerTypeAction(
        { error: null, message: null },
        form({ employerType: "private" }),
      ),
    ).rejects.toThrow("REDIRECT:/employer/onboarding");

    expect(ensureEmployerProfile).toHaveBeenCalledWith(
      expect.anything(),
      "private",
    );
    expect(writeActiveWorkspace).toHaveBeenCalledWith("employer");
  });

  it("maps type-lock conflicts from ensure", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    ensureEmployerProfile.mockResolvedValue({
      ok: false,
      reason: "type_locked",
      error: "Your employer type can no longer be changed for this account.",
    });

    const state = await selectEmployerTypeAction(
      { error: null, message: null },
      form({ employerType: "organisation" }),
    );
    expect(state.error).toMatch(/no longer be changed/i);
  });

  it("saves private profile without writing protected columns", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    const chain = mockUpdateChain(null);
    from.mockReturnValue(chain);

    const state = await savePrivateEmployerAction(
      { error: null, message: null },
      form({
        displayName: "Ada",
        berlinLocality: "Mitte",
        phone: "",
        website: "",
        lawfulHiringDeclared: "yes",
      }),
    );

    expect(state.message).toMatch(/saved/i);
    expect(chain.update).toHaveBeenCalledWith(
      expect.not.objectContaining({
        onboarding_completed_at: expect.anything(),
        verification_state: expect.anything(),
        lawful_hiring_declared_at: expect.anything(),
      }),
    );
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: "Ada",
        berlin_locality: "Mitte",
        lawful_hiring_declared: true,
        organisation_legal_name: null,
      }),
    );
  });

  it("does not attempt the UPDATE and returns a restricted state when already suspended", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    rpc.mockResolvedValue({ data: true, error: null });
    const chain = mockUpdateChain(null);
    from.mockReturnValue(chain);

    const state = await savePrivateEmployerAction(
      { error: null, message: null },
      form({
        displayName: "Ada",
        berlinLocality: "Mitte",
        phone: "",
        website: "",
        lawfulHiringDeclared: "yes",
      }),
    );

    expect(state.message).toBeNull();
    expect(state.error).toMatch(/restricted/i);
    expect(chain.update).not.toHaveBeenCalled();
  });

  it("returns a restricted state, not a false success, when the UPDATE affects zero rows", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    // Pre-check passes (not suspended), but the UPDATE itself returns zero
    // rows and a re-check now reports suspended — the exact race this
    // fixes.
    rpc
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    const chain = mockUpdateChain(null, null);
    from.mockReturnValue(chain);

    const state = await savePrivateEmployerAction(
      { error: null, message: null },
      form({
        displayName: "Ada",
        berlinLocality: "Mitte",
        phone: "",
        website: "",
        lawfulHiringDeclared: "yes",
      }),
    );

    expect(state.message).toBeNull();
    expect(state.error).toMatch(/restricted/i);
  });

  it("bootstraps organisation via RPC without owner inputs", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    rpc.mockImplementation((name: string) => {
      if (name === "bootstrap_organisation_employer") {
        return Promise.resolve({
          data: {
            status: "ok",
            employer_id: "11111111-1111-4111-8111-111111111111",
            company_id: "22222222-2222-4222-8222-222222222222",
          },
          error: null,
        });
      }
      return Promise.resolve({ data: false, error: null });
    });

    const state = await saveOrganisationEmployerAction(
      { error: null, message: null },
      form({
        displayName: "Ada",
        organisationLegalName: "Ada GmbH",
        berlinLocality: "Kreuzberg",
        companyName: "Ada Care",
        companySlug: "ada-care-test",
      }),
    );

    expect(state.message).toMatch(/saved/i);
    expect(rpc).toHaveBeenCalledWith(
      "bootstrap_organisation_employer",
      expect.objectContaining({
        p_display_name: "Ada",
        p_company_slug: "ada-care-test",
      }),
    );
    const call = rpc.mock.calls.find(
      ([name]) => name === "bootstrap_organisation_employer",
    );
    const args = call?.[1] as Record<string, unknown>;
    expect(args).not.toHaveProperty("owner_employer_id");
    expect(args).not.toHaveProperty("source");
  });

  it("maps slug conflicts from bootstrap", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    rpc.mockImplementation((name: string) => {
      if (name === "bootstrap_organisation_employer") {
        return Promise.resolve({
          data: { status: "conflict_unique" },
          error: null,
        });
      }
      return Promise.resolve({ data: false, error: null });
    });

    const state = await saveOrganisationEmployerAction(
      { error: null, message: null },
      form({
        displayName: "Ada",
        organisationLegalName: "Ada GmbH",
        berlinLocality: "Kreuzberg",
        companyName: "Ada Care",
        companySlug: "taken-slug",
      }),
    );
    expect(state.error).toMatch(/already in use/i);
  });

  it("completes private onboarding through RPC", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const maybeSingle = vi.fn().mockResolvedValue({
      data: { employer_type: "private" },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const chain = mockUpdateChain(null);
    from.mockImplementation((table: string) => {
      if (table === "employer_profiles") {
        return { select, update: chain.update };
      }
      return {};
    });
    rpc.mockImplementation((name: string) => {
      if (name === "complete_employer_onboarding") {
        return Promise.resolve({
          data: { status: "completed", already_complete: false },
          error: null,
        });
      }
      return Promise.resolve({ data: false, error: null });
    });

    await expect(
      completeEmployerOnboardingAction(
        { error: null, message: null },
        form({
          displayName: "Ada",
          berlinLocality: "Mitte",
          lawfulHiringDeclared: "yes",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/employer");

    expect(rpc).toHaveBeenCalledWith("complete_employer_onboarding");
  });

  it("maps an unavailable completion result to a restricted state", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const maybeSingle = vi.fn().mockResolvedValue({
      data: { employer_type: "private" },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const chain = mockUpdateChain(null);
    from.mockImplementation((table: string) => {
      if (table === "employer_profiles") {
        return { select, update: chain.update };
      }
      return {};
    });
    rpc.mockImplementation((name: string) => {
      if (name === "complete_employer_onboarding") {
        return Promise.resolve({
          data: { status: "unavailable" },
          error: null,
        });
      }
      return Promise.resolve({ data: false, error: null });
    });

    const state = await completeEmployerOnboardingAction(
      { error: null, message: null },
      form({
        displayName: "Ada",
        berlinLocality: "Mitte",
        lawfulHiringDeclared: "yes",
      }),
    );

    expect(state.error).toMatch(/restricted/i);
    expect(redirect).not.toHaveBeenCalled();
  });
});
