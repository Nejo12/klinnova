import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "@/app/employer/vacancies/loading";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";

describe("employer vacancies list Loading", () => {
  it("announces busy status regions, including 'Loading vacancies'", () => {
    render(<Loading />);

    const regions = screen.getAllByRole("status");
    expect(regions.length).toBeGreaterThan(1);
    for (const region of regions) {
      expect(region).toHaveAttribute("aria-busy", "true");
    }
    expect(
      regions.some((region) => region.textContent === "Loading vacancies"),
    ).toBe(true);
  });

  it("renders representative Live and Not-live row counts", () => {
    const { container } = render(<Loading />);

    const sections = container.querySelectorAll(`.${styles.section}`);
    expect(sections).toHaveLength(2);

    const [live, notLive] = sections;
    expect(live?.querySelectorAll(`.${styles.listItem}`)).toHaveLength(2);
    expect(notLive?.querySelectorAll(`.${styles.listItem}`)).toHaveLength(1);
  });

  it("renders each row's six unconditional meta lines (Category, Locality, Employer type, Status, Next, Updated)", () => {
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
