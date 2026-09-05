import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const actionMock = vi.hoisted(() =>
  vi.fn(async (): Promise<{ status: "failure" }> => ({ status: "failure" })),
);

vi.mock("@/app/candidate/jobs/[vacancyId]/actions", () => ({
  submitCandidateApplicationAction: actionMock,
}));

import { ApplicationSubmitForm } from "@/components/candidate-job-detail/application-submit-form";
import { APPLICATION_FAILURE_MESSAGE } from "@/lib/applications/messages";

const VACANCY_ID = "22222222-2222-4222-8222-222222222201";
const VACANCY_TITLE = "Morning kitchen support";
const EMPLOYER_NAME = "Berlin Work Co";

function renderForm() {
  return render(
    <ApplicationSubmitForm
      employerDisplayName={EMPLOYER_NAME}
      vacancyId={VACANCY_ID}
      vacancyTitle={VACANCY_TITLE}
    />,
  );
}

describe("ApplicationSubmitForm", () => {
  it("starts with a fully editable deterministic suggestion", async () => {
    const user = userEvent.setup();
    renderForm();

    const introduction = screen.getByRole("textbox", {
      name: "Introduction to the employer",
    });
    expect(introduction).toHaveValue(
      "Hello, I’m interested in the Morning kitchen support role at Berlin Work Co. I’d be happy to discuss how my experience and availability fit the job.",
    );
    expect(introduction).toHaveAttribute("maxlength", "1000");

    await user.clear(introduction);
    await user.type(introduction, "My own words.");
    expect(introduction).toHaveValue("My own words.");
  });

  it("previews exact normalized text and context without submitting", async () => {
    const user = userEvent.setup();
    renderForm();

    const introduction = screen.getByRole("textbox", {
      name: "Introduction to the employer",
    });
    await user.clear(introduction);
    await user.type(introduction, "  My exact introduction.  ");
    await user.click(
      screen.getByRole("button", { name: "Preview application" }),
    );

    expect(actionMock).not.toHaveBeenCalled();
    expect(screen.getByText("My exact introduction.")).toBeInTheDocument();
    expect(screen.getByText(EMPLOYER_NAME)).toBeInTheDocument();
    expect(screen.getByText(VACANCY_TITLE)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Submit application" }),
    ).toBeEnabled();
  });

  it("submits only after the separate final action", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(
      screen.getByRole("button", { name: "Preview application" }),
    );
    expect(actionMock).not.toHaveBeenCalled();

    const submitButton = screen.getByRole("button", {
      name: "Submit application",
    });
    const form = submitButton.closest("form");
    expect(form).not.toBeNull();
    expect(
      within(form as HTMLFormElement).getByDisplayValue(VACANCY_ID),
    ).toHaveAttribute("name", "vacancyId");

    await user.click(submitButton);
    expect(actionMock).toHaveBeenCalledTimes(1);
  });

  it("allows an optional blank introduction", async () => {
    const user = userEvent.setup();
    renderForm();

    const introduction = screen.getByRole("textbox", {
      name: "Introduction to the employer",
    });
    await user.clear(introduction);
    await user.click(
      screen.getByRole("button", { name: "Preview application" }),
    );

    expect(
      screen.getByText("No introduction will be included."),
    ).toBeInTheDocument();
    const introductionInput = document.querySelector(
      'input[name="introductionText"]',
    );
    expect(introductionInput).toHaveValue("");
  });

  it("preserves unsent text after failure and when returning to edit", async () => {
    const user = userEvent.setup();
    actionMock.mockResolvedValueOnce({ status: "failure" });
    renderForm();

    const introduction = screen.getByRole("textbox", {
      name: "Introduction to the employer",
    });
    await user.clear(introduction);
    await user.type(introduction, "Please keep this text.");
    await user.click(
      screen.getByRole("button", { name: "Preview application" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Submit application" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      APPLICATION_FAILURE_MESSAGE,
    );
    expect(screen.getByText("Please keep this text.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back to edit" }));
    expect(
      screen.getByRole("textbox", { name: "Introduction to the employer" }),
    ).toHaveValue("Please keep this text.");
  });
});
