import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "@/app/employer/vacancies/loading";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import {
  VACANCY_LIST_HEADING,
  VACANCY_LIST_LEAD,
  VACANCY_PRIVATE_NOTICE,
} from "@/lib/employer/vacancies/messages";

describe("employer vacancies list Loading", () => {
  it("announces busy status regions, including 'Loading actions' and 'Loading live vacancies'", () => {
    render(<Loading />);

    const regions = screen.getAllByRole("status");
    expect(regions.length).toBeGreaterThan(1);
    for (const region of regions) {
      expect(region).toHaveAttribute("aria-busy", "true");
    }
    const labels = regions.map((region) => region.textContent);
    expect(labels).toContain("Loading actions");
    expect(labels).toContain("Loading live vacancies");
    expect(labels).toContain("Loading not-live vacancies");
  });

  it("renders the real static heading/lead/note directly, not as skeletons", () => {
    render(<Loading />);

    expect(
      screen.getByRole("heading", { level: 1, name: VACANCY_LIST_HEADING }),
    ).toBeInTheDocument();
    expect(screen.getByText(VACANCY_LIST_LEAD)).toBeInTheDocument();
    expect(screen.getByText(VACANCY_PRIVATE_NOTICE)).toBeInTheDocument();
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
