import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationEntryNotice } from "@/components/public-jobs/application-entry-notice";

const vacancyId = "11111111-1111-4111-8111-111111111111";

describe("ApplicationEntryNotice", () => {
  it("shows the neutral notice text regardless of auth state", () => {
    render(
      <ApplicationEntryNotice vacancyId={vacancyId} authenticated={false} />,
    );
    expect(
      screen.getByText("Sign in to check your eligibility and apply."),
    ).toBeInTheDocument();
  });

  it("links anonymous visitors to login with a safe encoded next path", () => {
    render(
      <ApplicationEntryNotice vacancyId={vacancyId} authenticated={false} />,
    );
    const link = screen.getByRole("link", { name: "Sign in" });
    expect(link).toHaveAttribute(
      "href",
      `/login?next=${encodeURIComponent(`/jobs/${vacancyId}`)}`,
    );
  });

  it("links authenticated visitors to the existing candidate area", () => {
    render(
      <ApplicationEntryNotice vacancyId={vacancyId} authenticated={true} />,
    );
    const link = screen.getByRole("link", {
      name: "Go to your candidate account",
    });
    expect(link).toHaveAttribute("href", "/candidate");
  });

  it("never claims confirmed eligibility or an active apply action", () => {
    const { container } = render(
      <ApplicationEntryNotice vacancyId={vacancyId} authenticated={true} />,
    );
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/apply now/i);
    expect(text).not.toMatch(/you match/i);
    expect(text).not.toMatch(/you are eligible/i);
    expect(text).not.toMatch(/missing requirements/i);
  });
});
