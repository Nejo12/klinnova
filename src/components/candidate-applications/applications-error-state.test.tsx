import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationsErrorState } from "@/components/candidate-applications/applications-error-state";

describe("ApplicationsErrorState", () => {
  it("renders a neutral failure message without raw error details", () => {
    render(<ApplicationsErrorState />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "We could not load your applications",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/postgres|supabase|stack/i)).toBeNull();
  });
});
