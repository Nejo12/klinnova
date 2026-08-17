import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicHero } from "@/components/homepage/public-hero";

describe("PublicHero", () => {
  it("renders the h1, both primary CTAs, and no unsupported claims", () => {
    render(<PublicHero />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Jobs that match your situation. In Berlin.",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "I'm a candidate" }),
    ).toHaveAttribute("href", "/register");
    expect(
      screen.getByRole("link", { name: "I'm an employer" }),
    ).toHaveAttribute("href", "/employer/register");

    expect(screen.queryByText(/€\/h/)).not.toBeInTheDocument();
    expect(screen.queryByText(/work permission/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Apply" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Apply" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/minutes|commute/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/data stays yours|your data/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/part.time|full.time|mini.job/i),
    ).not.toBeInTheDocument();
  });

  it("renders the illustrative match card using real match-reason copy", () => {
    render(<PublicHero />);

    expect(screen.getByText("Illustrative example — sample data, not real Klinnova activity.")).toBeInTheDocument();
    const card = screen.getByRole("group", { name: /Reinigungskraft/ });
    expect(
      within(card).getByText("Your German level meets the requirement"),
    ).toBeInTheDocument();
    expect(
      within(card).getByText("Start date fits your availability"),
    ).toBeInTheDocument();
    expect(within(card).getByText("Based in Berlin")).toBeInTheDocument();
    expect(within(card).getByText("Cleaning")).toBeInTheDocument();
    expect(within(card).getByText(/Mitte/)).toBeInTheDocument();
  });
});
