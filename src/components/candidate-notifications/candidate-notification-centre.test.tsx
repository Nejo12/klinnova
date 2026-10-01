import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/app/candidate/notifications/actions", () => ({
  openCandidateNotificationAction: vi.fn(),
  markAllCandidateNotificationsReadAction: vi.fn(),
}));
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { CandidateNotificationCentre } from "./candidate-notification-centre";
import type { CandidateNotification } from "@/lib/candidate/notifications/schemas";
const base: CandidateNotification = {
  notification_id: "11111111-1111-4111-8111-111111111111",
  application_id: "22222222-2222-4222-8222-222222222222",
  kind: "application_shortlisted",
  vacancy_title: "Cleaning",
  employer_display_name: "Berlin Employer",
  created_at: "2026-10-01T09:00:00Z",
  read_at: null,
};
const now = "2026-10-01T12:00:00Z";
afterEach(() => {
  delete document.documentElement.dataset.locale;
});
describe("Candidate notification centre", () => {
  it("shows concise safe status/context, textual read states, timestamps and accepted != hired", () => {
    render(
      <CandidateNotificationCentre
        now={now}
        notifications={[
          base,
          {
            ...base,
            notification_id: "33333333-3333-4333-8333-333333333333",
            kind: "application_accepted",
          },
          {
            ...base,
            notification_id: "44444444-4444-4444-8444-444444444444",
            kind: "application_rejected",
            read_at: now,
            created_at: "2026-09-30T09:00:00Z",
          },
        ]}
      />,
    );
    expect(screen.getByText("Application shortlisted")).toBeVisible();
    expect(screen.getByText(/Accepted is not the same as hired/)).toBeVisible();
    expect(screen.getByText(/Your application was not selected/)).toBeVisible();
    expect(screen.getAllByText("Unread", { exact: true })).toHaveLength(2);
    expect(screen.getByText("Read", { exact: true })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Earlier" })).toBeVisible();
    const row = screen.getByRole("button", {
      name: /Application shortlisted:/,
    });
    expect(row.closest("form")?.querySelector("input")).toHaveValue(
      base.notification_id,
    );
    expect(row.querySelector("time")).toHaveAttribute(
      "dateTime",
      base.created_at,
    );
  });
  it("preserves read history and disables mark-all when caught up", () => {
    render(
      <CandidateNotificationCentre
        now={now}
        notifications={[{ ...base, read_at: now }]}
      />,
    );
    expect(screen.getByText("Application shortlisted")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Mark all as read" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Applications" }));
    expect(screen.getByText("Application shortlisted")).toBeVisible();
  });
  it("shows the scoped empty state and no read actions", () => {
    render(<CandidateNotificationCentre now={now} notifications={[]} />);
    expect(screen.getByText("You’re all caught up")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Mark all as read" }),
    ).toBeNull();
  });
  it("shows error/retry without presenting failure as empty history", () => {
    render(<CandidateNotificationCentre now={now} notifications={[]} failed />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load notifications",
    );
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      "/candidate/notifications",
    );
    expect(screen.queryByText("You’re all caught up")).toBeNull();
  });
  it("localizes safety and read-state copy in German without private rejection data", () => {
    document.documentElement.dataset.locale = "de";
    render(
      <LocaleProvider>
        <CandidateNotificationCentre
          now={now}
          notifications={[
            { ...base, kind: "application_accepted" },
            {
              ...base,
              notification_id: "33333333-3333-4333-8333-333333333333",
              kind: "application_rejected",
            },
          ]}
          readFailed
        />
      </LocaleProvider>,
    );
    expect(
      screen.getByText(/Angenommen bedeutet noch nicht eingestellt/),
    ).toBeVisible();
    expect(
      screen.getByText(/Deine Bewerbung wurde nicht ausgewählt/),
    ).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bitte versuche es erneut",
    );
    expect(
      screen.getByRole("button", { name: "Alle als gelesen markieren" }),
    ).toBeEnabled();
  });
});
