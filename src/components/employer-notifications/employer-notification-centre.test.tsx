import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EmployerNotificationCentre } from "@/components/employer-notifications/employer-notification-centre";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import type { EmployerNotification } from "@/lib/employer/notifications/schemas";

vi.mock("@/app/employer/notifications/actions", () => ({
  markAllEmployerNotificationsReadAction: vi.fn(),
  openEmployerNotificationAction: vi.fn(),
}));

const unread: EmployerNotification = {
  notification_id: "11111111-1111-4111-8111-111111111111",
  kind: "new_application",
  application_id: "22222222-2222-4222-8222-222222222222",
  vacancy_title: "Reinigungskraft am Morgen",
  created_at: "2026-09-09T10:00:00Z",
  read_at: null,
};

const read: EmployerNotification = {
  ...unread,
  notification_id: "33333333-3333-4333-8333-333333333333",
  application_id: "44444444-4444-4444-8444-444444444444",
  vacancy_title: "Servicekraft",
  created_at: "2026-09-08T10:00:00Z",
  read_at: "2026-09-08T11:00:00Z",
};

describe("EmployerNotificationCentre", () => {
  it("renders durable unread/read history with a non-color status cue", () => {
    render(<EmployerNotificationCentre notifications={[unread, read]} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Notifications" }),
    ).toBeInTheDocument();
    const list = screen.getByRole("list", {
      name: "Application notifications",
    });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText("Unread")).toBeVisible();
    expect(within(list).getByText("Read")).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Open application for Reinigungskraft am Morgen",
      }),
    ).toHaveAttribute("data-unread", "true");
    expect(
      screen.getByRole("button", { name: "Mark all as read" }),
    ).toBeEnabled();
  });

  it("keeps authored vacancy titles unchanged in German presentation", () => {
    document.documentElement.dataset.locale = "de";
    document.documentElement.lang = "de";

    render(
      <LocaleProvider>
        <EmployerNotificationCentre notifications={[unread]} />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Benachrichtigungen" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Neue Bewerbung")).toBeInTheDocument();
    expect(screen.getByText("Reinigungskraft am Morgen")).toBeInTheDocument();
    expect(screen.getByText("Ungelesen")).toBeVisible();

    document.documentElement.dataset.locale = "en";
    document.documentElement.lang = "en";
  });

  it("renders the concise empty state without read controls", () => {
    render(<EmployerNotificationCentre notifications={[]} />);

    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
    expect(
      screen.getByText("New candidate applications will appear here."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Mark all as read" }),
    ).not.toBeInTheDocument();
  });

  it("disables Mark all as read when every item is already read", () => {
    render(<EmployerNotificationCentre notifications={[read]} />);

    expect(
      screen.getByRole("button", { name: "Mark all as read" }),
    ).toBeDisabled();
  });
});
