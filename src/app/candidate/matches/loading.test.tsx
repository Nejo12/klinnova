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
  });

  it("renders one skeleton card per list item, matching the card count", () => {
    const { container } = render(<Loading />);

    const items = container.querySelectorAll(`.${styles.list} > li`);
    expect(items).toHaveLength(MATCH_CARD_SKELETON_COUNT);
  });

  it("renders no interactive controls", () => {
    render(<Loading />);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
