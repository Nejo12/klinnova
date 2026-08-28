import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading, {
  APPLICATION_CARD_SKELETON_COUNT,
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
