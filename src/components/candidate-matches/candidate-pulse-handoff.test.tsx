import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CandidatePulseHandoff } from "./candidate-pulse-handoff";

const profileItems = [
  { key: "categories" as const, label: "Roles", value: "Cleaning" },
  { key: "employment" as const, label: "Employment", value: "Part time" },
];

describe("CandidatePulseHandoff", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/candidate/matches?pulse=ready");
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
  });

  it("moves directly to Connecting for reduced motion and removes the transient URL marker", async () => {
    render(<CandidatePulseHandoff profileItems={profileItems} />);

    expect(screen.getByText("Ready for matching")).toBeInTheDocument();
    expect(screen.getByText("Matching on your profile")).toBeInTheDocument();
    expect(screen.queryByText("Deciding")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Connecting")).toHaveAttribute(
        "aria-current",
        "step",
      );
    });

    expect(window.location.search).toBe("");
  });
});
