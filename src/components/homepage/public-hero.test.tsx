import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicHero } from "@/components/homepage/public-hero";

const heroStyles = readFileSync(
  path.join(process.cwd(), "src/components/homepage/public-hero.module.scss"),
  "utf-8",
);

describe("PublicHero", () => {
  it("renders the hero heading and supported candidate and employer actions", () => {
    render(<PublicHero />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Jobs that match your situation. In Berlin.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse jobs first" }),
    ).toHaveAttribute("href", "/jobs");
    expect(
      screen.getByRole("link", { name: "I'm a candidate" }),
    ).toHaveAttribute("href", "/register");
    expect(
      screen.getByRole("link", { name: "I'm an employer" }),
    ).toHaveAttribute("href", "/employer/register");

    expect(screen.queryByText(/€|£/i)).not.toBeInTheDocument();
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

  it("renders the full-width Berlin illustration with localized accessible text", () => {
    render(<PublicHero />);

    expect(
      screen.getByRole("img", {
        name: "A Berlin café worker beside a neighbourhood market, with the TV Tower and a city bus in the background.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Verified employers only")).toBeInTheDocument();
    expect(screen.getByText("Built for Berlin")).toBeInTheDocument();
    expect(screen.queryByText(/Hauswerk Berlin/)).not.toBeInTheDocument();
  });

  it("gives the homepage title and description stronger visual weight", () => {
    expect(heroStyles).toContain("font-weight: var(--font-weight-bold)");
    expect(heroStyles).toContain("font-weight: var(--font-weight-medium)");
  });
});
