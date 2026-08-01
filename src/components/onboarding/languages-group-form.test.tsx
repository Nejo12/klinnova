import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/candidate/onboarding/actions", () => ({
  saveLanguagesGroupAction: vi.fn(),
}));

import { LanguagesGroupForm } from "@/components/onboarding/languages-group-form";

describe("LanguagesGroupForm", () => {
  it("renders accessible heading controls and persisted defaults", async () => {
    const user = userEvent.setup();
    render(
      <LanguagesGroupForm
        germanComfort="basic"
        languages={[
          {
            id: "1",
            languageCode: "de",
            proficiency: "native",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("group", { name: "German comfort" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Languages you speak" }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("German")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save and continue" }),
    ).toBeEnabled();

    await user.click(
      screen.getByRole("button", { name: "Add another language" }),
    );
    expect(screen.getByLabelText("Language 2")).toBeInTheDocument();
  });
});
