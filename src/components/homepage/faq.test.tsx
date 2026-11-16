import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Faq } from "@/components/homepage/faq";
import { LocaleProvider } from "@/components/i18n/locale-provider";

afterEach(() => {
  document.documentElement.dataset.locale = "en";
  document.documentElement.lang = "en";
});

describe("Faq", () => {
  it("is a labelled #faq section with the four public questions", () => {
    render(<Faq />);

    const region = screen.getByRole("region", { name: "Common questions" });
    expect(region).toHaveAttribute("id", "faq");
    for (const question of [
      "Do I need to speak German?",
      "How are employers verified?",
      "What if there are no vacancies?",
      "How do I get started?",
    ]) {
      expect(within(region).getByText(question)).toBeInTheDocument();
    }
  });

  it("states verification is not an endorsement and that language need depends on the vacancy", () => {
    render(<Faq />);

    expect(screen.getByText(/not an endorsement/)).toBeInTheDocument();
    expect(screen.getByText(/It depends on the vacancy/)).toBeInTheDocument();
    expect(screen.getByText(/never examples/)).toBeInTheDocument();
  });

  it("uses native disclosure semantics so questions are keyboard operable", () => {
    const { container } = render(<Faq />);

    const details = container.querySelectorAll("details");
    expect(details).toHaveLength(4);
    for (const item of details) {
      expect(item.querySelector("summary")).not.toBeNull();
    }
  });

  it("links anonymous visitors to the real registration routes", () => {
    render(<Faq />);

    expect(
      screen.getByRole("link", { name: "Create a candidate account" }),
    ).toHaveAttribute("href", "/register");
    expect(
      screen.getByRole("link", { name: "Create an employer account" }),
    ).toHaveAttribute("href", "/employer/register");
  });

  it("offers the dashboard, not sign-up links, when authenticated", () => {
    render(<Faq authenticatedDestination="/candidate" />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/candidate",
    );
    expect(screen.queryByRole("link", { name: /Create/ })).toBeNull();
  });

  it("renders German copy", () => {
    document.documentElement.dataset.locale = "de";
    document.documentElement.lang = "de";

    render(
      <LocaleProvider>
        <Faq />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("region", { name: "Häufige Fragen" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Muss ich Deutsch sprechen?")).toBeInTheDocument();
    expect(screen.getByText(/keine Empfehlung/)).toBeInTheDocument();
  });
});
