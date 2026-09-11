import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const selectEmployerTypeAction = vi.hoisted(() => vi.fn());

vi.mock("@/app/employer/onboarding/actions", () => ({
  selectEmployerTypeAction,
}));

import { LocaleProvider } from "@/components/i18n/locale-provider";
import { TypeSelectionForm } from "@/components/employer-onboarding/type-selection-form";

function renderTypeSelectionForm(
  currentType: "private" | "organisation" | null = null,
  typeLocked = false,
) {
  return render(
    <LocaleProvider>
      <TypeSelectionForm currentType={currentType} typeLocked={typeLocked} />
    </LocaleProvider>,
  );
}

describe("TypeSelectionForm", () => {
  beforeEach(() => {
    document.documentElement.dataset.locale = "en";
    document.documentElement.lang = "en";
    selectEmployerTypeAction.mockReset();
  });

  it("exposes the employer choices through the Fieldset accessibility contract", () => {
    renderTypeSelectionForm("private");

    const group = screen.getByRole("group", { name: "How do you hire?" });
    const descriptionId = group.getAttribute("aria-describedby");
    const privateChoice = screen.getByRole("radio", {
      name: "Private person",
    });
    const organisationChoice = screen.getByRole("radio", {
      name: "Organisation",
    });

    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId ?? "")).toHaveTextContent(
      "Choose private if you hire as an individual. Choose organisation if you hire for a company. You can correct this while onboarding is incomplete and no organisation company exists yet.",
    );
    expect(privateChoice).toBeChecked();
    expect(organisationChoice).not.toBeChecked();
    expect(privateChoice).toBeRequired();
    expect(organisationChoice).toBeRequired();
    expect(privateChoice).toHaveAttribute("name", "employerType");
    expect(privateChoice).toHaveAttribute("value", "private");
    expect(organisationChoice).toHaveAttribute("name", "employerType");
    expect(organisationChoice).toHaveAttribute("value", "organisation");
  });

  it("preserves the selected value and disables the controls while submitting", async () => {
    const user = userEvent.setup();
    let submittedType: FormDataEntryValue | null = null;
    let resolveAction:
      ((value: { error: null; message: null }) => void) | null = null;
    const actionResult = new Promise<{ error: null; message: null }>(
      (resolve) => {
        resolveAction = resolve;
      },
    );

    selectEmployerTypeAction.mockImplementation(
      async (
        _previous: { error: string | null; message: string | null },
        formData: FormData,
      ) => {
        submittedType = formData.get("employerType");
        return actionResult;
      },
    );

    renderTypeSelectionForm("organisation");

    const privateChoice = screen.getByRole("radio", {
      name: "Private person",
    });
    const organisationChoice = screen.getByRole("radio", {
      name: "Organisation",
    });

    expect(organisationChoice).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(submittedType).toBe("organisation");
    expect(privateChoice).toBeDisabled();
    expect(organisationChoice).toBeDisabled();
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();

    await act(async () => {
      resolveAction?.({ error: null, message: null });
      await actionResult;
    });
  });

  it("preserves the German legend and supporting description", () => {
    document.documentElement.dataset.locale = "de";
    document.documentElement.lang = "de";

    renderTypeSelectionForm();

    const group = screen.getByRole("group", {
      name: "Wie stellen Sie ein?",
    });
    const descriptionId = group.getAttribute("aria-describedby");

    expect(document.getElementById(descriptionId ?? "")).toHaveTextContent(
      "Wählen Sie Privatperson, wenn Sie als Einzelperson einstellen, oder Organisation, wenn Sie für ein Unternehmen einstellen. Während der Einrichtung kann diese Auswahl korrigiert werden, solange noch kein Unternehmen angelegt wurde.",
    );
    expect(
      screen.getByRole("radio", { name: "Privatperson" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Organisation" }),
    ).toBeInTheDocument();
  });

  it("keeps the locked-account presentation unchanged", () => {
    renderTypeSelectionForm("organisation", true);

    expect(
      screen.getByRole("heading", { name: "Employer type" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "You hire as an organisation. This type is locked for your account.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
