import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadEmployerNotifications = vi.hoisted(() => vi.fn());
const loadAccountCapabilities = vi.hoisted(() => vi.fn());
const loadUnseenApplicationsCount = vi.hoisted(() => vi.fn());
const loadCurrentEmployerSuspensionStatus = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() => vi.fn());

vi.mock("@/lib/employer/notifications/load-employer-notifications", () => ({
  loadEmployerNotifications,
}));
vi.mock("@/lib/employer/load-capabilities", () => ({
  loadAccountCapabilities,
}));
vi.mock("@/lib/employer/applications/load-unseen-applications-count", () => ({
  loadUnseenApplicationsCount,
}));
vi.mock("@/lib/employer/suspension-guard", () => ({
  loadCurrentEmployerSuspensionStatus,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({}),
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/app/employer/notifications/actions", () => ({
  markAllEmployerNotificationsReadAction: vi.fn(),
  openEmployerNotificationAction: vi.fn(),
}));

import EmployerNotificationsPage from "@/app/employer/notifications/page";

describe("EmployerNotificationsPage", () => {
  beforeEach(() => {
    loadEmployerNotifications.mockReset();
    loadAccountCapabilities.mockReset();
    loadUnseenApplicationsCount.mockReset();
    loadCurrentEmployerSuspensionStatus.mockReset();
    redirect.mockReset();
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: false,
      hasEmployerProfile: true,
    });
    loadUnseenApplicationsCount.mockResolvedValue(0);
    loadCurrentEmployerSuspensionStatus.mockResolvedValue({
      ok: true,
      suspended: false,
    });
  });

  it("renders the Employer-only centre with the shared workspace shell", async () => {
    loadEmployerNotifications.mockResolvedValue({
      ok: true,
      notifications: [],
    });

    render(await EmployerNotificationsPage());

    expect(screen.getByRole("link", { name: "Notifications" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Notifications" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });

  it("keeps the existing Employer restriction treatment", async () => {
    loadEmployerNotifications.mockResolvedValue({
      ok: true,
      notifications: [],
    });
    loadCurrentEmployerSuspensionStatus.mockResolvedValue({
      ok: true,
      suspended: true,
    });

    render(await EmployerNotificationsPage());

    expect(
      screen.getByText(/employer account is temporarily restricted/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("No notifications yet")).not.toBeInTheDocument();
  });

  it("routes incomplete Employers back through existing onboarding", async () => {
    loadEmployerNotifications.mockResolvedValue({
      ok: false,
      reason: "incomplete",
      error: "Finish onboarding.",
    });
    redirect.mockImplementation((href: string) => {
      throw new Error(`NEXT_REDIRECT:${href}`);
    });

    await expect(EmployerNotificationsPage()).rejects.toThrow(
      "NEXT_REDIRECT:/employer/onboarding",
    );
  });
});
