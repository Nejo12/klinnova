import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());
const ensureEmployerProfile = vi.hoisted(() => vi.fn());
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

function mockUpdateChain(error: { code?: string; message?: string } | null) {
  const eqType = vi.fn().mockResolvedValue({ error });
  const eqId = vi.fn(() => ({ eq: eqType }));
  const update = vi.fn(() => ({ eq: eqId }));
  return { update, eqId, eqType };
}

describe("employer onboarding actions", () => {
  beforeEach(() => {
    getUser.mockReset();
    from.mockReset();
    rpc.mockReset();
    ensureEmployerProfile.mockReset();
    redirect.mockClear();
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

  it("bootstraps organisation via RPC without owner inputs", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    rpc.mockResolvedValue({
      data: {
        status: "ok",
        employer_id: "11111111-1111-4111-8111-111111111111",
        company_id: "22222222-2222-4222-8222-222222222222",
      },
      error: null,
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
    const args = rpc.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(args).not.toHaveProperty("owner_employer_id");
    expect(args).not.toHaveProperty("source");
  });

  it("maps slug conflicts from bootstrap", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    rpc.mockResolvedValue({
      data: { status: "conflict_unique" },
      error: null,
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
    rpc.mockResolvedValue({
      data: { status: "completed", already_complete: false },
      error: null,
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
});
