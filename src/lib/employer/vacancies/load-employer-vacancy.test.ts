import { beforeEach, describe, expect, it, vi } from "vitest";

const loadEmployerProfile = vi.hoisted(() => vi.fn());
const maybeSingle = vi.hoisted(() => vi.fn());
const languageOrder = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/employer/load-employer", () => ({
  loadEmployerProfile,
}));

import { loadEmployerVacancy } from "@/lib/employer/vacancies/load-employer-vacancy";

function makeClient() {
  const eqId = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({ maybeSingle })),
    })),
  }));
  const selectVacancy = vi.fn(() => ({ eq: eqId }));

  const languageEq = vi.fn(() => ({ order: languageOrder }));
  const selectLanguages = vi.fn(() => ({ eq: languageEq }));

  const from = vi.fn((table: string) => {
    if (table === "vacancies") {
      return { select: selectVacancy };
    }
    return { select: selectLanguages };
  });

  return {
    from,
    rpc,
    auth: { getUser: vi.fn() },
  };
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
    verificationState: "verified",
    onboardingCompletedAt: "2026-08-01T00:00:00Z",
    company: null,
    typeLocked: true,
  },
};

const baseRow = {
  id: "22222222-2222-4222-8222-222222222299",
  title: "Cleaner",
  job_category: "cleaning",
  public_locality: "Mitte",
  description: "Wash floors",
  workplace_type: "private_home",
  work_frequency: "recurring",
  available_from: null,
  experience_notes: null,
  cv_required: true,
  interview_english_ok: true,
  salary_amount_cents: 1500,
  salary_currency: "EUR",
  salary_period: "hourly",
  salary_is_gross: true,
  updated_at: "2026-08-04T00:00:00Z",
  created_at: "2026-08-04T00:00:00Z",
  source: "employer",
  employer_profile_id: "emp-1",
  companies: null,
  published_at: null,
  paused_at: null,
  filled_at: null,
  withdrawn_at: null,
  expired_at: null,
  expires_at: null,
};

describe("loadEmployerVacancy", () => {
  beforeEach(() => {
    loadEmployerProfile.mockReset();
    maybeSingle.mockReset();
    languageOrder.mockReset();
    rpc.mockReset();
    loadEmployerProfile.mockResolvedValue(completedProfile);
    languageOrder.mockResolvedValue({ data: [], error: null });
  });

  it("returns unavailable for invalid UUID", async () => {
    const result = await loadEmployerVacancy(makeClient() as never, "bad-id");
    expect(result).toMatchObject({ ok: false, reason: "unavailable" });
  });

  it("returns unavailable when no owned row exists", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await loadEmployerVacancy(
      makeClient() as never,
      "22222222-2222-4222-8222-222222222299",
    );

    expect(result).toMatchObject({ ok: false, reason: "unavailable" });
  });

  it("loads a draft with readiness fetched", async () => {
    maybeSingle.mockResolvedValue({
      data: { ...baseRow, publication_state: "draft" },
      error: null,
    });
    rpc.mockResolvedValue({
      data: { status: "ok", ready: false, missing: ["languages"] },
      error: null,
    });

    const result = await loadEmployerVacancy(
      makeClient() as never,
      "22222222-2222-4222-8222-222222222299",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.vacancy.publicationState).toBe("draft");
    expect(result.vacancy.readinessAvailable).toBe(true);
    expect(result.vacancy.ready).toBe(false);
    expect(rpc).toHaveBeenCalledWith("employer_vacancy_draft_readiness", {
      p_vacancy_id: baseRow.id,
    });
  });

  it("does not fetch readiness for a published vacancy", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        ...baseRow,
        publication_state: "published",
        published_at: "2026-08-04T00:00:00Z",
        expires_at: "2026-09-03T00:00:00Z",
      },
      error: null,
    });

    const result = await loadEmployerVacancy(
      makeClient() as never,
      "22222222-2222-4222-8222-222222222299",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.vacancy.readinessAvailable).toBe(false);
    expect(result.vacancy.ready).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("marks a published vacancy with an elapsed expiry as effectively expired", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        ...baseRow,
        publication_state: "published",
        published_at: "2026-07-01T00:00:00Z",
        expires_at: "2026-07-31T00:00:00Z",
      },
      error: null,
    });

    const result = await loadEmployerVacancy(
      makeClient() as never,
      "22222222-2222-4222-8222-222222222299",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.vacancy.isEffectivelyExpired).toBe(true);
  });

  it("does not mark a published vacancy with a future expiry as effectively expired", async () => {
    const future = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    maybeSingle.mockResolvedValue({
      data: {
        ...baseRow,
        publication_state: "published",
        published_at: "2026-08-04T00:00:00Z",
        expires_at: future,
      },
      error: null,
    });

    const result = await loadEmployerVacancy(
      makeClient() as never,
      "22222222-2222-4222-8222-222222222299",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.vacancy.isEffectivelyExpired).toBe(false);
  });

  it("never marks a non-published state as effectively expired", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        ...baseRow,
        publication_state: "paused",
        published_at: "2026-07-01T00:00:00Z",
        paused_at: "2026-07-15T00:00:00Z",
        expires_at: "2026-07-31T00:00:00Z",
      },
      error: null,
    });

    const result = await loadEmployerVacancy(
      makeClient() as never,
      "22222222-2222-4222-8222-222222222299",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.vacancy.isEffectivelyExpired).toBe(false);
  });

  it("carries lifecycle timestamps and the employer's verification state through", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        ...baseRow,
        publication_state: "withdrawn",
        published_at: "2026-07-01T00:00:00Z",
        withdrawn_at: "2026-07-20T00:00:00Z",
      },
      error: null,
    });

    const result = await loadEmployerVacancy(
      makeClient() as never,
      "22222222-2222-4222-8222-222222222299",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.vacancy.withdrawnAt).toBe("2026-07-20T00:00:00Z");
    expect(result.vacancy.verificationState).toBe("verified");
  });
});
