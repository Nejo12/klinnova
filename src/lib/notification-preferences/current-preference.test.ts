import { beforeEach, describe, expect, it, vi } from "vitest";
const { rpc, getUser } = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ rpc, auth: { getUser } }),
}));
import {
  loadCurrentEmailPreference,
  saveCurrentEmailPreference,
} from "./current-preference";
describe("current-user Email preference API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "owned" } } });
  });
  it("gates unauthenticated users", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(
      await loadCurrentEmailPreference("candidate_application_updates"),
    ).toEqual({ status: "unauthenticated" });
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([true, false])("loads persisted %s", async (enabled) => {
    rpc.mockResolvedValue({
      data: { result: "ready", email_enabled: enabled },
      error: null,
    });
    expect(await loadCurrentEmailPreference("employer_new_applicants")).toEqual(
      { status: "ready", enabled },
    );
  });
  it("handles unavailable role and database failure distinctly", async () => {
    rpc.mockResolvedValueOnce({ data: { result: "unavailable" }, error: null });
    expect(
      await loadCurrentEmailPreference("candidate_application_updates"),
    ).toEqual({ status: "unavailable" });
    rpc.mockResolvedValueOnce({ data: null, error: { message: "failed" } });
    expect(
      await loadCurrentEmailPreference("candidate_application_updates"),
    ).toEqual({ status: "failure" });
  });
  it.each([true, false])(
    "saves only own category override %s",
    async (enabled) => {
      rpc.mockResolvedValue({
        data: { result: "ok", email_enabled: enabled },
        error: null,
      });
      expect(
        await saveCurrentEmailPreference(
          "candidate_application_updates",
          enabled,
        ),
      ).toEqual({ status: "saved", enabled });
      expect(rpc).toHaveBeenCalledWith(
        "set_current_notification_email_preference",
        {
          p_category: "candidate_application_updates",
          p_email_enabled: enabled,
        },
      );
    },
  );
  it.each([
    { data: { result: "unavailable" }, error: null },
    { data: null, error: { message: "failed" } },
    { data: { result: "ok", email_enabled: true }, error: null },
  ])("does not falsely report success", async (result) => {
    rpc.mockResolvedValue(result);
    expect(
      await saveCurrentEmailPreference("employer_new_applicants", false),
    ).toEqual({ status: "failure" });
  });
  it("handles thrown persistence errors", async () => {
    rpc.mockRejectedValue(new Error("network"));
    expect(
      await saveCurrentEmailPreference("employer_new_applicants", false),
    ).toEqual({ status: "failure" });
  });
});
