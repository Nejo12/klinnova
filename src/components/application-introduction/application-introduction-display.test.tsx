import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationIntroductionDisplay } from "@/components/application-introduction/application-introduction-display";

describe("ApplicationIntroductionDisplay", () => {
  it("renders candidate-authored text verbatim for the candidate", () => {
    render(
      <ApplicationIntroductionDisplay
        audience="candidate"
        text={"My first line.\nMy second line."}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Your introduction" }),
    ).toBeInTheDocument();
    expect(screen.getByText("My first line. My second line.").textContent).toBe(
      "My first line.\nMy second line.",
    );
  });

  it("uses the employer label without changing the authored text", () => {
    render(
      <ApplicationIntroductionDisplay
        audience="employer"
        text="Candidate-authored introduction."
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Candidate introduction" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Candidate-authored introduction."),
    ).toBeInTheDocument();
  });

  it("renders nothing for an application without an introduction", () => {
    const { container } = render(
      <ApplicationIntroductionDisplay audience="candidate" text={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
