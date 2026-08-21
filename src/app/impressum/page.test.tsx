import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ImpressumPage from "@/app/impressum/page";

describe("ImpressumPage", () => {
  it("renders one h1 and the shared founder-verification notice", () => {
    render(<ImpressumPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Impressum" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByText("Draft — founder verification required"),
    ).toBeInTheDocument();
  });

  it("shows founder-provided operator identity without inventing register or VAT IDs", () => {
    render(<ImpressumPage />);
    const text = document.body.textContent ?? "";

    expect(text).toContain("Olaniyi Gabriel Aborisade");
    expect(text).toContain("Wattstrasse 57, 12459 Berlin");
    expect(text).toContain("0155 69006852");
    expect(text).toContain("support@klinnova.com");
    expect(text).toContain("§ 5 DDG");
    expect(text).not.toMatch(/\[FOUNDER-FILL/);
    expect(text).not.toMatch(/HRB \d+/);
    expect(text).not.toMatch(/DE\d{9}/);
  });

  it("includes the shared legal footer", () => {
    render(<ImpressumPage />);
    expect(
      screen.getByRole("navigation", { name: "Legal" }),
    ).toBeInTheDocument();
  });
});
