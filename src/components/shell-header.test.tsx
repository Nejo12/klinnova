import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ShellHeader } from "@/components/shell-header";

describe("ShellHeader", () => {
  it("exposes a banner with brand", () => {
    render(<ShellHeader />);

    const header = screen.getByRole("banner");
    expect(within(header).getByText("Klinnova")).toBeInTheDocument();
  });

  it("exposes Jobs, For candidates, and For employers in the Site nav", () => {
    render(<ShellHeader />);

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

    const nav = screen.getByRole("navigation", { name: "Site" });
    expect(within(nav).getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(
      within(nav).getByRole("link", { name: "Create account" }),
    ).toHaveAttribute("href", "/register");
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
