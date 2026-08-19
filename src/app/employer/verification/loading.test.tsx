import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "@/app/employer/verification/loading";
import styles from "@/components/employer-verification/employer-verification.module.scss";
import { VERIFICATION_PAGE_HEADING } from "@/lib/employer/verification/messages";

describe("employer verification Loading", () => {
  it("announces a busy 'Loading verification status' region", () => {
    render(<Loading />);

    const regions = screen.getAllByRole("status");
    expect(regions).toHaveLength(1);
    expect(regions[0]).toHaveAttribute("aria-busy", "true");
    expect(regions[0]).toHaveTextContent("Loading verification status");
  });

  it("renders the real static page heading directly, not as a skeleton", () => {
    render(<Loading />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: VERIFICATION_PAGE_HEADING,
      }),
    ).toBeInTheDocument();
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
