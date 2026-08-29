import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "@/app/employer/applications/[applicationId]/loading";
import styles from "@/components/employer-applications/employer-applications.module.scss";

describe("employer application detail Loading", () => {
  it("announces busy status regions, including 'Loading application'", () => {
    render(<Loading />);

    const regions = screen.getAllByRole("status");
    expect(regions.length).toBeGreaterThan(1);
    for (const region of regions) {
      expect(region).toHaveAttribute("aria-busy", "true");
    }
    expect(
      regions.some((region) => region.textContent === "Loading application"),
    ).toBe(true);
  });

  it("renders the fixed Applicant essentials detail-list row count", () => {
    const { container } = render(<Loading />);

    const detailLists = container.querySelectorAll(`.${styles.detailList}`);
    expect(detailLists).toHaveLength(1);

    const [applicant] = detailLists;
    expect(applicant?.children).toHaveLength(7);
  });

  it("renders status-history rows as a list, not fabricated event text", () => {
    const { container } = render(<Loading />);

    const listItems = container.querySelectorAll(`.${styles.historyItem}`);
    expect(listItems.length).toBeGreaterThan(0);
  });

  it("does not render status-action buttons or the outcome-history section", () => {
    render(<Loading />);

    expect(screen.queryByText("Interview and hire history")).toBeNull();
    expect(screen.queryByText("First opened")).toBeNull();
  });

  it("renders no interactive controls", () => {
    render(<Loading />);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });
});
