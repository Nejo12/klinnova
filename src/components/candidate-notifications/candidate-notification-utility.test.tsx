import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const pathname = vi.hoisted(() => vi.fn(() => "/candidate/profile"));
vi.mock("next/navigation", () => ({ usePathname: pathname }));
import { CandidateAppHeader } from "@/components/candidate-nav/candidate-app-header";
import { CandidateNotificationUtility } from "./candidate-notification-utility";
afterEach(() => vi.unstubAllGlobals());
describe("Candidate notification utility", () => {
  it("loads an accessible non-color unread cue without adding a primary destination", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ unreadCount: 2 }) });
    vi.stubGlobal("fetch", fetch);
    render(<CandidateAppHeader current="profile" showEmployerNav={false} />);
    const link = await screen.findByRole("link", {
      name: "Notifications 2 Unread",
    });
    expect(link).toHaveAttribute("href", "/candidate/notifications");
    expect(fetch).toHaveBeenCalledWith(
      "/candidate/notifications/unread",
      expect.objectContaining({ cache: "no-store" }),
    );
    const nav = screen.getByRole("navigation", {
      name: "Candidate",
    });
    expect(nav.querySelectorAll("a")).toHaveLength(4);
    expect(nav).not.toContainElement(link);
  });
  it("uses fresh server count on the centre and marks the utility current", () => {
    pathname.mockReturnValueOnce("/candidate/notifications");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<CandidateNotificationUtility unreadCount={0} />);
    expect(screen.getByRole("link", { name: "Notifications" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(fetch).not.toHaveBeenCalled();
  });
  it("retains reachable navigation on failure without claiming zero unread", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetch);
    render(<CandidateNotificationUtility />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.getByRole("link", { name: "Notifications" })).toBeVisible();
    expect(screen.queryByText("0 Unread")).toBeNull();
  });
});
