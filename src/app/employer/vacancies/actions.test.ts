import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());
const loadEmployerProfile = vi.hoisted(() => vi.fn());
const loadEmployerDraft = vi.hoisted(() => vi.fn());
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

vi.mock("@/lib/employer/load-employer", () => ({
  loadEmployerProfile,
}));

vi.mock("@/lib/employer/vacancies/load-employer-draft", () => ({
  loadEmployerDraft,
}));

import {
  createEmployerVacancyDraftAction,
  deleteEmployerVacancyDraftAction,
  replaceEmployerVacancyLanguagesAction,
  updateEmployerVacancyDraftAction,
} from "@/app/employer/vacancies/actions";

function form(data: Record<string, string | string[]>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => formData.append(key, entry));
    } else {
      formData.set(key, value);
    }
  }
  return formData;
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

describe("employer vacancy actions", () => {
  beforeEach(() => {
    getUser.mockReset();
    from.mockReset();
    rpc.mockReset();
    loadEmployerProfile.mockReset();
    loadEmployerDraft.mockReset();
    redirect.mockClear();
    getUser.mockResolvedValue({
      data: { user: { id: "emp-1" } },
      error: null,
    });
    loadEmployerProfile.mockResolvedValue(completedProfile);
  });

  it("rejects unauthenticated create", async () => {
    loadEmployerProfile.mockResolvedValue({
      ok: false,
      reason: "unauthenticated",
      error: "signed in",
    });

    const state = await createEmployerVacancyDraftAction(
      { error: null, message: null },
      form({
        title: "Cleaner",
        jobCategory: "cleaning",
        publicLocality: "Mitte",
      }),
    );

    expect(state.error).toMatch(/signed in/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("creates draft via RPC without protected ownership fields", async () => {
    rpc.mockResolvedValue({
      data: {
        status: "ok",
        vacancy_id: "22222222-2222-4222-8222-222222222299",
      },
      error: null,
    });

    await expect(
      createEmployerVacancyDraftAction(
        { error: null, message: null },
        form({
          title: "Cleaner",
          jobCategory: "cleaning",
          publicLocality: "Mitte",
          description: "Wash floors",
        }),
      ),
    ).rejects.toThrow(
      "REDIRECT:/employer/vacancies/22222222-2222-4222-8222-222222222299/edit",
    );

    expect(rpc).toHaveBeenCalledWith(
      "create_employer_vacancy_draft",
      expect.objectContaining({
        p_title: "Cleaner",
        p_job_category: "cleaning",
        p_public_locality: "Mitte",
      }),
    );

    const args = rpc.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(args).not.toHaveProperty("p_employer_profile_id");
    expect(args).not.toHaveProperty("employer_profile_id");
    expect(args).not.toHaveProperty("company_id");
    expect(args).not.toHaveProperty("p_company_id");
    expect(args).not.toHaveProperty("source");
    expect(args).not.toHaveProperty("publication_state");
  });

  it("updates draft with vacancy id and clear salary flag", async () => {
    rpc.mockResolvedValue({
      data: {
        status: "ok",
        vacancy_id: "22222222-2222-4222-8222-222222222299",
      },
      error: null,
    });

    const state = await updateEmployerVacancyDraftAction(
      { error: null, message: null },
      form({
        vacancyId: "22222222-2222-4222-8222-222222222299",
        title: "Cleaner",
        jobCategory: "cleaning",
        publicLocality: "Mitte",
        description: "Wash floors",
        clearSalary: "true",
        cvRequired: "true",
        interviewEnglishOk: "false",
      }),
    );

    expect(state.message).toMatch(/saved/i);
    expect(rpc).toHaveBeenCalledWith(
      "update_employer_vacancy_draft",
      expect.objectContaining({
        p_vacancy_id: "22222222-2222-4222-8222-222222222299",
        p_clear_salary: true,
      }),
    );
  });

  it("replaces languages atomically and rejects duplicates", async () => {
    const invalid = await replaceEmployerVacancyLanguagesAction(
      { error: null, message: null },
      form({
        vacancyId: "22222222-2222-4222-8222-222222222299",
        languageCode: ["en", "en"],
        minProficiency: ["basic", "native"],
      }),
    );
    expect(invalid.error).toMatch(/once/i);
    expect(rpc).not.toHaveBeenCalled();

    rpc.mockResolvedValue({
      data: {
        status: "ok",
        vacancy_id: "22222222-2222-4222-8222-222222222299",
        language_count: 1,
      },
      error: null,
    });

    const state = await replaceEmployerVacancyLanguagesAction(
      { error: null, message: null },
      form({
        vacancyId: "22222222-2222-4222-8222-222222222299",
        languageCode: ["en"],
        minProficiency: ["basic"],
      }),
    );

    expect(state.message).toMatch(/language/i);
    expect(rpc).toHaveBeenCalledWith(
      "replace_employer_vacancy_languages",
      expect.objectContaining({
        p_vacancy_id: "22222222-2222-4222-8222-222222222299",
        p_languages: [{ language_code: "en", min_proficiency: "basic" }],
      }),
    );
  });

  it("deletes via RPC and redirects to list", async () => {
    loadEmployerDraft.mockResolvedValue({
      ok: true,
      draft: { title: "Morning clean" },
    });
    rpc.mockResolvedValue({
      data: {
        status: "ok",
        vacancy_id: "22222222-2222-4222-8222-222222222299",
      },
      error: null,
    });

    await expect(
      deleteEmployerVacancyDraftAction(
        { error: null, message: null },
        form({
          vacancyId: "22222222-2222-4222-8222-222222222299",
          confirmTitle: "Morning clean",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/employer/vacancies");

    expect(loadEmployerDraft).toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("delete_employer_vacancy_draft", {
      p_vacancy_id: "22222222-2222-4222-8222-222222222299",
    });
  });

  it("rejects delete when confirmation does not match persisted title", async () => {
    loadEmployerDraft.mockResolvedValue({
      ok: true,
      draft: { title: "Morning clean" },
    });

    const state = await deleteEmployerVacancyDraftAction(
      { error: null, message: null },
      form({
        vacancyId: "22222222-2222-4222-8222-222222222299",
        confirmTitle: "Wrong title",
      }),
    );

    expect(state.fieldErrors?.confirmTitle).toMatch(/exact draft title/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps unavailable update without leaking ownership", async () => {
    rpc.mockResolvedValue({
      data: { status: "unavailable" },
      error: null,
    });

    const state = await updateEmployerVacancyDraftAction(
      { error: null, message: null },
      form({
        vacancyId: "22222222-2222-4222-8222-222222222299",
        title: "Cleaner",
        jobCategory: "cleaning",
        publicLocality: "Mitte",
        cvRequired: "false",
        interviewEnglishOk: "false",
      }),
    );

    expect(state.error).toMatch(/not available/i);
  });
});
