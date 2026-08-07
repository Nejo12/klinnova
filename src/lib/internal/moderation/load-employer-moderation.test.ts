import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActiveOperator = vi.hoisted(() => vi.fn());

vi.mock("@/lib/internal/verification/operator-gate", () => ({
  requireActiveOperator,
}));

import { loadEmployerModeration } from "@/lib/internal/moderation/load-employer-moderation";

const employerProfileId = "11111111-1111-4111-8111-111111111111";

const readyStatus = {
  status: "ready" as const,
  employer_profile_id: employerProfileId,
  employer_type: "private" as const,
  display_name: "Ada Employer",
  company_name: null,
  onboarding_completed: true,
  verification_state: "verified" as const,
  suspended: true,
  suspended_at: "2026-08-05T00:00:00Z",
  suspended_reason: "Fraudulent postings",
  audit_events: [
    {
      event_type: "employer_suspended" as const,
      occurred_at: "2026-08-05T00:00:00Z",
      reason: "Fraudulent postings",
    },
  ],
};

function makeGatedClient(responses: {
  status: { data: unknown; error: unknown };
  vacancies: { data: unknown; error: unknown };
}) {
  const rpc = vi
    .fn()
    .mockImplementation((name: string) =>
      name === "get_employer_moderation_status"
        ? Promise.resolve(responses.status)
        : Promise.resolve(responses.vacancies),
    );
  return { rpc };
}

describe("loadEmployerModeration", () => {
  beforeEach(() => {
    requireActiveOperator.mockReset();
  });

  it("propagates gate denial without calling any RPC", async () => {
    requireActiveOperator.mockResolvedValue({
      ok: false,
      reason: "not_operator",
    });

    const result = await loadEmployerModeration(
      {} as never,
      employerProfileId,
      { limit: 50, offset: 0 },
    );

    expect(result).toEqual({ ok: false, reason: "not_operator" });
  });

  it("returns unavailable for a malformed id without calling the RPC", async () => {
    const client = makeGatedClient({
      status: { data: null, error: null },
      vacancies: { data: [], error: null },
    });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadEmployerModeration({} as never, "not-a-uuid", {
      limit: 50,
      offset: 0,
    });

    expect(result).toEqual({ ok: false, reason: "unavailable" });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("maps a forbidden RPC status to not_operator", async () => {
    const client = makeGatedClient({
      status: { data: { status: "forbidden" }, error: null },
      vacancies: { data: [], error: null },
    });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadEmployerModeration(
      {} as never,
      employerProfileId,
      { limit: 50, offset: 0 },
    );

    expect(result).toEqual({ ok: false, reason: "not_operator" });
  });

  it("maps an unavailable RPC status through unchanged", async () => {
    const client = makeGatedClient({
      status: { data: { status: "unavailable" }, error: null },
      vacancies: { data: [], error: null },
    });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadEmployerModeration(
      {} as never,
      employerProfileId,
      { limit: 50, offset: 0 },
    );

    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });

  it("returns camelCase employer + vacancy rows for a ready operator result", async () => {
    const client = makeGatedClient({
      status: { data: readyStatus, error: null },
      vacancies: {
        data: [
          {
            vacancy_id: "22222222-2222-4222-8222-222222222222",
            title: "Cleaning role",
            publication_state: "published",
            moderated: false,
            moderated_at: null,
            published_at: "2026-08-01T00:00:00Z",
          },
        ],
        error: null,
      },
    });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadEmployerModeration(
      {} as never,
      employerProfileId,
      { limit: 50, offset: 0 },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.employer.suspended).toBe(true);
    expect(result.employer.suspendedReason).toBe("Fraudulent postings");
    expect(result.employer.auditEvents).toHaveLength(1);
    expect(result.vacancies).toEqual([
      {
        vacancyId: "22222222-2222-4222-8222-222222222222",
        title: "Cleaning role",
        publicationState: "published",
        moderated: false,
        moderatedAt: null,
        publishedAt: "2026-08-01T00:00:00Z",
      },
    ]);
  });

  it("never returns actor_user_id in the audit history", async () => {
    const client = makeGatedClient({
      status: { data: readyStatus, error: null },
      vacancies: { data: [], error: null },
    });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    const result = await loadEmployerModeration(
      {} as never,
      employerProfileId,
      { limit: 50, offset: 0 },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.employer.auditEvents);
    expect(serialized).not.toMatch(/actor/i);
  });

  it("passes the exact bounded vacancy page through to the RPC", async () => {
    const client = makeGatedClient({
      status: { data: readyStatus, error: null },
      vacancies: { data: [], error: null },
    });
    requireActiveOperator.mockResolvedValue({
      ok: true,
      supabase: client,
      userId: "op-1",
    });

    await loadEmployerModeration({} as never, employerProfileId, {
      limit: 50,
      offset: 50,
    });

    expect(client.rpc).toHaveBeenCalledWith(
      "list_employer_vacancies_for_operator",
      {
        p_employer_profile_id: employerProfileId,
        p_limit: 50,
        p_offset: 50,
      },
    );
  });
});
