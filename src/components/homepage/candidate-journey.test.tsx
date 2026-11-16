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

  it("lists the three public stages in order", () => {
    render(<CandidateJourney />);

    const lists = screen.getAllByRole("list");
    expect(lists).toHaveLength(2);
    const steps = within(lists[0]!).getAllByRole("listitem");
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent("Set up your profile");
    expect(steps[1]).toHaveTextContent("Review actual openings");
    expect(steps[2]).toHaveTextContent("Apply and track");
  });

  it("renders an illustrative status timeline using canonical status labels", () => {
    render(<CandidateJourney />);

    const timeline = screen.getByRole("group", {
      name: /Küchenhilfe/,
    });
    expect(timeline).toHaveAccessibleDescription(
      "Illustrative example — sample data, not real Klinnova activity.",
    );
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

  it("has no fake Apply affordance on the illustrative timeline card", () => {
    render(<CandidateJourney />);

    expect(
      screen.queryByRole("link", { name: "Apply" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Apply" }),
    ).not.toBeInTheDocument();
  });
});
