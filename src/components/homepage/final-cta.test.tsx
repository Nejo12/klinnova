import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FinalCta } from "@/components/homepage/final-cta";

describe("FinalCta", () => {
  it("uses the approved rollout wording and real CTA destinations", () => {
    render(<FinalCta />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Berlin first",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Klinnova starts in Berlin. What you can apply to depends on the vacancies that verified employers have published.",
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
