import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading, {
  MATCH_CARD_SKELETON_COUNT,
} from "@/app/candidate/matches/loading";
import styles from "@/components/candidate-matches/candidate-matches.module.scss";
import {
  CANDIDATE_MATCHES_HEADING,
  CANDIDATE_MATCHES_LEAD,
} from "@/lib/candidate-matches/messages";

describe("candidate matches Loading", () => {
  it("announces a busy 'Loading matches' status region", () => {
    render(<Loading />);

    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveTextContent("Loading matches");
  });

  it("renders the real static heading/lead directly, not as skeletons", () => {
    render(<Loading />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: CANDIDATE_MATCHES_HEADING,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(CANDIDATE_MATCHES_LEAD)).toBeInTheDocument();
    expect(
      screen.queryByText("Current roles matched from your saved profile."),
    ).toBeNull();
  });

  it("renders static candidate navigation during route loading", () => {
    render(<Loading />);

    const nav = screen.getByRole("navigation", { name: "Candidate" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Matches" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Applications" })).toHaveAttribute(
      "href",
      "/candidate/applications",
    );
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute(
      "href",
      "/candidate/onboarding?group=review",
    );
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute(
      "href",
      "/candidate/account",
    );
    expect(screen.queryByRole("link", { name: "Employer" })).toBeNull();
  });

  it("renders one skeleton card per list item, matching the card count", () => {
    const { container } = render(<Loading />);

    const items = container.querySelectorAll(`.${styles.list} > li`);
    expect(items).toHaveLength(MATCH_CARD_SKELETON_COUNT);
  });

  it("renders no destructive or data-dependent controls", () => {
    render(<Loading />);

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(
      screen.getByRole("button", {
        name: "Workspace and account: Candidate",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /apply|submit|save|view job/i }),
    ).toBeNull();
  });
});
