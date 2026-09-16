import { render, screen } from "@testing-library/react";
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
    expect(
      screen.queryByRole("link", { name: "Apply" }),
    ).not.toBeInTheDocument();
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

  it("renders the Berlin work illustration with localized accessible text", () => {
    render(<PublicHero />);

    expect(
      screen.getByRole("img", {
        name: "A Berlin café worker beside a neighbourhood market, with the TV Tower and a city bus in the background.",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Verified employers only")).toHaveLength(2);
    expect(screen.getAllByText("Built for Berlin")).toHaveLength(2);
    expect(screen.queryByText(/Hauswerk Berlin/)).not.toBeInTheDocument();
  });
});
