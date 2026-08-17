import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmployerBand } from "@/components/homepage/employer-band";

describe("EmployerBand", () => {
  it("has id=for-employers, heading, and a real CTA", () => {
    render(<EmployerBand />);

    const region = screen.getByRole("region", {
      name: "Reach people who can start",
    });
    expect(region).toHaveAttribute("id", "for-employers");

    expect(
      screen.getByRole("link", { name: "Create an employer account" }),
    ).toHaveAttribute("href", "/employer/register");
  });

  it("shows the real workflow strip with canonical status labels, no Hired or New", () => {
    render(<EmployerBand />);

    const strip = screen.getByRole("list", { name: "Application workflow" });
    expect(within(strip).getByText("Submitted")).toBeInTheDocument();
    expect(within(strip).getByText("In review")).toBeInTheDocument();
    expect(within(strip).getByText("Shortlisted")).toBeInTheDocument();
    expect(within(strip).getByText("Accepted")).toBeInTheDocument();
    expect(within(strip).getByText("Rejected")).toBeInTheDocument();
    expect(screen.queryByText("Hired")).not.toBeInTheDocument();
    expect(screen.queryByText(/^New$/)).not.toBeInTheDocument();
  });

  it("does not show fabricated applicant counts or conversion metrics", () => {
    render(<EmployerBand />);

    expect(screen.queryByText(/\b\d+\s*(applicants|new|shortlisted)\b/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Illustrative example — sample data, not real Klinnova activity.",
      ),
    ).toBeInTheDocument();
  });
});
