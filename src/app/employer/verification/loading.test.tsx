import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "@/app/employer/verification/loading";
import styles from "@/components/employer-verification/employer-verification.module.scss";
import { VERIFICATION_PAGE_HEADING } from "@/lib/employer/verification/messages";

describe("employer verification Loading", () => {
  it("announces a busy 'Loading verification status' region", () => {
    render(<Loading />);

    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveTextContent("Loading verification status");
  });

  it("renders the real header and page heading, not as skeletons", () => {
    render(<Loading />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: VERIFICATION_PAGE_HEADING,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Employer" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Verification" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("renders one state-surface skeleton without claiming details", () => {
    const { container } = render(<Loading />);

    expect(container.querySelectorAll(`.${styles.panel}`)).toHaveLength(1);
    expect(container.querySelector(`.${styles.detailList}`)).toBeNull();
  });

  it("does not render any specific status text or request controls", () => {
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
    expect(
      screen.queryByRole("button", { name: "Request verification" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Resubmit verification" }),
    ).toBeNull();
  });
});
