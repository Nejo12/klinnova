import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ValuePillars } from "@/components/homepage/value-pillars";

describe("ValuePillars", () => {
  it("renders the section heading and four Klinnova-specific benefit cards", () => {
    render(<ValuePillars />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Made for how Berlin works",
      }),
    ).toBeInTheDocument();

    const cardHeadings = [
      "Jobs that fit your situation",
      "Know before you apply",
      "Your status stays visible",
      "Verified before publishing",
    ];
    for (const name of cardHeadings) {
      expect(screen.getByRole("heading", { level: 3, name })).toBeInTheDocument();
    }
  });
});
