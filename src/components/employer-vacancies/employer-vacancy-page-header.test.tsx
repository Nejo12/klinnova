import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";

describe("EmployerVacancyPageHeader", () => {
  it("renders an Applications nav link to /employer/applications", () => {
    render(
      <EmployerVacancyPageHeader
        showCandidate={false}
        showEmployer={true}
        currentPath="vacancies"
      />,
    );
    expect(screen.getByRole("link", { name: "Applications" })).toHaveAttribute(
      "href",
      "/employer/applications",
    );
  });

  it("marks the Applications link as the current page only when currentPath is applications", () => {
    render(
      <EmployerVacancyPageHeader
        showCandidate={false}
        showEmployer={true}
        currentPath="applications"
      />,
    );
    expect(screen.getByRole("link", { name: "Applications" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Vacancies" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("does not mark Applications current on other paths", () => {
    render(
      <EmployerVacancyPageHeader
        showCandidate={false}
        showEmployer={true}
        currentPath="verification"
      />,
    );
    expect(
      screen.getByRole("link", { name: "Applications" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("is visible for completed employers with no verification-specific hiding", () => {
    render(
      <EmployerVacancyPageHeader
        showCandidate={false}
        showEmployer={true}
        currentPath="home"
      />,
    );
    expect(
      screen.getByRole("link", { name: "Applications" }),
    ).toBeInTheDocument();
  });

  it("shows no badge when unseenApplicationsCount is omitted (accessible name stays exactly 'Applications')", () => {
    render(
      <EmployerVacancyPageHeader
        showCandidate={false}
        showEmployer={true}
        currentPath="home"
      />,
    );
    expect(
      screen.getByRole("link", { name: "Applications" }),
    ).toBeInTheDocument();
  });

  it("shows no badge when unseenApplicationsCount is 0", () => {
    render(
      <EmployerVacancyPageHeader
        showCandidate={false}
        showEmployer={true}
        currentPath="home"
        unseenApplicationsCount={0}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Applications" }),
    ).toBeInTheDocument();
  });

  it("exposes an unambiguous accessible name including the count when unseenApplicationsCount is positive", () => {
    render(
      <EmployerVacancyPageHeader
        showCandidate={false}
        showEmployer={true}
        currentPath="home"
        unseenApplicationsCount={3}
      />,
    );
    expect(
      screen.getByRole("link", { name: /^Applications\s*3\s*new$/ }),
    ).toHaveAttribute("href", "/employer/applications");
  });

  it("does not create a duplicate/ambiguous accessible name for the Applications link when a badge is shown", () => {
    render(
      <EmployerVacancyPageHeader
        showCandidate={false}
        showEmployer={true}
        currentPath="home"
        unseenApplicationsCount={5}
      />,
    );
    expect(
      screen.queryByRole("link", { name: "Applications" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Applications/ })).toHaveLength(
      1,
    );
  });

  it("visibly displays the numeric count (not only in the accessible name)", () => {
    render(
      <EmployerVacancyPageHeader
        showCandidate={false}
        showEmployer={true}
        currentPath="home"
        unseenApplicationsCount={7}
      />,
    );
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("keeps the primary employer navigation and logout control accessible after responsive grouping", () => {
    render(
      <EmployerVacancyPageHeader
        showCandidate={false}
        showEmployer={true}
        currentPath="home"
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Employer" });
    expect(within(nav).getAllByRole("link")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });
});
