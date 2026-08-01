import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const update = vi.hoisted(() => vi.fn());
const eq = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());
const syncCandidateLanguages = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
);

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/onboarding/sync-languages", () => ({
  syncCandidateLanguages,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser },
    rpc,
    from: () => ({
      update: (payload: Record<string, unknown>) => {
        update(payload);
        return {
          eq: (...args: unknown[]) => {
            eq(...args);
            return Promise.resolve({ error: null });
          },
        };
      },
    }),
  })),
}));

import {
  completeOnboardingAction,
  saveCategoriesGroupAction,
  saveLanguagesGroupAction,
  saveWorkAuthorisationGroupAction,
} from "@/app/candidate/onboarding/actions";

function form(entries: Array<[string, string]>): FormData {
  const formData = new FormData();
  entries.forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}

describe("onboarding actions", () => {
  beforeEach(() => {
    getUser.mockReset();
    update.mockReset();
    eq.mockReset();
    rpc.mockReset();
    syncCandidateLanguages.mockReset();
    redirect.mockClear();
  });

  it("requires authentication", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const state = await saveCategoriesGroupAction(
      { error: null, message: null },
      form([["jobCategories", "cleaning"]]),
    );
    expect(state.error).toMatch(/session/i);
    expect(update).not.toHaveBeenCalled();
  });

  it("validates before mutating", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const state = await saveCategoriesGroupAction(
      { error: null, message: null },
      form([]),
    );
    expect(state.error).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });

  it("writes owner profile columns without protected timestamps or reconcile RPC", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    await expect(
      saveWorkAuthorisationGroupAction(
        { error: null, message: null },
        form([["workAuthorisationDeclared", "yes"]]),
      ),
    ).rejects.toThrow("REDIRECT:/candidate/onboarding?group=location");

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        work_authorisation_declared: true,
        updated_at: expect.any(String),
      }),
    );
    const payload = update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("onboarding_completed_at");
    expect(payload).not.toHaveProperty("work_authorisation_declared_at");
    expect(eq).toHaveBeenCalledWith("id", "user-1");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("syncs languages for authenticated user id only without reconcile RPC", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    syncCandidateLanguages.mockResolvedValue({ ok: true });

    await expect(
      saveLanguagesGroupAction(
        { error: null, message: null },
        form([
          ["germanComfort", "basic"],
          ["languageCode", "de"],
          ["proficiency", "native"],
        ]),
      ),
    ).rejects.toThrow(
      "REDIRECT:/candidate/onboarding?group=work_authorisation",
    );

    expect(syncCandidateLanguages).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      [{ languageCode: "de", proficiency: "native" }],
    );
    const payload = update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toEqual(
      expect.objectContaining({
        german_comfort: "basic",
        updated_at: expect.any(String),
      }),
    );
    expect(payload).not.toHaveProperty("onboarding_completed_at");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("routes completion through the controlled RPC only", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    rpc.mockResolvedValue({
      data: { status: "completed", already_complete: false },
      error: null,
    });

    await expect(
      completeOnboardingAction({ error: null, message: null }, form([])),
    ).rejects.toThrow("REDIRECT:/candidate");

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("complete_candidate_onboarding");
    expect(update).not.toHaveBeenCalled();
  });

  it("routes incomplete completion results to the first missing group", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    rpc.mockResolvedValue({
      data: {
        status: "incomplete",
        first_incomplete_group: "availability",
      },
      error: null,
    });

    await expect(
      completeOnboardingAction({ error: null, message: null }, form([])),
    ).rejects.toThrow("REDIRECT:/candidate/onboarding?group=availability");
  });

  it("maps completion RPC failures to a safe error", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    const state = await completeOnboardingAction(
      { error: null, message: null },
      form([]),
    );
    expect(state.error).toMatch(/could not confirm/i);
  });
});
