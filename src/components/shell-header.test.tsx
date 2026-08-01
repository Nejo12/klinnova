import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ShellHeader } from "@/components/shell-header";

describe("ShellHeader", () => {
  it("exposes a banner with brand and tagline", () => {
    render(<ShellHeader />);

    const header = screen.getByRole("banner");
    expect(within(header).getByText("Stint")).toBeInTheDocument();
    expect(within(header).getByText("One step closer.")).toBeInTheDocument();
  });
});
