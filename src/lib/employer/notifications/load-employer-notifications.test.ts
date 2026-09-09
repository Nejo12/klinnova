import { beforeEach, describe, expect, it, vi } from "vitest";

const requireCompletedEmployer = vi.hoisted(() => vi.fn());

vi.mock("@/lib/employer/vacancies/require-completed-employer", () => ({
  requireCompletedEmployer,
}));

import { loadEmployerNotifications } from "@/lib/employer/notifications/load-employer-notifications";

describe("loadEmployerNotifications", () => {
  const rpc = vi.fn();

  beforeEach(() => {
    rpc.mockReset();
    requireCompletedEmployer.mockReset();
    requireCompletedEmployer.mockResolvedValue({ ok: true, supabase: { rpc } });
  });

  it("uses the dedicated newest-first Employer projection and preserves its order", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          notification_id: "11111111-1111-4111-8111-111111111111",
          kind: "new_application",
          application_id: "22222222-2222-4222-8222-222222222222",
          vacancy_title: "Morning support",
          created_at: "2026-09-09T10:00:00Z",
          read_at: null,
        },
        {
          notification_id: "33333333-3333-4333-8333-333333333333",
          kind: "new_application",
          application_id: "44444444-4444-4444-8444-444444444444",
          vacancy_title: "Evening support",
          created_at: "2026-09-08T10:00:00Z",
          read_at: "2026-09-08T11:00:00Z",
        },
      ],
      error: null,
    });

    const result = await loadEmployerNotifications({} as never);

    expect(rpc).toHaveBeenCalledWith("list_current_employer_notifications");
    expect(
      result.ok && result.notifications.map((item) => item.vacancy_title),
    ).toEqual(["Morning support", "Evening support"]);
  });

  it("fails closed when the projection returns malformed data", async () => {
    rpc.mockResolvedValue({ data: [{ kind: "future_kind" }], error: null });

    await expect(loadEmployerNotifications({} as never)).resolves.toEqual({
      ok: false,
      reason: "failed",
      error: "Could not load notifications.",
    });
  });

  it("preserves the existing completed-Employer gate", async () => {
    requireCompletedEmployer.mockResolvedValue({
      ok: false,
      reason: "unauthenticated",
      error: "Sign in.",
    });

    await expect(loadEmployerNotifications({} as never)).resolves.toEqual({
      ok: false,
      reason: "unauthenticated",
      error: "Sign in.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});
