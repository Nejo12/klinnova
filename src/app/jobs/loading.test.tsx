import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "@/app/jobs/loading";
import styles from "@/components/public-jobs/public-jobs.module.scss";

describe("public jobs list Loading", () => {
  it("announces busy status regions, including 'Loading job count' and 'Loading jobs'", () => {
    render(<Loading />);

    const regions = screen.getAllByRole("status");
    expect(regions.length).toBeGreaterThan(1);
    for (const region of regions) {
      expect(region).toHaveAttribute("aria-busy", "true");
    }
    const labels = regions.map((region) => region.textContent);
    expect(labels).toContain("Loading job count");
    expect(labels).toContain("Loading jobs");
  });

  it("renders one skeleton card per list item, each as its own <li>", () => {
    const { container } = render(<Loading />);

    const items = container.querySelectorAll(`.${styles.list} > li`);
    expect(items.length).toBeGreaterThan(0);
    const cards = container.querySelectorAll(
      `.${styles.list} > li > .${styles.card}`,
    );
    expect(cards).toHaveLength(items.length);
  });

  it("renders no interactive controls", () => {
    render(<Loading />);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
