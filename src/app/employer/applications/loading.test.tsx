import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "@/app/employer/applications/loading";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";

describe("employer applications list Loading", () => {
  it("announces busy status regions, including 'Loading applications'", () => {
    render(<Loading />);

    const regions = screen.getAllByRole("status");
    expect(regions.length).toBeGreaterThan(1);
    for (const region of regions) {
      expect(region).toHaveAttribute("aria-busy", "true");
    }
    expect(
      regions.some((region) => region.textContent === "Loading applications"),
    ).toBe(true);
  });

  it("renders representative Needs review / Open / Decided row counts", () => {
    const { container } = render(<Loading />);

    const sections = container.querySelectorAll(`.${styles.section}`);
    expect(sections).toHaveLength(3);

    const [needsReview, open, decided] = sections;
    expect(needsReview?.querySelectorAll(`.${styles.listItem}`)).toHaveLength(
      2,
    );
    expect(open?.querySelectorAll(`.${styles.listItem}`)).toHaveLength(1);
    expect(decided?.querySelectorAll(`.${styles.listItem}`)).toHaveLength(1);
  });

  it("renders each row's six typical-case meta lines (Vacancy, Matched category, German comfort, Available from, Status, Submitted)", () => {
    const { container } = render(<Loading />);

    const firstRow = container.querySelector(`.${styles.listItem}`);
    expect(firstRow?.querySelectorAll(`.${styles.meta} > li`)).toHaveLength(6);
  });

  it("renders no interactive controls", () => {
    render(<Loading />);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
