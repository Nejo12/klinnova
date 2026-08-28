import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading, {
  EMPLOYER_HOME_VACANCY_SKELETON_COUNT,
} from "@/app/employer/loading";
import styles from "@/app/employer/employer-home.module.scss";

describe("employer home Loading", () => {
  it("announces busy status regions, including 'Loading employer home'", () => {
    render(<Loading />);

    const regions = screen.getAllByRole("status");
    expect(regions.length).toBeGreaterThan(1);
    for (const region of regions) {
      expect(region).toHaveAttribute("aria-busy", "true");
    }
    expect(
      regions.some((region) => region.textContent === "Loading employer home"),
    ).toBe(true);
  });

  it("renders a representative vacancies mini-list", () => {
    const { container } = render(<Loading />);

    const listItems = container.querySelectorAll(`.${styles.vacancyRow}`);
    expect(listItems).toHaveLength(EMPLOYER_HOME_VACANCY_SKELETON_COUNT);
  });

  it("does not render real attention, verification, vacancy, or count claims", () => {
    render(<Loading />);

    expect(screen.queryByText(/needs? attention/i)).toBeNull();
    expect(screen.queryByText("Verified")).toBeNull();
    expect(
      screen.queryByText(/new applications? (is|are) waiting/i),
    ).toBeNull();
    expect(screen.queryByText(/\d+\s+applications?/i)).toBeNull();
    expect(
      screen.queryByText(
        /published|private draft|paused|filled|expired|withdrawn/i,
      ),
    ).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("renders no interactive controls", () => {
    render(<Loading />);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
