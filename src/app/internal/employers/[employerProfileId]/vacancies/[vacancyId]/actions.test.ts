import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
const requireActiveOperator = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath }));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ rpc })),
}));

vi.mock("@/lib/internal/verification/operator-gate", () => ({
  requireActiveOperator,
}));

import {
  moderateVacancyAction,
  restoreVacancyAction,
} from "@/app/internal/employers/[employerProfileId]/vacancies/[vacancyId]/actions";

const employerProfileId = "33333333-3333-4333-8333-333333333333";
const vacancyId = "44444444-4444-4444-8444-444444444444";

function form(data: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value);
  }
  return formData;
}

function resetAll() {
  rpc.mockReset();
  requireActiveOperator.mockReset();
  revalidatePath.mockClear();
  requireActiveOperator.mockResolvedValue({
    ok: true,
    supabase: { rpc },
    userId: "op-1",
  });
}

describe("moderateVacancyAction", () => {
  beforeEach(resetAll);

  it("rejects a malformed vacancy id before checking the gate", async () => {
    const state = await moderateVacancyAction(
      { error: null, message: null },
      form({
        vacancyId: "not-a-uuid",
        employerProfileId,
        reason: "Misleading listing",
        confirmModerate: "true",
      }),
    );

    expect(state.error).toBeTruthy();
    expect(requireActiveOperator).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a blank reason before calling the RPC", async () => {
    const state = await moderateVacancyAction(
      { error: null, message: null },
      form({
        vacancyId,
        employerProfileId,
        reason: "",
        confirmModerate: "true",
      }),
    );

    expect(state.fieldErrors?.reason).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects an unconfirmed moderation before calling the RPC", async () => {
    const state = await moderateVacancyAction(
      { error: null, message: null },
      form({ vacancyId, employerProfileId, reason: "Misleading listing" }),
    );

    expect(state.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("trims the reason and calls the RPC with only the vacancy id and reason", async () => {
    rpc.mockResolvedValue({
      data: { status: "ok", vacancy_id: vacancyId },
      error: null,
    });

    const state = await moderateVacancyAction(
      { error: null, message: null },
      form({
        vacancyId,
        employerProfileId,
        reason: "  Misleading listing  ",
        confirmModerate: "true",
      }),
    );

    expect(state.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith("moderate_vacancy", {
      p_vacancy_id: vacancyId,
      p_reason: "Misleading listing",
    });
    expect(revalidatePath).toHaveBeenCalledWith(
      `/internal/employers/${employerProfileId}`,
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      `/internal/employers/${employerProfileId}/vacancies/${vacancyId}`,
    );
  });

  it("denies a non-operator without exposing why", async () => {
    requireActiveOperator.mockResolvedValue({
      ok: false,
      reason: "not_operator",
    });

    const state = await moderateVacancyAction(
      { error: null, message: null },
      form({
        vacancyId,
        employerProfileId,
        reason: "Misleading listing",
        confirmModerate: "true",
      }),
    );

    expect(state.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("restoreVacancyAction", () => {
  beforeEach(resetAll);

  it("rejects an unconfirmed restore before calling the RPC", async () => {
    const state = await restoreVacancyAction(
      { error: null, message: null },
      form({ vacancyId, employerProfileId }),
    );

    expect(state.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls the RPC with only the vacancy id on success", async () => {
    rpc.mockResolvedValue({
      data: { status: "ok", vacancy_id: vacancyId },
      error: null,
    });

    const state = await restoreVacancyAction(
      { error: null, message: null },
      form({ vacancyId, employerProfileId, confirmRestore: "true" }),
    );

    expect(state.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith("restore_vacancy", {
      p_vacancy_id: vacancyId,
    });
  });

  it("maps an already_in_state result", async () => {
    rpc.mockResolvedValue({
      data: { status: "already_in_state", vacancy_id: vacancyId },
      error: null,
    });

    const state = await restoreVacancyAction(
      { error: null, message: null },
      form({ vacancyId, employerProfileId, confirmRestore: "true" }),
    );

    expect(state.error).toMatch(/already changed/i);
  });
});
