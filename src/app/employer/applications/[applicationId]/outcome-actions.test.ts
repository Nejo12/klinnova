import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
const requireAuthenticatedEmployer = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
);

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ rpc })),
}));

vi.mock("@/lib/employer/vacancies/require-authenticated-employer", () => ({
  requireAuthenticatedEmployer,
}));

import {
  recordApplicationOutcomeAction,
  voidApplicationOutcomeAction,
} from "@/app/employer/applications/[applicationId]/outcome-actions";

const applicationId = "11111111-1111-4111-8111-111111111111";
const outcomeEventId = "44444444-4444-4444-8444-444444444444";

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
  redirectMock.mockClear();
  requireAuthenticatedEmployer.mockResolvedValue({
    ok: true,
    supabase: { rpc },
    userId: "emp-1",
  });
  // 2026-08-10T10:00:00Z = 12:00 CEST — comfortably inside the same
  // Berlin calendar day for every test that treats "today" as fixed.
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-10T10:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("recordApplicationOutcomeAction", () => {
  it("rejects a malformed application id before checking the gate", async () => {
    const state = await recordApplicationOutcomeAction(
      { kind: "idle" },
      form({
        applicationId: "bad-id",
        outcomeType: "hired",
        occurredAtDate: "2026-08-10",
      }),
    );
    expect(state).toEqual({ kind: "failure" });
    expect(requireAuthenticatedEmployer).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects an unknown outcome type before calling the RPC", async () => {
    const state = await recordApplicationOutcomeAction(
      { kind: "idle" },
      form({
        applicationId,
        outcomeType: "interview_set",
        occurredAtDate: "2026-08-10",
      }),
    );
    expect(state).toEqual({ kind: "failure" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("redirects to login when unauthenticated", async () => {
    requireAuthenticatedEmployer.mockResolvedValue({ ok: false });
    await expect(
      recordApplicationOutcomeAction(
        { kind: "idle" },
        form({
          applicationId,
          outcomeType: "hired",
          occurredAtDate: "2026-08-10",
        }),
      ),
    ).rejects.toThrow(/REDIRECT:\/login/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a future date before ever calling the RPC", async () => {
    const state = await recordApplicationOutcomeAction(
      { kind: "idle" },
      form({
        applicationId,
        outcomeType: "hired",
        occurredAtDate: "2026-08-11",
      }),
    );
    expect(state).toEqual({ kind: "invalid_occurred_at" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends the real current instant for today's date — never a manufactured noon that could land in the future", async () => {
    rpc.mockResolvedValue({
      data: {
        result: "ok",
        outcome_event_id: outcomeEventId,
        outcome_type: "hired",
        occurred_at: "2026-08-10T10:00:00.000Z",
        recorded_at: "2026-08-10T10:00:00.000Z",
      },
      error: null,
    });

    await recordApplicationOutcomeAction(
      { kind: "idle" },
      form({
        applicationId,
        outcomeType: "hired",
        occurredAtDate: "2026-08-10",
      }),
    );

    expect(rpc).toHaveBeenCalledWith("record_application_outcome", {
      p_application_id: applicationId,
      p_outcome_type: "hired",
      p_occurred_at: "2026-08-10T10:00:00.000Z",
    });
  });

  it("converts a past date to 12:00 Europe/Berlin for that date, DST-aware", async () => {
    rpc.mockResolvedValue({
      data: {
        result: "ok",
        outcome_event_id: outcomeEventId,
        outcome_type: "interview_completed",
        occurred_at: "2026-01-15T11:00:00.000Z",
        recorded_at: "2026-08-10T10:00:00.000Z",
      },
      error: null,
    });

    await recordApplicationOutcomeAction(
      { kind: "idle" },
      form({
        applicationId,
        outcomeType: "interview_completed",
        occurredAtDate: "2026-01-15",
      }),
    );

    // 2026-01-15 is CET (UTC+1) — noon Berlin = 11:00 UTC.
    expect(rpc.mock.calls[0]?.[1]).toEqual({
      p_application_id: applicationId,
      p_outcome_type: "interview_completed",
      p_occurred_at: "2026-01-15T11:00:00.000Z",
    });
  });

  it("returns a typed recorded result and revalidates the detail route", async () => {
    rpc.mockResolvedValue({
      data: {
        result: "ok",
        outcome_event_id: outcomeEventId,
        outcome_type: "hired",
        occurred_at: "2026-08-10T10:00:00.000Z",
        recorded_at: "2026-08-10T10:00:00.000Z",
      },
      error: null,
    });

    const state = await recordApplicationOutcomeAction(
      { kind: "idle" },
      form({
        applicationId,
        outcomeType: "hired",
        occurredAtDate: "2026-08-10",
      }),
    );

    expect(state).toEqual({
      kind: "recorded",
      outcomeType: "hired",
      occurredAt: "2026-08-10T10:00:00.000Z",
    });
    expect(revalidatePath).toHaveBeenCalledWith(
      `/employer/applications/${applicationId}`,
    );
  });

  it("returns a distinct already_hired result — not a generic failure", async () => {
    rpc.mockResolvedValue({ data: { result: "already_hired" }, error: null });

    const state = await recordApplicationOutcomeAction(
      { kind: "idle" },
      form({
        applicationId,
        outcomeType: "hired",
        occurredAtDate: "2026-08-10",
      }),
    );

    expect(state).toEqual({ kind: "already_hired" });
  });

  it("returns a distinct invalid_occurred_at result reported by the RPC itself", async () => {
    rpc.mockResolvedValue({
      data: { result: "invalid_occurred_at" },
      error: null,
    });

    const state = await recordApplicationOutcomeAction(
      { kind: "idle" },
      form({
        applicationId,
        outcomeType: "hired",
        occurredAtDate: "2026-08-10",
      }),
    );

    expect(state).toEqual({ kind: "invalid_occurred_at" });
  });

  it("collapses unauthenticated/incomplete/suspended/deleted-employer/unowned/deleted-candidate into one bounded unavailable result — never a more specific client-side branch", async () => {
    rpc.mockResolvedValue({ data: { result: "unavailable" }, error: null });

    const state = await recordApplicationOutcomeAction(
      { kind: "idle" },
      form({
        applicationId,
        outcomeType: "hired",
        occurredAtDate: "2026-08-10",
      }),
    );

    expect(state).toEqual({ kind: "unavailable" });
    // No redirect on `unavailable` — this RPC has no `employer_unavailable`
    // discriminant to redirect on (unlike the status-transition RPC).
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("normalizes a transport error without leaking raw details", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: {
        message: "permission denied for table application_outcome_events",
      },
    });

    const state = await recordApplicationOutcomeAction(
      { kind: "idle" },
      form({
        applicationId,
        outcomeType: "hired",
        occurredAtDate: "2026-08-10",
      }),
    );

    expect(state).toEqual({ kind: "failure" });
  });

  it("normalizes an unparseable RPC payload", async () => {
    rpc.mockResolvedValue({ data: { unexpected: "shape" }, error: null });

    const state = await recordApplicationOutcomeAction(
      { kind: "idle" },
      form({
        applicationId,
        outcomeType: "hired",
        occurredAtDate: "2026-08-10",
      }),
    );

    expect(state).toEqual({ kind: "failure" });
  });
});

describe("voidApplicationOutcomeAction", () => {
  it("rejects a malformed outcome event id before checking the gate", async () => {
    const state = await voidApplicationOutcomeAction(
      { kind: "idle" },
      form({ applicationId, outcomeEventId: "bad-id" }),
    );
    expect(state).toEqual({ kind: "failure" });
    expect(requireAuthenticatedEmployer).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("redirects to login when unauthenticated", async () => {
    requireAuthenticatedEmployer.mockResolvedValue({ ok: false });
    await expect(
      voidApplicationOutcomeAction(
        { kind: "idle" },
        form({ applicationId, outcomeEventId }),
      ),
    ).rejects.toThrow(/REDIRECT:\/login/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends only the outcome event id — never an application id, employer id, or reason", async () => {
    rpc.mockResolvedValue({
      data: {
        result: "ok",
        outcome_event_id: outcomeEventId,
        voided_at: "2026-08-10T10:00:00.000Z",
      },
      error: null,
    });

    await voidApplicationOutcomeAction(
      { kind: "idle" },
      form({ applicationId, outcomeEventId }),
    );

    expect(rpc).toHaveBeenCalledWith("void_application_outcome", {
      p_outcome_event_id: outcomeEventId,
    });
  });

  it("returns a typed voided result and revalidates the detail route", async () => {
    rpc.mockResolvedValue({
      data: {
        result: "ok",
        outcome_event_id: outcomeEventId,
        voided_at: "2026-08-10T10:00:00.000Z",
      },
      error: null,
    });

    const state = await voidApplicationOutcomeAction(
      { kind: "idle" },
      form({ applicationId, outcomeEventId }),
    );

    expect(state).toEqual({ kind: "voided" });
    expect(revalidatePath).toHaveBeenCalledWith(
      `/employer/applications/${applicationId}`,
    );
  });

  it("returns a distinct already_voided result — not a generic failure", async () => {
    rpc.mockResolvedValue({
      data: { result: "already_voided" },
      error: null,
    });

    const state = await voidApplicationOutcomeAction(
      { kind: "idle" },
      form({ applicationId, outcomeEventId }),
    );

    expect(state).toEqual({ kind: "already_voided" });
  });

  it("collapses every authorization/ownership case into one bounded unavailable result", async () => {
    rpc.mockResolvedValue({ data: { result: "unavailable" }, error: null });

    const state = await voidApplicationOutcomeAction(
      { kind: "idle" },
      form({ applicationId, outcomeEventId }),
    );

    expect(state).toEqual({ kind: "unavailable" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("normalizes a transport error without leaking raw details", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    const state = await voidApplicationOutcomeAction(
      { kind: "idle" },
      form({ applicationId, outcomeEventId }),
    );

    expect(state).toEqual({ kind: "failure" });
  });
});
