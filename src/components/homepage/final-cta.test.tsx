import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FinalCta } from "@/components/homepage/final-cta";

describe("FinalCta", () => {
  it("uses clear candidate-facing wording and real CTA destinations", () => {
    render(<FinalCta />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Find work that fits your situation",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Create your candidate account to see jobs matched to your availability, language and location.",
      ),
    ).toBeInTheDocument();

    expect(screen.queryByText(/join early access/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/hundreds of jobs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/guaranteed/i)).not.toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Create your account" }),
    ).toHaveAttribute("href", "/register");
    expect(
      screen.getByRole("link", { name: "Browse jobs first" }),
    ).toHaveAttribute("href", "/jobs");
  });
});
