import { beforeEach, describe, expect, it, vi } from "vitest";
const redirect = vi.hoisted(() =>
  vi.fn((href: string): never => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
);
const revalidatePath = vi.hoisted(() => vi.fn());
const createServerSupabaseClient = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));
import {
  markAllCandidateNotificationsReadAction,
  openCandidateNotificationAction,
} from "./actions";
const id = "11111111-1111-4111-8111-111111111111";
const app = "22222222-2222-4222-8222-222222222222";
describe("Candidate notification read actions", () => {
  const rpc = vi.fn();
  beforeEach(() => {
    rpc.mockReset();
    createServerSupabaseClient.mockResolvedValue({ rpc });
  });
  it("marks one owned notification then uses only the RPC-authorized destination", async () => {
    rpc.mockResolvedValue({
      data: { result: "ok", application_id: app },
      error: null,
    });
    const form = new FormData();
    form.set("notificationId", id);
    form.set("applicationId", "untrusted");
    await expect(openCandidateNotificationAction(form)).rejects.toThrow(
      `NEXT_REDIRECT:/candidate/applications/${app}`,
    );
    expect(rpc).toHaveBeenCalledExactlyOnceWith(
      "mark_current_candidate_notification_read",
      { p_notification_id: id },
    );
    expect(revalidatePath).toHaveBeenCalledWith("/candidate/notifications");
  });
  it("rejects arbitrary identifiers before querying", async () => {
    const form = new FormData();
    form.set("notificationId", "invalid");
    await expect(openCandidateNotificationAction(form)).rejects.toThrow(
      "NEXT_REDIRECT:/candidate/notifications?error=read",
    );
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([
    { data: { result: "unavailable" }, error: null },
    { data: { result: "ok", application_id: "invalid" }, error: null },
    { data: null, error: { message: "private" } },
  ])("does not navigate on unauthorized/failed reads", async (response) => {
    rpc.mockResolvedValue(response);
    const form = new FormData();
    form.set("notificationId", id);
    await expect(openCandidateNotificationAction(form)).rejects.toThrow(
      "NEXT_REDIRECT:/candidate/notifications?error=read",
    );
  });
  it("marks all through only the Candidate read RPC and returns to fresh history", async () => {
    rpc.mockResolvedValue({
      data: { result: "ok", updated_count: 2 },
      error: null,
    });
    await expect(markAllCandidateNotificationsReadAction()).rejects.toThrow(
      "NEXT_REDIRECT:/candidate/notifications",
    );
    expect(rpc).toHaveBeenCalledExactlyOnceWith(
      "mark_all_current_candidate_notifications_read",
    );
  });
  it("shows a recoverable error for mark-all failure", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "private" } });
    await expect(markAllCandidateNotificationsReadAction()).rejects.toThrow(
      "NEXT_REDIRECT:/candidate/notifications?error=read",
    );
  });
});
