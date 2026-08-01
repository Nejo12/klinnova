import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StepProgress } from "@/components/step-progress";

describe("StepProgress", () => {
  it("exposes ordered steps with one current step from text", () => {
    render(<StepProgress />);

    const navigation = screen.getByRole("navigation", {
      name: "Example candidate progress",
    });
    const list = within(navigation).getByRole("list");
    const items = within(list).getAllByRole("listitem");

    expect(items.map((item) => item.textContent)).toEqual([
      "CurrentTell us what you can do",
      "UpcomingSee suitable work",
      "UpcomingApply",
    ]);

    const currentItems = items.filter(
      (item) => item.getAttribute("aria-current") === "step",
    );
    expect(currentItems).toHaveLength(1);
    expect(currentItems[0]).toHaveTextContent("Current");
    expect(currentItems[0]).toHaveTextContent("Tell us what you can do");

    items.slice(1).forEach((item) => {
      expect(item).not.toHaveAttribute("aria-current");
      expect(item).toHaveTextContent("Upcoming");
    });
  });
});
