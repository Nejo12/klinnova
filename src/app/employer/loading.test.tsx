import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "@/app/employer/loading";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";

describe("employer home Loading", () => {
  it("announces a busy 'Loading employer home' status region", () => {
    render(<Loading />);

    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveTextContent("Loading employer home");
  });

  it("renders a representative vacancies mini-list", () => {
    const { container } = render(<Loading />);

    const listItems = container.querySelectorAll(`.${styles.listItem}`);
    expect(listItems).toHaveLength(2);
  });

  it("does not render the attention-slot warning or attention-vacancies heading", () => {
    render(<Loading />);

    expect(screen.queryByText(/needs? attention/i)).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("renders no interactive controls", () => {
    render(<Loading />);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
