import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ShellHeader } from "@/components/shell-header";
import { LocaleProvider } from "@/components/i18n/locale-provider";

describe("ShellHeader", () => {
  it("exposes a banner with brand", () => {
    render(<ShellHeader />);

    const header = screen.getByRole("banner");
    expect(within(header).getByText("Klinnova")).toBeInTheDocument();
  });

  it("exposes Jobs, For candidates, and For employers in the Site nav", () => {
    render(<ShellHeader />);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));

    const nav = screen.getByRole("navigation", { name: "Site" });
    expect(within(nav).getByRole("link", { name: "Jobs" })).toHaveAttribute(
      "href",
      "/jobs",
    );
    expect(
      within(nav).getByRole("link", { name: "For candidates" }),
    ).toHaveAttribute("href", "#for-candidates");
    expect(
      within(nav).getByRole("link", { name: "For employers" }),
    ).toHaveAttribute("href", "#for-employers");
  });

  it("exposes Sign in and Create account actions to real routes", () => {
    render(<ShellHeader />);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));

    const nav = screen.getByRole("navigation", { name: "Site" });
    expect(within(nav).getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(
      within(nav).getByRole("link", { name: "Create account" }),
    ).toHaveAttribute("href", "/register");
  });

  it("shows the active workspace and dashboard without anonymous actions", () => {
    render(
      <ShellHeader
        authenticated={{ destination: "/employer", workspace: "employer" }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.getByText("Employer")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/employer",
    );
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Create account" })).toBeNull();
  });

  it("localizes the authenticated affordance in German", () => {
    document.documentElement.dataset.locale = "de";
    document.documentElement.lang = "de";

    render(
      <LocaleProvider>
        <ShellHeader
          authenticated={{
            destination: "/candidate",
            workspace: "candidate",
          }}
        />
      </LocaleProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Menü" }));

    expect(screen.getByText("Bewerbende")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Anmelden" })).toBeNull();

    document.documentElement.dataset.locale = "en";
    document.documentElement.lang = "en";
  });

  it("toggles the mobile menu button's expanded state", () => {
    render(<ShellHeader />);

    const toggle = screen.getByRole("button", { name: "Menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
