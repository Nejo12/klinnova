import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GermanRequirementField } from "@/components/employer-vacancies/german-requirement-field";

describe("GermanRequirementField", () => {
  it("renders exactly the 4 real values, never a CEFR label", () => {
    render(
      <GermanRequirementField
        value="none"
        onChange={vi.fn()}
        name="germanRequirement"
      />,
    );
    expect(
      screen.getByRole("radio", { name: "No German required" }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", { name: /basic german/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /conversational german/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /comfortable german/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(
      screen.queryByText(/\bA1\b|\bA2\b|\bB1\b|\bB2\b|\bC1\b|\bC2\b/),
    ).not.toBeInTheDocument();
  });

  it("renders options in the real domain's natural order", () => {
    render(
      <GermanRequirementField
        value="none"
        onChange={vi.fn()}
        name="germanRequirement"
      />,
    );
    const radios = screen.getAllByRole("radio");
    expect(radios.map((radio) => radio.getAttribute("value"))).toEqual([
      "none",
      "basic",
      "conversational",
      "comfortable",
    ]);
  });
});
