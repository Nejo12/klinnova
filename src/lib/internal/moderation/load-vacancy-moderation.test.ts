import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActiveOperator = vi.hoisted(() => vi.fn());

vi.mock("@/lib/internal/verification/operator-gate", () => ({
  requireActiveOperator,
}));

import { loadVacancyModeration } from "@/lib/internal/moderation/load-vacancy-moderation";

const employerProfileId = "11111111-1111-4111-8111-111111111111";
const otherEmployerProfileId = "99999999-9999-4999-8999-999999999999";
const vacancyId = "22222222-2222-4222-8222-222222222222";

function makeGatedClient(rpcResult: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  return { rpc };
}

const readyStatus = {
  status: "ready" as const,
  vacancy_id: vacancyId,
  title: "Cleaning role",
  employer_profile_id: employerProfileId,
  publication_state: "published" as const,
  moderated: false,
  moderated_at: null,
  moderated_reason: null,
  audit_events: [],
};

describe("loadVacancyModeration", () => {
  beforeEach(() => {
    requireActiveOperator.mockReset();
  });

  it("propagates gate denial without calling the RPC", async () => {
    requireActiveOperator.mockResolvedValue({
      ok: false,
      reason: "not_operator",
    });

    const result = await loadVacancyModeration(
      {} as never,
      employerProfileId,
      vacancyId,
    );

    expect(result).toEqual({ ok: false, reason: "not_operator" });
  });

  it("returns unavailable for a malformed vacancy id without calling the RPC", async () => {
    const client = makeGatedClient({ data: null, error: null });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadVacancyModeration(
      {} as never,
      employerProfileId,
      "not-a-uuid",
    );

    expect(result).toEqual({ ok: false, reason: "unavailable" });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("returns unavailable when the vacancy belongs to a different employer than the route", async () => {
    const client = makeGatedClient({ data: readyStatus, error: null });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadVacancyModeration(
      {} as never,
      otherEmployerProfileId,
      vacancyId,
    );

    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });

  it("returns the vacancy when the route employer matches", async () => {
    const client = makeGatedClient({ data: readyStatus, error: null });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadVacancyModeration(
      {} as never,
      employerProfileId,
      vacancyId,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.vacancy.vacancyId).toBe(vacancyId);
    expect(result.vacancy.employerProfileId).toBe(employerProfileId);
  });

  it("maps a forbidden RPC status to not_operator", async () => {
    const client = makeGatedClient({
      data: { status: "forbidden" },
      error: null,
    });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadVacancyModeration(
      {} as never,
      employerProfileId,
      vacancyId,
    );

    expect(result).toEqual({ ok: false, reason: "not_operator" });
  });
});
