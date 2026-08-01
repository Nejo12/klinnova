import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmployerShell } from "@/components/employer-shell";

describe("EmployerShell", () => {
  it("renders the employer/admin preview region without product controls", () => {
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
        name: "Employer and admin preview",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Workspace preview" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "What this shell is not" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Not an employer dashboard")).toBeInTheDocument();
    expect(
      screen.getByText("Not vacancy creation or moderation"),
    ).toBeInTheDocument();
    expect(screen.getByText("Not applicant review")).toBeInTheDocument();

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Back to candidate preview" }),
    ).toHaveAttribute("href", "#candidate-experience");
  });
});
