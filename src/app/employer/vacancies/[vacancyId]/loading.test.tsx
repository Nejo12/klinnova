import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "@/app/employer/vacancies/[vacancyId]/loading";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";

describe("employer vacancy detail Loading", () => {
  it("announces busy status regions, including 'Loading vacancy'", () => {
    render(<Loading />);

    const regions = screen.getAllByRole("status");
    expect(regions.length).toBeGreaterThan(1);
    for (const region of regions) {
      expect(region).toHaveAttribute("aria-busy", "true");
    }
    expect(
      regions.some((region) => region.textContent === "Loading vacancy"),
    ).toBe(true);
  });

  it("renders the fixed 13-row unconditional detail-list shape", () => {
    const { container } = render(<Loading />);

    const detailList = container.querySelector(`.${styles.detailList}`);
    expect(detailList?.children).toHaveLength(13);
  });

  it("does not render the readiness checklist or lifecycle-action forms", () => {
    render(<Loading />);

    expect(screen.queryByText("Publication readiness")).toBeNull();
    expect(screen.queryByText("Lifecycle actions")).toBeNull();
  });

  it("renders no interactive controls", () => {
    render(<Loading />);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });
});
