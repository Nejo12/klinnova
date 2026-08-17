import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CandidateJourney } from "@/components/homepage/candidate-journey";

describe("CandidateJourney", () => {
  it("has id=for-candidates and the section heading", () => {
    render(<CandidateJourney />);

    const region = screen.getByRole("region", {
      name: "You never wonder where it went",
    });
    expect(region).toHaveAttribute("id", "for-candidates");
  });

  it("lists the four real steps in order", () => {
    render(<CandidateJourney />);

    const steps = screen.getAllByRole("listitem", { name: /^Step \d/ });
    expect(steps).toHaveLength(4);
    expect(steps[0]).toHaveTextContent("Your situation, set once");
    expect(steps[3]).toHaveTextContent(
      "Status you can see, updates by email",
    );
  });

  it("renders an illustrative status timeline using canonical status labels", () => {
    render(<CandidateJourney />);

    const timeline = screen.getByRole("group", {
      name: /Küchenhilfe/,
    });
    expect(within(timeline).getByText("Shortlisted")).toBeInTheDocument();
    expect(within(timeline).getByText("Submitted")).toBeInTheDocument();
    expect(within(timeline).getByText("In review")).toBeInTheDocument();
    expect(screen.queryByText("Reviewing")).not.toBeInTheDocument();
    expect(screen.queryByText("New")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Illustrative example — sample data, not real Klinnova activity.",
      ),
    ).toBeInTheDocument();
  });
});
