import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmployerList } from "@/components/internal-moderation/employer-list";
import type { OperatorEmployerRow } from "@/lib/internal/moderation/load-employers";

const baseRow: OperatorEmployerRow = {
  employerProfileId: "11111111-1111-4111-8111-111111111111",
  employerType: "private",
  displayName: "Ada Employer",
  companyName: null,
  onboardingCompleted: true,
  verificationState: "verified",
  suspended: false,
  suspendedAt: null,
  createdAt: "2026-08-01T00:00:00Z",
};

describe("EmployerList", () => {
  it("renders a suspended badge for a suspended employer", () => {
    render(
      <EmployerList
        rows={[
          { ...baseRow, suspended: true, suspendedAt: "2026-08-05T00:00:00Z" },
        ]}
      />,
    );

    expect(screen.getByText("Suspended")).toBeInTheDocument();
  });

  it("renders an active badge for a non-suspended employer", () => {
    render(<EmployerList rows={[baseRow]} />);

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.queryByText("Suspended")).not.toBeInTheDocument();
  });

  it("links to the employer's own detail route", () => {
    render(<EmployerList rows={[baseRow]} />);

    const link = screen.getByRole("link", { name: /view/i });
    expect(link).toHaveAttribute(
      "href",
      `/internal/employers/${baseRow.employerProfileId}`,
    );
  });

  it("never renders a suspension reason in the list", () => {
    render(
      <EmployerList
        rows={[
          { ...baseRow, suspended: true, suspendedAt: "2026-08-05T00:00:00Z" },
        ]}
      />,
    );

    expect(screen.queryByText(/reason/i)).not.toBeInTheDocument();
  });
});
