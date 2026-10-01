import { beforeEach, describe, expect, it, vi } from "vitest";
const completion = vi.hoisted(() => vi.fn());
const createClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/onboarding/candidate-completion-status", () => ({
  loadCandidateCompletionStatus: completion,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createClient,
}));
import { GET } from "./route";
describe("Candidate unread endpoint", () => {
  const rpc = vi.fn();
  beforeEach(() => {
    rpc.mockReset();
    createClient.mockResolvedValue({ rpc });
    completion.mockResolvedValue({ status: "complete" });
  });
  it("returns only the owned count and disables shared caching", async () => {
    rpc.mockResolvedValue({ data: 3, error: null });
    const response = await GET();
    expect(await response.json()).toEqual({ unreadCount: 3 });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(rpc).toHaveBeenCalledExactlyOnceWith(
      "count_current_candidate_unread_notifications",
    );
  });
  it.each(["unauthenticated", "profile_missing", "incomplete"])(
    "denies %s before querying",
    async (status) => {
      completion.mockResolvedValue({ status });
      expect((await GET()).status).toBe(401);
      expect(rpc).not.toHaveBeenCalled();
    },
  );
  it("does not turn a database failure into a zero count", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "private" } });
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ unreadCount: null });
  });
});
