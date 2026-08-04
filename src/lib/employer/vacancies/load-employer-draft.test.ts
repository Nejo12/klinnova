import { beforeEach, describe, expect, it, vi } from "vitest";

const loadEmployerProfile = vi.hoisted(() => vi.fn());
const maybeSingle = vi.hoisted(() => vi.fn());
const languageOrder = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/employer/load-employer", () => ({
  loadEmployerProfile,
}));

import { loadEmployerDraft } from "@/lib/employer/vacancies/load-employer-draft";

function makeClient() {
  const eqId = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle })),
      })),
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

describe("loadEmployerDraft", () => {
  beforeEach(() => {
    loadEmployerProfile.mockReset();
    maybeSingle.mockReset();
    languageOrder.mockReset();
    rpc.mockReset();
  });

  it("redirects incomplete employers via incomplete reason", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      userId: "emp-1",
      data: {
        id: "emp-1",
        employerType: "private",
        displayName: "Ada",
        berlinLocality: "Mitte",
        phone: null,
        website: null,
        organisationLegalName: null,
        lawfulHiringDeclared: true,
        verificationState: "unverified",
        onboardingCompletedAt: null,
        company: null,
        typeLocked: false,
      },
    });

    const result = await loadEmployerDraft(
      makeClient() as never,
      "22222222-2222-4222-8222-222222222299",
    );

    expect(result).toMatchObject({ ok: false, reason: "incomplete" });
  });

  it("returns unavailable for invalid UUID", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      userId: "emp-1",
      data: {
        id: "emp-1",
        employerType: "private",
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
    });

    const result = await loadEmployerDraft(makeClient() as never, "bad-id");
    expect(result).toMatchObject({ ok: false, reason: "unavailable" });
  });

  it("returns unavailable when no owned draft row exists", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      userId: "emp-1",
      data: {
        id: "emp-1",
        employerType: "private",
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
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await loadEmployerDraft(
      makeClient() as never,
      "22222222-2222-4222-8222-222222222299",
    );

    expect(result).toMatchObject({ ok: false, reason: "unavailable" });
  });

  it("loads owned draft with languages and readiness", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: true,
      userId: "emp-1",
      data: {
        id: "emp-1",
        employerType: "private",
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
    });
    maybeSingle.mockResolvedValue({
      data: {
        id: "22222222-2222-4222-8222-222222222299",
        title: "Cleaner",
        job_category: "cleaning",
        public_locality: "Mitte",
        description: "Wash floors",
        workplace_type: null,
        work_frequency: null,
        available_from: null,
        experience_notes: null,
        cv_required: null,
        interview_english_ok: null,
        salary_amount_cents: 1500,
        salary_currency: "EUR",
        salary_period: "hourly",
        salary_is_gross: true,
        updated_at: "2026-08-04T00:00:00Z",
        created_at: "2026-08-04T00:00:00Z",
        source: "employer",
        publication_state: "draft",
        employer_profile_id: "emp-1",
        companies: null,
      },
      error: null,
    });
    languageOrder.mockResolvedValue({
      data: [{ language_code: "en", min_proficiency: "basic" }],
      error: null,
    });
    rpc.mockResolvedValue({
      data: { status: "ok", ready: false, missing: ["languages"] },
      error: null,
    });

    const result = await loadEmployerDraft(
      makeClient() as never,
      "22222222-2222-4222-8222-222222222299",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.draft.title).toBe("Cleaner");
    expect(result.draft.languages).toEqual([
      { languageCode: "en", minProficiency: "basic" },
    ]);
    expect(result.draft.ready).toBe(false);
  });
});
