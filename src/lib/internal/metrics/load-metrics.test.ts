import { describe, expect, it, vi } from "vitest";

import { loadM5FounderMetrics } from "@/lib/internal/metrics/load-metrics";

const metrics = {
  m5_started_at: "2026-08-08T23:35:02+00:00",
  measured_at: "2026-09-11T20:00:00+00:00",
  core: {
    participating_employers: 1,
    verified_vacancies: 2,
    completed_candidates: 3,
    submitted_applications: 4,
    completed_interview_conversions: 1,
    confirmed_hires: 0,
  },
  current_supply: {
    active_safe_participating_employers: 1,
    effective_public_vacancies: 2,
  },
  diagnostic: {
    raw_candidate_registrations: 4,
    applications_reviewing: 1,
    applications_shortlisted: 1,
    completed_interview_rounds: 2,
  },
  conversions: {
    candidate_to_application_percent: 66.7,
    application_to_interview_percent: 25,
    interview_to_hire_percent: 0,
  },
};

function makeClient(options?: {
  user?: { id: string } | null;
  gate?: boolean;
  metricsData?: unknown;
  metricsError?: unknown;
}) {
  const rpc = vi
    .fn()
    .mockResolvedValueOnce({ data: options?.gate ?? true, error: null })
    .mockResolvedValueOnce({
      data: options?.metricsData ?? metrics,
      error: options?.metricsError ?? null,
    });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user:
            options?.user === undefined ? { id: "operator-1" } : options.user,
        },
        error: null,
      }),
    },
    rpc,
  };
}

describe("loadM5FounderMetrics", () => {
  it("returns the validated aggregate contract for an active operator", async () => {
    const client = makeClient();

    await expect(loadM5FounderMetrics(client as never)).resolves.toEqual({
      ok: true,
      metrics,
    });
    expect(client.rpc).toHaveBeenNthCalledWith(
      1,
      "is_current_user_verification_operator",
    );
    expect(client.rpc).toHaveBeenNthCalledWith(2, "get_m5_founder_metrics");
  });

  it("does not query metrics for an unauthenticated request", async () => {
    const client = makeClient({ user: null });

    await expect(loadM5FounderMetrics(client as never)).resolves.toEqual({
      ok: false,
      reason: "unauthenticated",
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("does not query metrics for a non-operator", async () => {
    const client = makeClient({ gate: false });

    await expect(loadM5FounderMetrics(client as never)).resolves.toEqual({
      ok: false,
      reason: "not_operator",
    });
    expect(client.rpc).toHaveBeenCalledTimes(1);
  });

  it("fails closed for malformed aggregate data", async () => {
    const client = makeClient({ metricsData: { core: { secret: "value" } } });

    await expect(loadM5FounderMetrics(client as never)).resolves.toEqual({
      ok: false,
      reason: "failed",
    });
  });

  it("fails closed when the aggregate RPC fails", async () => {
    const client = makeClient({
      metricsData: null,
      metricsError: { message: "connection reset" },
    });

    await expect(loadM5FounderMetrics(client as never)).resolves.toEqual({
      ok: false,
      reason: "failed",
    });
  });
});
