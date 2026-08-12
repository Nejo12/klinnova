import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ShellHeader } from "@/components/shell-header";

describe("ShellHeader", () => {
  it("exposes a banner with brand", () => {
    render(<ShellHeader />);

    const header = screen.getByRole("banner");
    expect(within(header).getByText("Klinnova")).toBeInTheDocument();
  });

  it("exposes a Jobs navigation link to /jobs", () => {
    render(<ShellHeader />);

    const nav = screen.getByRole("navigation", { name: "Site" });
    const link = within(nav).getByRole("link", { name: "Jobs" });
    expect(link).toHaveAttribute("href", "/jobs");
  });
});
