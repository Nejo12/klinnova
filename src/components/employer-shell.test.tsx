import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmployerShell } from "@/components/employer-shell";

describe("EmployerShell", () => {
  it("renders the employer/admin section with a real entry path and no false unavailability claims", () => {
    render(<EmployerShell />);

    const region = screen.getByRole("region", {
      name: "Clear vacancies. Careful review.",
    });
    expect(region).toHaveAttribute("id", "employer-admin-experience");

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Clear vacancies. Careful review.",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("complementary", {
        name: "Employer and admin",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Workspace layout" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "What's included" }),
    ).toBeInTheDocument();

    // No false "not available" claims: verification, vacancy creation, and
    // applicant review are all implemented and must never be described as
    // unavailable on this section again.
    expect(
      screen.queryByText(/not available yet/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/not an employer dashboard/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/not vacancy creation or moderation/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/not applicant review/i)).not.toBeInTheDocument();

    expect(screen.getByText("Employer verification")).toBeInTheDocument();
    expect(
      screen.getByText("Vacancy creation and publishing"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Applicant review and status updates"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Register as an employer" }),
    ).toHaveAttribute("href", "/employer/register");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Back to candidate preview" }),
    ).toHaveAttribute("href", "#candidate-experience");
  });
});
