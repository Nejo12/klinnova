import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicFooter } from "@/components/public-shared/public-footer";

describe("PublicFooter", () => {
  it("renders a labelled legal nav with links to all three placeholder pages", () => {
    render(<PublicFooter />);

    expect(
      screen.queryByRole("group", { name: "Interface language" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Appearance" }),
    ).not.toBeInTheDocument();

    const nav = screen.getByRole("navigation", { name: "Legal" });
    expect(nav).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(screen.getByRole("link", { name: "Impressum" })).toHaveAttribute(
      "href",
      "/impressum",
    );
  });
});
