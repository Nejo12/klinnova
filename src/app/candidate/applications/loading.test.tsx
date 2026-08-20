import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading, {
  APPLICATION_CARD_SKELETON_COUNT,
} from "@/app/candidate/applications/loading";
import styles from "@/components/candidate-matches/candidate-matches.module.scss";

describe("candidate applications Loading", () => {
  it("announces a busy 'Loading applications' status region", () => {
    render(<Loading />);

    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveTextContent("Loading applications");
  });

  it("renders one skeleton card per list item, matching the card count", () => {
    const { container } = render(<Loading />);

    const items = container.querySelectorAll(`.${styles.list} > li`);
    expect(items).toHaveLength(APPLICATION_CARD_SKELETON_COUNT);
  });

  it("does not render Active/Closed group headings (data-dependent structure)", () => {
    render(<Loading />);

    expect(screen.queryByText("Active")).toBeNull();
    expect(screen.queryByText("Closed")).toBeNull();
  });

  it("renders no interactive controls", () => {
    render(<Loading />);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
