import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "@/app/employer/vacancies/loading";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import {
  VACANCY_LIST_HEADING,
  VACANCY_LIST_LEAD,
  VACANCY_PRIVATE_NOTICE,
} from "@/lib/employer/vacancies/messages";

describe("employer vacancies list Loading", () => {
  it("announces busy status regions for Live and Not live", () => {
    render(<Loading />);

    const regions = screen.getAllByRole("status");
    expect(regions.length).toBeGreaterThan(1);
    for (const region of regions) {
      expect(region).toHaveAttribute("aria-busy", "true");
    }
    const labels = regions.map((region) => region.textContent ?? "");
    expect(
      labels.some((label) => label.includes("Loading live vacancies")),
    ).toBe(true);
    expect(
      labels.some((label) => label.includes("Loading not-live vacancies")),
    ).toBe(true);
  });

  it("renders the real header, heading, lead, note, and Create draft action", () => {
    render(<Loading />);

    expect(
      screen.getByRole("heading", { level: 1, name: VACANCY_LIST_HEADING }),
    ).toBeInTheDocument();
    expect(screen.getByText(VACANCY_LIST_LEAD)).toBeInTheDocument();
    expect(screen.getByText(VACANCY_PRIVATE_NOTICE)).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Employer" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create draft" })).toHaveAttribute(
      "href",
      "/employer/vacancies/new",
    );
  });

  it("renders Live and Not live structure without claiming counts or vacancy names", () => {
    const { container } = render(<Loading />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Live" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Not live" }),
    ).toBeInTheDocument();

    const sections = container.querySelectorAll(`.${styles.vacancyGroup}`);
    expect(sections).toHaveLength(2);

    const [live, notLive] = sections;
    expect(live?.querySelectorAll(`.${styles.vacancyRow}`)).toHaveLength(2);
    expect(notLive?.querySelectorAll(`.${styles.vacancyRow}`)).toHaveLength(1);
    expect(screen.queryByText("Office Cleaner")).toBeNull();
    expect(screen.queryByText("Applications 8")).toBeNull();
  });

  it("does not render pretend Publish, Edit, or Manage controls", () => {
    render(<Loading />);

    expect(screen.queryByRole("link", { name: "Manage" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Publish" })).toBeNull();
  });

  it("localizes static loading chrome and status labels in German", () => {
    document.documentElement.dataset.locale = "de";
    document.documentElement.lang = "de";

    render(
      <LocaleProvider>
        <Loading />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Stellen" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Aktiv" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Nicht aktiv" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Stelle erstellen" }),
    ).toHaveAttribute("href", "/employer/vacancies/new");
    expect(
      screen
        .getAllByRole("status")
        .some((region) =>
          region.textContent?.includes("Aktive Stellen werden geladen"),
        ),
    ).toBe(true);

    document.documentElement.dataset.locale = "en";
    document.documentElement.lang = "en";
  });
});
