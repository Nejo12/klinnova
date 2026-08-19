import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "@/app/employer/verification/loading";
import styles from "@/components/employer-verification/employer-verification.module.scss";

describe("employer verification Loading", () => {
  it("announces busy status regions, including 'Loading verification status'", () => {
    render(<Loading />);

    const regions = screen.getAllByRole("status");
    expect(regions.length).toBeGreaterThan(1);
    for (const region of regions) {
      expect(region).toHaveAttribute("aria-busy", "true");
    }
    expect(
      regions.some(
        (region) => region.textContent === "Loading verification status",
      ),
    ).toBe(true);
  });

  it("renders one panel with a representative detail-row count", () => {
    const { container } = render(<Loading />);

    const panels = container.querySelectorAll(`.${styles.panel}`);
    expect(panels).toHaveLength(1);
    expect(
      panels[0]?.querySelectorAll(`.${styles.detailList} > *`),
    ).toHaveLength(2);
  });

  it("does not render any specific status heading text", () => {
    render(<Loading />);

    for (const heading of [
      "Not requested",
      "Pending review",
      "Verified",
      "Not approved",
      "Revoked",
    ]) {
      expect(screen.queryByText(heading)).toBeNull();
    }
  });

  it("renders no interactive controls", () => {
    render(<Loading />);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
