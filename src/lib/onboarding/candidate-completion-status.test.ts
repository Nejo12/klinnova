import { describe, expect, it, vi } from "vitest";

import { loadCandidateCompletionStatus } from "@/lib/onboarding/candidate-completion-status";

function makeClient(options: {
  user?: { id: string } | null;
  authError?: unknown;
  data?: unknown;
  error?: unknown;
}) {
  const eq = vi.fn().mockReturnValue({
    maybeSingle: vi.fn().mockResolvedValue({
      data: options.data === undefined ? null : options.data,
      error: options.error ?? null,
    }),
  });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: options.user === undefined ? { id: "c1" } : options.user,
        },
        error: options.authError ?? null,
      }),
    },
    from,
  } as never;
}

describe("loadCandidateCompletionStatus", () => {
  it("returns unauthenticated when there is no session", async () => {
    const client = makeClient({ user: null });
    expect(await loadCandidateCompletionStatus(client)).toEqual({
      status: "unauthenticated",
    });
  });

  it("returns unauthenticated on an auth error", async () => {
    const client = makeClient({ authError: { message: "boom" } });
    expect(await loadCandidateCompletionStatus(client)).toEqual({
      status: "unauthenticated",
    });
  });

  it("returns failure on a transport error", async () => {
    const client = makeClient({ error: { message: "boom" } });
    expect(await loadCandidateCompletionStatus(client)).toEqual({
      status: "failure",
    });
  });

  it("returns profile_missing when no row exists", async () => {
    const client = makeClient({ data: null });
    expect(await loadCandidateCompletionStatus(client)).toEqual({
      status: "profile_missing",
    });
  });

  it("returns incomplete when onboarding_completed_at is null", async () => {
    const client = makeClient({ data: { onboarding_completed_at: null } });
    expect(await loadCandidateCompletionStatus(client)).toEqual({
      status: "incomplete",
    });
  });

  it("returns complete when onboarding_completed_at is set", async () => {
    const client = makeClient({
      data: { onboarding_completed_at: "2026-08-01T00:00:00Z" },
    });
    expect(await loadCandidateCompletionStatus(client)).toEqual({
      status: "complete",
    });
  });

  it("selects only onboarding_completed_at, scoped to the current user", async () => {
    const client = makeClient({});
    await loadCandidateCompletionStatus(client);
    const from = (client as { from: ReturnType<typeof vi.fn> }).from;
    expect(from).toHaveBeenCalledWith("candidate_profiles");
    const select = from.mock.results[0]?.value.select as ReturnType<
      typeof vi.fn
    >;
    expect(select).toHaveBeenCalledWith("onboarding_completed_at");
    const eq = select.mock.results[0]?.value.eq as ReturnType<typeof vi.fn>;
    expect(eq).toHaveBeenCalledWith("id", "c1");
  });
});
