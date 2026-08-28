import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading, {
  APPLICATION_CARD_SKELETON_COUNT,
  APPLICATION_META_ROW_SKELETON_COUNT,
} from "@/app/candidate/applications/loading";
import styles from "@/components/candidate-applications/candidate-applications.module.scss";

describe("candidate applications Loading", () => {
  it("announces a busy 'Loading applications' status region", () => {
    render(<Loading />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Applications" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your active and closed applications in one place."),
    ).toBeInTheDocument();
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveTextContent("Loading applications");
  });

  it("retains the four Candidate navigation destinations", () => {
    render(<Loading />);

    expect(screen.getByRole("link", { name: "Matches" })).toHaveAttribute(
      "href",
      "/candidate/matches",
    );
    expect(screen.getByRole("link", { name: "Applications" })).toHaveAttribute(
      "href",
      "/candidate/applications",
    );
    expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute(
      "href",
      "/candidate/account",
    );
  });

  it("renders one skeleton card per list item, matching the card count", () => {
    const { container } = render(<Loading />);

    const items = container.querySelectorAll(`.${styles.list} > li`);
    expect(items).toHaveLength(APPLICATION_CARD_SKELETON_COUNT);
  });

  it("renders two metadata skeleton rows per card for Location and Submitted only", () => {
    const { container } = render(<Loading />);

    const items = Array.from(
      container.querySelectorAll(`.${styles.list} > li`),
    );
    for (const item of items) {
      expect(
        item.querySelectorAll('[data-testid="application-loading-meta-row"]'),
      ).toHaveLength(APPLICATION_META_ROW_SKELETON_COUNT);
    }
  });

  it("matches the current rail skeleton shape: label placeholder before horizontal marker", () => {
    const { container } = render(<Loading />);

    const railNodes = container.querySelectorAll(
      '[data-testid="application-loading-rail-node"]',
    );
    expect(railNodes).toHaveLength(APPLICATION_CARD_SKELETON_COUNT * 4);

    for (const node of railNodes) {
      expect(node.children).toHaveLength(2);
      expect(node.children[0]).toHaveAttribute(
        "data-testid",
        "application-loading-rail-label",
      );
      expect(node.children[1]).toHaveAttribute(
        "data-testid",
        "application-loading-rail-marker",
      );
    }
  });

  it("does not render Active/Closed group headings (data-dependent structure)", () => {
    render(<Loading />);

    expect(screen.queryByText("Active")).toBeNull();
    expect(screen.queryByText("Closed")).toBeNull();
  });

  it("renders no fake application actions", () => {
    render(<Loading />);

    expect(
      screen.queryByRole("link", { name: /View application/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Find more matches" }),
    ).toBeNull();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
