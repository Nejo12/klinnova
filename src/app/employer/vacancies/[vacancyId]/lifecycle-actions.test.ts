import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
const requireAuthenticatedEmployer = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath }));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ rpc })),
}));

vi.mock("@/lib/employer/vacancies/require-authenticated-employer", () => ({
  requireAuthenticatedEmployer,
}));

import {
  fillEmployerVacancyAction,
  materializeEmployerVacancyExpiryAction,
  pauseEmployerVacancyAction,
  publishEmployerVacancyAction,
  renewEmployerVacancyAction,
  resumeEmployerVacancyAction,
  withdrawEmployerVacancyAction,
} from "@/app/employer/vacancies/[vacancyId]/lifecycle-actions";

const vacancyId = "44444444-4444-4444-8444-444444444444";

function form(data: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value);
  }
  return formData;
}

beforeEach(() => {
  rpc.mockReset();
  requireAuthenticatedEmployer.mockReset();
  revalidatePath.mockClear();
  requireAuthenticatedEmployer.mockResolvedValue({
    ok: true,
    supabase: { rpc },
    userId: "emp-1",
  });
});

describe("publishEmployerVacancyAction", () => {
  it("rejects an invalid vacancy id before checking the gate", async () => {
    const state = await publishEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId: "bad-id", confirmed: "true" }),
    );
    expect(state.error).toBeTruthy();
    expect(requireAuthenticatedEmployer).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects an unconfirmed publish before calling the RPC", async () => {
    const state = await publishEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId }),
    );
    expect(state.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("denies an unauthenticated caller", async () => {
    requireAuthenticatedEmployer.mockResolvedValue({ ok: false });
    const state = await publishEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId, confirmed: "true" }),
    );
    expect(state.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls the RPC with only the vacancy id and revalidates on success", async () => {
    rpc.mockResolvedValue({
      data: { status: "ok", vacancy_id: vacancyId },
      error: null,
    });

    const state = await publishEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId, confirmed: "true" }),
    );

    expect(rpc).toHaveBeenCalledWith("publish_employer_vacancy", {
      p_vacancy_id: vacancyId,
    });
    expect(rpc.mock.calls[0]?.[1]).toEqual({ p_vacancy_id: vacancyId });
    expect(state.error).toBeNull();
    expect(state.message).toMatch(/published/i);
    expect(revalidatePath).toHaveBeenCalledWith("/employer/vacancies");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/employer/vacancies/${vacancyId}`,
    );
  });

  it("surfaces the missing-fields list on an incomplete result", async () => {
    rpc.mockResolvedValue({
      data: { status: "incomplete", missing: ["verification", "salary"] },
      error: null,
    });

    const state = await publishEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId, confirmed: "true" }),
    );

    expect(state.error).toBeTruthy();
    expect(state.missing).toEqual(["verification", "salary"]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("maps a stale invalid_state result", async () => {
    rpc.mockResolvedValue({ data: { status: "invalid_state" }, error: null });

    const state = await publishEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId, confirmed: "true" }),
    );

    expect(state.error).toMatch(/status changed/i);
    expect(state.missing).toBeUndefined();
  });

  it("normalizes a transport error without leaking raw details", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied for table vacancies" },
    });

    const state = await publishEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId, confirmed: "true" }),
    );

    expect(state.error).not.toMatch(/permission denied/i);
    expect(state.error).toMatch(/went wrong/i);
  });

  it("normalizes an unparseable RPC payload", async () => {
    rpc.mockResolvedValue({ data: { unexpected: "shape" }, error: null });

    const state = await publishEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId, confirmed: "true" }),
    );

    expect(state.error).toMatch(/went wrong/i);
  });
});

describe("pauseEmployerVacancyAction", () => {
  it("calls pause_employer_vacancy with only the vacancy id", async () => {
    rpc.mockResolvedValue({
      data: { status: "ok", vacancy_id: vacancyId },
      error: null,
    });

    await pauseEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId, confirmed: "true" }),
    );

    expect(rpc).toHaveBeenCalledWith("pause_employer_vacancy", {
      p_vacancy_id: vacancyId,
    });
  });

  it("rejects duplicate pause attempts deterministically (invalid_state)", async () => {
    rpc.mockResolvedValue({ data: { status: "invalid_state" }, error: null });

    const state = await pauseEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId, confirmed: "true" }),
    );

    expect(state.error).toMatch(/status changed/i);
  });
});

describe("resumeEmployerVacancyAction", () => {
  it("passes a server-computed fallback expiry alongside the vacancy id, never caller-supplied", async () => {
    rpc.mockResolvedValue({
      data: { status: "ok", vacancy_id: vacancyId },
      error: null,
    });

    await resumeEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId, confirmed: "true", expiresAt: "2099-01-01T00:00:00Z" }),
    );

    const call = rpc.mock.calls[0];
    expect(call?.[0]).toBe("resume_employer_vacancy");
    expect(call?.[1]).toHaveProperty("p_vacancy_id", vacancyId);
    expect(call?.[1]).toHaveProperty("p_expires_at");
    // The caller-supplied "expiresAt" form field is never read or forwarded.
    expect(call?.[1].p_expires_at).not.toBe("2099-01-01T00:00:00Z");
  });

  it("surfaces missing-fields on an incomplete resume (e.g. revoked verification)", async () => {
    rpc.mockResolvedValue({
      data: { status: "incomplete", missing: ["verification"] },
      error: null,
    });

    const state = await resumeEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId, confirmed: "true" }),
    );

    expect(state.missing).toEqual(["verification"]);
  });

  it("denies an unverified/revoked employer via the RPC's own incomplete result, not a client bypass", async () => {
    requireAuthenticatedEmployer.mockResolvedValue({
      ok: true,
      supabase: { rpc },
      userId: "emp-1",
    });
    rpc.mockResolvedValue({
      data: { status: "incomplete", missing: ["verification"] },
      error: null,
    });

    const state = await resumeEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId, confirmed: "true" }),
    );

    expect(state.error).toBeTruthy();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("fillEmployerVacancyAction", () => {
  it("requires confirmation before calling the RPC", async () => {
    const state = await fillEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId }),
    );
    expect(state.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls fill_employer_vacancy with only the vacancy id on confirmed submit", async () => {
    rpc.mockResolvedValue({
      data: { status: "ok", vacancy_id: vacancyId },
      error: null,
    });

    const state = await fillEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId, confirmed: "true" }),
    );

    expect(rpc).toHaveBeenCalledWith("fill_employer_vacancy", {
      p_vacancy_id: vacancyId,
    });
    expect(state.message).toMatch(/filled/i);
  });
});

describe("withdrawEmployerVacancyAction", () => {
  it("requires confirmation before calling the RPC", async () => {
    const state = await withdrawEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId }),
    );
    expect(state.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls withdraw_employer_vacancy with only the vacancy id on confirmed submit", async () => {
    rpc.mockResolvedValue({
      data: { status: "ok", vacancy_id: vacancyId },
      error: null,
    });

    const state = await withdrawEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId, confirmed: "true" }),
    );

    expect(rpc).toHaveBeenCalledWith("withdraw_employer_vacancy", {
      p_vacancy_id: vacancyId,
    });
    expect(state.message).toMatch(/withdrawn/i);
  });
});

describe("materializeEmployerVacancyExpiryAction", () => {
  it("does not require confirmation (idempotent, non-destructive)", async () => {
    rpc.mockResolvedValue({
      data: { status: "ok", vacancy_id: vacancyId },
      error: null,
    });

    const state = await materializeEmployerVacancyExpiryAction(
      { error: null, message: null },
      form({ vacancyId }),
    );

    expect(rpc).toHaveBeenCalledWith("materialize_employer_vacancy_expiry", {
      p_vacancy_id: vacancyId,
    });
    expect(state.error).toBeNull();
  });
});

describe("renewEmployerVacancyAction", () => {
  it("requires confirmation before calling the RPC", async () => {
    const state = await renewEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId }),
    );
    expect(state.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls renew_employer_vacancy_to_draft with only the vacancy id", async () => {
    rpc.mockResolvedValue({
      data: { status: "ok", vacancy_id: vacancyId },
      error: null,
    });

    const state = await renewEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId, confirmed: "true" }),
    );

    expect(rpc).toHaveBeenCalledWith("renew_employer_vacancy_to_draft", {
      p_vacancy_id: vacancyId,
    });
    expect(state.message).toMatch(/renewed/i);
  });

  it("maps invalid_state when the vacancy is not actually expired", async () => {
    rpc.mockResolvedValue({ data: { status: "invalid_state" }, error: null });

    const state = await renewEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId, confirmed: "true" }),
    );

    expect(state.error).toMatch(/status changed/i);
  });
});

describe("stale-state concurrency across actions", () => {
  it("a second session's fill attempt on an already-withdrawn vacancy fails deterministically", async () => {
    rpc.mockResolvedValue({ data: { status: "invalid_state" }, error: null });

    const state = await fillEmployerVacancyAction(
      { error: null, message: null },
      form({ vacancyId, confirmed: "true" }),
    );

    expect(state.error).toBeTruthy();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
