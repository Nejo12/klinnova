import { beforeEach, describe, expect, it, vi } from "vitest";

import { ensureEmployerProfile } from "@/lib/employer/ensure-employer-profile";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("ensureEmployerProfile", () => {
  const getUser = vi.fn();
  const rpc = vi.fn();
  const maybeSingle = vi.fn();
  const insert = vi.fn();
  const update = vi.fn();
  const updateSelect = vi.fn();
  const updateMaybeSingle = vi.fn();
  const select = vi.fn();
  const from = vi.fn();

  beforeEach(() => {
    getUser.mockReset();
    rpc.mockReset();
    maybeSingle.mockReset();
    insert.mockReset();
    update.mockReset();
    updateSelect.mockReset();
    updateMaybeSingle.mockReset();
    select.mockReset();
    from.mockReset();

    // is_current_employer_suspended() defaults to "not suspended" unless a
    // test overrides it.
    rpc.mockResolvedValue({ data: false, error: null });

    select.mockReturnValue({ eq: () => ({ maybeSingle }) });
    updateSelect.mockReturnValue({ maybeSingle: updateMaybeSingle });
    update.mockReturnValue({
      eq: () => ({ select: updateSelect }),
    });
    from.mockReturnValue({ select, insert, update });
  });

  function client(): SupabaseClient<Database> {
    return {
      auth: { getUser },
      from,
      rpc,
    } as unknown as SupabaseClient<Database>;
  }

  it("rejects unauthenticated callers", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await ensureEmployerProfile(client(), "private");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unauthenticated");
    }
  });

  it("inserts with session user id only", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1", user_metadata: {} } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });
    insert.mockResolvedValue({ error: null });

    const result = await ensureEmployerProfile(client(), "organisation");
    expect(result).toEqual({
      ok: true,
      created: true,
      userId: "user-1",
      employerType: "organisation",
    });
    expect(insert).toHaveBeenCalledWith({
      id: "user-1",
      employer_type: "organisation",
    });
    // Initial INSERT is structurally exempt from suspension — no profile
    // can exist to be suspended yet.
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps type-lock update failures", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    maybeSingle.mockResolvedValue({
      data: {
        id: "user-1",
        employer_type: "private",
        onboarding_completed_at: "2026-08-01T00:00:00Z",
      },
      error: null,
    });
    updateMaybeSingle.mockResolvedValue({
      data: null,
      error: { code: "23514", message: "employer_type_locked_completed" },
    });

    const result = await ensureEmployerProfile(client(), "organisation");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("type_locked");
    }
  });

  it("returns restricted, not type_locked, when the pre-check finds the account suspended", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    maybeSingle.mockResolvedValue({
      data: {
        id: "user-1",
        employer_type: "private",
        onboarding_completed_at: "2026-08-01T00:00:00Z",
      },
      error: null,
    });
    rpc.mockResolvedValue({ data: true, error: null });

    const result = await ensureEmployerProfile(client(), "organisation");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("restricted");
    }
    // The suspension pre-check skips the UPDATE attempt entirely.
    expect(updateMaybeSingle).not.toHaveBeenCalled();
  });

  it("returns restricted when the update affects zero rows despite an unsuspended pre-check (race)", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    maybeSingle.mockResolvedValue({
      data: {
        id: "user-1",
        employer_type: "private",
        onboarding_completed_at: "2026-08-01T00:00:00Z",
      },
      error: null,
    });
    // Pre-check says not suspended, then the UPDATE itself returns zero
    // rows (RLS silently blocked it) — simulating a race.
    rpc
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    updateMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await ensureEmployerProfile(client(), "organisation");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("restricted");
    }
  });
});
