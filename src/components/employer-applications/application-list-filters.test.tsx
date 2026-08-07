import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationListFilters } from "@/components/employer-applications/application-list-filters";

describe("ApplicationListFilters", () => {
  it("renders a status select with all statuses when no vacancy filter is active", () => {
    render(
      <ApplicationListFilters
        filter={{ vacancyId: null, status: null }}
        vacancyTitle={null}
      />,
    );

    expect(screen.getByLabelText("Filter by status")).toBeInTheDocument();
    expect(screen.queryByText(/filtered to vacancy/i)).toBeNull();
    expect(
      screen.queryByRole("link", { name: /clear vacancy filter/i }),
    ).toBeNull();
  });

  it("carries the vacancy filter as a hidden field and shows a clear link", () => {
    render(
      <ApplicationListFilters
        filter={{
          vacancyId: "22222222-2222-4222-8222-222222222222",
          status: "reviewing",
        }}
        vacancyTitle="Morning kitchen support"
      />,
    );

    const hidden = screen.getByDisplayValue(
      "22222222-2222-4222-8222-222222222222",
    );
    expect(hidden).toHaveAttribute("type", "hidden");
    expect(hidden).toHaveAttribute("name", "vacancy");

    expect(
      screen.getByText(/filtered to vacancy: morning kitchen support/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /clear vacancy filter/i }),
    ).toHaveAttribute("href", "/employer/applications");
  });
});
