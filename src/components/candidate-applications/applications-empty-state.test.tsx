import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationsEmptyState } from "@/components/candidate-applications/applications-empty-state";

describe("ApplicationsEmptyState", () => {
  it("renders a non-error empty message with a link back to jobs", () => {
    render(<ApplicationsEmptyState />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "You haven't applied to any jobs yet",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse matching jobs" }),
    ).toHaveAttribute("href", "/candidate/matches");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
