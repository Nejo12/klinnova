import { beforeEach, describe, expect, it, vi } from "vitest";
const completion = vi.hoisted(() => vi.fn());
vi.mock("@/lib/onboarding/candidate-completion-status", () => ({
  loadCandidateCompletionStatus: completion,
}));
import { loadCandidateNotifications } from "./load-candidate-notifications";
import { candidateNotificationSchema } from "./schemas";
const notification = {
  notification_id: "11111111-1111-4111-8111-111111111111",
  application_id: "22222222-2222-4222-8222-222222222222",
  kind: "application_accepted",
  vacancy_title: "Cleaning",
  employer_display_name: "Employer",
  created_at: "2026-10-01T09:00:00+00:00",
  read_at: null,
};
describe("Candidate notification projection", () => {
  const rpc = vi.fn();
  beforeEach(() => {
    rpc.mockReset();
    completion.mockResolvedValue({ status: "complete" });
  });
  it("uses the Candidate-scoped projection and preserves durable ordering", async () => {
    rpc.mockResolvedValue({
      data: [
        notification,
        {
          ...notification,
          notification_id: "33333333-3333-4333-8333-333333333333",
          created_at: "2026-09-30T09:00:00Z",
        },
      ],
      error: null,
    });
    const result = await loadCandidateNotifications({ rpc } as never);
    expect(result.status).toBe("ready");
    expect(
      result.status === "ready" &&
        result.notifications.map((n) => n.created_at),
    ).toEqual([notification.created_at, "2026-09-30T09:00:00Z"]);
    expect(rpc).toHaveBeenCalledWith("list_current_candidate_notifications");
  });
  it.each(["unauthenticated", "incomplete", "profile_missing", "failure"])(
    "preserves %s guard without querying notifications",
    async (status) => {
      completion.mockResolvedValue({ status });
      expect(await loadCandidateNotifications({ rpc } as never)).toEqual({
        status,
      });
      expect(rpc).not.toHaveBeenCalled();
    },
  );
  it.each([
    { data: null, error: null },
    { data: [], error: { message: "private" } },
    { data: [{ ...notification, kind: "new_application" }], error: null },
  ])("fails closed on invalid/error data", async (response) => {
    rpc.mockResolvedValue(response);
    expect(await loadCandidateNotifications({ rpc } as never)).toEqual({
      status: "failure",
    });
  });
  it("drops private fields and rejects excluded event kinds", () => {
    expect(
      candidateNotificationSchema.parse({
        ...notification,
        reason: "private rejection",
        payload: {},
      }),
    ).not.toHaveProperty("reason");
    for (const kind of [
      "application_submitted",
      "application_reviewing",
      "hired",
      "new_application",
    ])
      expect(
        candidateNotificationSchema.safeParse({ ...notification, kind })
          .success,
      ).toBe(false);
  });
});
