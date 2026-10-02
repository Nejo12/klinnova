import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { NotificationPreferences } from "./notification-preferences";
describe("role notification preferences", () => {
  afterEach(() => {
    document.documentElement.dataset.locale = "en";
  });
  it.each(["candidate", "employer"] as const)(
    "shows only the %s category and unavailable Push",
    (role) => {
      render(
        <NotificationPreferences
          role={role}
          initialEnabled={true}
          save={vi.fn()}
        />,
      );
      expect(screen.getByRole("switch", { name: "Email" })).toBeChecked();
      expect(screen.getByText("Coming later")).toBeVisible();
      expect(
        screen.queryByRole("switch", { name: "Push" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(
          role === "candidate" ? "Application updates" : "New applicants",
        ),
      ).toBeVisible();
      expect(
        screen.getByText(/Notification history stays available in the app/),
      ).toBeVisible();
    },
  );
  it("commits state only after persistence succeeds", async () => {
    let resolve: (result: {
      status: "saved";
      enabled: boolean;
    }) => void = () => {};
    const save = vi.fn(
      () =>
        new Promise<{ status: "saved"; enabled: boolean }>((r) => {
          resolve = r;
        }),
    );
    render(
      <NotificationPreferences
        role="candidate"
        initialEnabled={true}
        save={save}
      />,
    );
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).toBeChecked();
    await act(async () => resolve({ status: "saved", enabled: false }));
    await waitFor(() => expect(screen.getByRole("switch")).not.toBeChecked());
    expect(screen.getByText("Saved")).toBeVisible();
  });
  it.each([false, true])(
    "retains prior %s state on persistence failure",
    async (initial) => {
      render(
        <NotificationPreferences
          role="employer"
          initialEnabled={initial}
          save={vi.fn().mockResolvedValue({ status: "failure" })}
        />,
      );
      fireEvent.click(screen.getByRole("switch"));
      await screen.findByRole("alert");
      expect(screen.getByRole("switch")).toHaveAttribute(
        "aria-checked",
        String(initial),
      );
      expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    },
  );
  it("disables changes when the preference could not load", () => {
    render(
      <NotificationPreferences
        role="candidate"
        initialEnabled={null}
        save={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load");
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
  it.each(["candidate", "employer"] as const)(
    "supports German %s presentation",
    (role) => {
      document.documentElement.dataset.locale = "de";
      render(
        <LocaleProvider>
          <NotificationPreferences
            role={role}
            initialEnabled={false}
            save={vi.fn()}
          />
        </LocaleProvider>,
      );
      expect(screen.getByRole("switch", { name: "E-Mail" })).not.toBeChecked();
      expect(screen.getByText("Aus")).toBeVisible();
      expect(screen.getByText("Kommt später")).toBeVisible();
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Benachrichtigungseinstellungen",
      );
    },
  );
});
