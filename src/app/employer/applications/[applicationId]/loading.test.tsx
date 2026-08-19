import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "@/app/employer/applications/[applicationId]/loading";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";

describe("employer application detail Loading", () => {
  it("announces a busy 'Loading application' status region", () => {
    render(<Loading />);

    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveTextContent("Loading application");
  });

  it("renders the fixed Applicant (8) and Vacancy (3) detail-list row counts", () => {
    const { container } = render(<Loading />);

    const detailLists = container.querySelectorAll(`.${styles.detailList}`);
    expect(detailLists).toHaveLength(2);

    const [applicant, vacancy] = detailLists;
    expect(applicant?.children).toHaveLength(8);
    expect(vacancy?.children).toHaveLength(3);
  });

  it("renders status-history rows as a list, not fabricated event text", () => {
    const { container } = render(<Loading />);

    const listItems = container.querySelectorAll(`.${styles.listItem}`);
    expect(listItems.length).toBeGreaterThan(0);
  });

  it("does not render status-action buttons or the outcome-history section", () => {
    render(<Loading />);

    expect(screen.queryByText("Interview and hire history")).toBeNull();
    expect(screen.queryByText("First opened")).toBeNull();
  });

  it("renders no interactive controls", () => {
    render(<Loading />);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });
});
