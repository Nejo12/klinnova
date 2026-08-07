import { beforeEach, describe, expect, it, vi } from "vitest";

const loadCurrentEmployerSuspensionStatus = vi.hoisted(() => vi.fn());

vi.mock("@/lib/employer/suspension-guard", () => ({
  loadCurrentEmployerSuspensionStatus,
}));

import { updateOwnEmployerProfile } from "@/lib/employer/update-own-profile";

describe("updateOwnEmployerProfile", () => {
  const maybeSingle = vi.fn();
  const select = vi.fn();
  const eq = vi.fn();
  const update = vi.fn();
  const from = vi.fn();

  beforeEach(() => {
    loadCurrentEmployerSuspensionStatus.mockReset();
    maybeSingle.mockReset();
    select.mockReset();
    eq.mockReset();
    update.mockReset();
    from.mockReset();

    select.mockReturnValue({ maybeSingle });
    eq.mockReturnValue({ eq, select });
    update.mockReturnValue({ eq });
    from.mockReturnValue({ update });
  });

  function client() {
    return { from } as never;
  }

  it("skips the UPDATE entirely when the pre-check reports suspended", async () => {
    loadCurrentEmployerSuspensionStatus.mockResolvedValue({
      ok: true,
      suspended: true,
    });

    const result = await updateOwnEmployerProfile(client(), "user-1", {
      display_name: "Ada",
    });

    expect(result).toEqual({
      ok: false,
      reason: "restricted",
      error: expect.stringMatching(/restricted/i),
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("proceeds with the UPDATE when the pre-check reports not suspended", async () => {
    loadCurrentEmployerSuspensionStatus.mockResolvedValue({
      ok: true,
      suspended: false,
    });
    maybeSingle.mockResolvedValue({ data: { id: "user-1" }, error: null });

    const result = await updateOwnEmployerProfile(client(), "user-1", {
      display_name: "Ada",
    });

    expect(result).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith({ display_name: "Ada" });
  });

  it("adds an employer_type filter only when requested", async () => {
    loadCurrentEmployerSuspensionStatus.mockResolvedValue({
      ok: true,
      suspended: false,
    });
    maybeSingle.mockResolvedValue({ data: { id: "user-1" }, error: null });

    await updateOwnEmployerProfile(
      client(),
      "user-1",
      { display_name: "Ada" },
      { employerType: "private" },
    );

    expect(eq).toHaveBeenCalledWith("id", "user-1");
    expect(eq).toHaveBeenCalledWith("employer_type", "private");
  });

  it("maps a genuine Postgres error through mapEmployerWriteError", async () => {
    loadCurrentEmployerSuspensionStatus.mockResolvedValue({
      ok: true,
      suspended: false,
    });
    maybeSingle.mockResolvedValue({
      data: null,
      error: { code: "23514", message: "employer_type_locked_completed" },
    });

    const result = await updateOwnEmployerProfile(client(), "user-1", {
      employer_type: "organisation",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("failed");
      expect(result.error).toMatch(/no longer be changed/i);
    }
  });

  it("re-checks suspension when the UPDATE affects zero rows and reports restricted if now suspended", async () => {
    loadCurrentEmployerSuspensionStatus
      .mockResolvedValueOnce({ ok: true, suspended: false })
      .mockResolvedValueOnce({ ok: true, suspended: true });
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await updateOwnEmployerProfile(client(), "user-1", {
      display_name: "Ada",
    });

    expect(result).toEqual({
      ok: false,
      reason: "restricted",
      error: expect.stringMatching(/restricted/i),
    });
    expect(loadCurrentEmployerSuspensionStatus).toHaveBeenCalledTimes(2);
  });

  it("falls back to a generic failure for a zero-row UPDATE that is not suspension-related", async () => {
    loadCurrentEmployerSuspensionStatus
      .mockResolvedValueOnce({ ok: true, suspended: false })
      .mockResolvedValueOnce({ ok: true, suspended: false });
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await updateOwnEmployerProfile(client(), "user-1", {
      display_name: "Ada",
    });

    expect(result).toEqual({
      ok: false,
      reason: "failed",
      error: expect.stringMatching(/went wrong/i),
    });
  });

  it("never returns success for a zero-row result — never returns saved without evidence", async () => {
    loadCurrentEmployerSuspensionStatus.mockResolvedValue({
      ok: true,
      suspended: false,
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await updateOwnEmployerProfile(client(), "user-1", {
      display_name: "Ada",
    });

    expect(result.ok).toBe(false);
  });
});
