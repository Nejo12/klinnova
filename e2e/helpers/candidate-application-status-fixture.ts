import { expect, type Page } from "@playwright/test";

import { registerAndConfirm } from "./auth";
import { seedVacancyMatchingArrays } from "./employer-application-fixture";
import {
  getLocalUserIdByEmail,
  provisionLocalVerificationOperator,
} from "./local-operator-proof";
import {
  applicationStatusLabel,
  employerApplicationActionLabel,
  type ApplicationStatus,
} from "@/lib/employer/applications/status";

export type PublishedVacancy = {
  vacancyId: string;
  employerId: string;
  employerEmail: string;
  employerPassword: string;
  employerDisplayName: string;
};

/**
 * Submits one of `VacancyDraftForm`'s two save buttons ("Save draft" /
 * "Save languages") and reloads afterward, rather than asserting the
 * in-place confirmation text ("Draft changes saved." / "Language
 * requirements saved.") is ever shown.
 *
 * Pre-existing, environment-dependent product quirk (independently
 * confirmed while building Task G / P3.6 — see task-G-report.md):
 * `VacancyDraftForm`'s `useActionState` `pending` flag occasionally never
 * flips back to `false` after its own POST resolves, even though the POST
 * always completes with 200 and the write is durably saved server-side
 * (confirmed live by inspecting the POST response directly: 200, carrying
 * the updated RSC payload). It reproduces identically, file-for-file, on
 * `e2e/employer-vacancy-draft-journey.spec.ts` — a spec this repo already
 * ships, on `src/components/employer-vacancies/vacancy-draft-form.tsx`, a
 * file no P3.6 task touches (confirmed via `git log main..HEAD`) — so the
 * underlying bug is out of this fixture's scope to fix. Waiting on the
 * real network response (ground truth for "did the save happen") and then
 * reloading to render fresh, unstuck server state is a test-only
 * workaround for that pre-existing quirk, not a fix for it.
 */
async function saveVacancyDraftFormAndReload(
  page: Page,
  buttonName: "Save draft" | "Save languages",
): Promise<void> {
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) =>
        candidate.url().includes("/edit") &&
        candidate.request().method() === "POST",
    ),
    page.getByRole("button", { name: buttonName }).click(),
  ]);
  expect(
    response.status(),
    `"${buttonName}" should succeed (200) even on runs where the form's own pending UI gets stuck`,
  ).toBe(200);
  await page.reload();
}

/**
 * Registers a private employer, creates a fully-readied draft, verifies it
 * (via a separate operator context), and publishes it. Mirrors
 * `publishEligibleEmployerVacancy` in
 * `e2e/employer-applicant-review-journey.spec.ts` (PR 6.2) — duplicated
 * rather than shared to avoid touching that already-merged spec file.
 * `page` ends the helper signed in as the employer, on the manage page for
 * the now-published vacancy.
 */
export async function publishEligibleEmployerVacancy(
  page: Page,
  stamp: number,
): Promise<PublishedVacancy> {
  const employerDisplayName = `Status Emp ${stamp}`;
  const employerEmail = `status.employer.${stamp}@example.test`;
  const employerPassword = `TestPass-${stamp}!`;
  const title = `Morning host role ${stamp}`;

  await registerAndConfirm(page, {
    email: employerEmail,
    password: employerPassword,
    displayName: employerDisplayName,
    registerPath: "/employer/register",
    expectedPath: /\/employer\/onboarding$/,
  });

  await page.getByRole("radio", { name: /Private person/i }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Display name").fill(employerDisplayName);
  await page.getByLabel("Berlin locality").fill("Mitte");
  await page
    .getByRole("checkbox", { name: /allowed to work in Germany/i })
    .check();
  await page.getByRole("button", { name: "Complete onboarding" }).click();
  await expect(page).toHaveURL(/\/employer$/, { timeout: 15_000 });

  await page.goto("/employer/vacancies/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Job category").selectOption("hospitality");
  await page.getByLabel("Berlin public locality").fill("Mitte");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/employer\/vacancies\/.+\/edit$/, {
    timeout: 15_000,
  });
  const vacancyId = page
    .url()
    .match(/\/employer\/vacancies\/([^/]+)\/edit/)?.[1];
  if (vacancyId === undefined) {
    throw new Error("could not parse vacancy id from edit URL");
  }

  await page.getByLabel("Description").fill("Morning host support, 3 hours.");
  await page.getByLabel("Workplace type").selectOption("shop");
  await page.getByLabel("Work frequency").selectOption("recurring");
  await page.getByRole("checkbox", { name: "CV required" }).check();
  await page
    .getByRole("checkbox", { name: "Interview can be in English" })
    .check();
  await page.getByLabel("Amount in EUR").fill("16.00");
  await page.getByLabel("Period").selectOption("hourly");
  await saveVacancyDraftFormAndReload(page, "Save draft");

  await page.getByRole("button", { name: "Add language" }).click();
  await page.getByLabel(/Language 1/i).selectOption("en");
  await page.getByLabel(/Minimum proficiency 1/i).selectOption("basic");
  await saveVacancyDraftFormAndReload(page, "Save languages");

  await seedVacancyMatchingArrays(vacancyId, ["part_time"], ["morning"]);

  await page.goto("/employer/verification");
  await page
    .getByRole("checkbox", {
      name: /I confirm that the information in my employer profile/i,
    })
    .check();
  await page.getByRole("button", { name: "Request verification" }).click();
  await expect(
    page.getByRole("status", { name: "Pending review" }),
  ).toBeVisible({ timeout: 15_000 });

  const employerId = await getLocalUserIdByEmail(employerEmail);

  const operatorContext = await page.context().browser()?.newContext();
  if (operatorContext === undefined) {
    throw new Error("could not open an operator browser context");
  }
  const operatorPage = await operatorContext.newPage();
  await registerAndConfirm(operatorPage, {
    email: `status.operator.${stamp}@example.test`,
    password: `TestPass-${stamp}!`,
    displayName: `Status Op ${stamp}`,
  });
  const operatorId = await getLocalUserIdByEmail(
    `status.operator.${stamp}@example.test`,
  );
  await provisionLocalVerificationOperator(operatorId);

  await operatorPage.goto("/internal/verification");
  await operatorPage
    .getByRole("link", {
      name: new RegExp(`Review.*${employerDisplayName}`, "i"),
    })
    .click();
  await expect(operatorPage).toHaveURL(
    new RegExp(`/internal/verification/${employerId}$`),
  );
  await operatorPage
    .getByRole("checkbox", {
      name: /I confirm this employer should be verified/i,
    })
    .check();
  await operatorPage.getByRole("button", { name: "Approve" }).click();
  await expect(operatorPage).toHaveURL(/\/internal\/verification$/, {
    timeout: 15_000,
  });
  await operatorContext.close();

  await page.goto(`/employer/vacancies/${vacancyId}`);
  const publishedStatus = page
    .getByRole("status")
    .filter({ hasText: "Published" });
  const privateDraftStatus = page
    .getByRole("status")
    .filter({ hasText: "Private draft" });

  // Wait for the server-rendered lifecycle projection before deciding whether
  // this fixture still needs to publish. A previous publish POST can finish
  // successfully while its React action state remains pending, so checking
  // the checkbox immediately can misclassify an already-published vacancy.
  await expect(publishedStatus.or(privateDraftStatus)).toBeVisible({
    timeout: 30_000,
  });

  if (await privateDraftStatus.isVisible()) {
    const publishConfirmation = page.getByRole("checkbox", {
      name: /Publishing may make this vacancy publicly visible/i,
    });
    await expect(publishConfirmation).toBeVisible({ timeout: 15_000 });
    await publishConfirmation.check({ timeout: 15_000 });
    await expect(publishConfirmation).toBeChecked();

    const [response] = await Promise.all([
      page.waitForResponse(
        (candidate) =>
          candidate.url().includes(`/employer/vacancies/${vacancyId}`) &&
          candidate.request().method() === "POST",
      ),
      page.getByRole("button", { name: "Publish" }).click(),
    ]);
    expect(
      response.status(),
      "Publish should succeed server-side before the fixture reloads",
    ).toBe(200);

    // Reload from durable server state rather than depending on a potentially
    // stuck useActionState transition in the browser.
    await page.reload();
  }

  await expect(publishedStatus).toBeVisible({ timeout: 30_000 });

  return {
    vacancyId,
    employerId,
    employerEmail,
    employerPassword,
    employerDisplayName,
  };
}

/**
 * Registers and onboards a candidate whose declared preferences are
 * eligible for `publishEligibleEmployerVacancy`'s output, then submits an
 * application to the given vacancy. Returns the confirmation URL
 * (`/candidate/applications/[applicationId]`) Playwright landed on.
 */
export async function registerAndApplyAsCandidate(
  page: Page,
  stamp: number,
  vacancyId: string,
): Promise<{ candidateDisplayName: string; applicationUrl: string }> {
  const candidateDisplayName = `Status Candidate ${stamp}`;
  const candidateEmail = `status.candidate.${stamp}@example.test`;
  const candidatePassword = `TestPass-${stamp}!`;

  await registerAndConfirm(page, {
    email: candidateEmail,
    password: candidatePassword,
    displayName: candidateDisplayName,
  });

  await page.getByRole("link", { name: "Continue onboarding" }).click();
  await expect(page).toHaveURL(/group=languages/);
  await page
    .getByRole("radio", {
      name: /I can understand and use some basic German/i,
    })
    .check();
  await page.getByLabel("Language 1", { exact: true }).selectOption("en");
  await page
    .getByLabel("Proficiency 1", { exact: true })
    .selectOption("conversational");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=work_authorisation/, {
    timeout: 15_000,
  });

  await page.getByRole("radio", { name: "Yes" }).check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=location/);

  await page.getByRole("radio", { name: /Up to 45 minutes one way/i }).check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=categories/);

  await page.getByRole("checkbox", { name: "Hospitality" }).check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=availability/);

  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() + 3);
  await page
    .getByLabel("Earliest date you can start")
    .fill(startDate.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=employment/, { timeout: 15_000 });

  await page.getByRole("checkbox", { name: "Part time" }).check();
  await page.getByRole("checkbox", { name: "Morning" }).check();
  await page.getByRole("button", { name: "Save and review" }).click();
  await expect(page).toHaveURL(/group=review/);

  await page.getByRole("button", { name: "Confirm essentials" }).click();
  await expect(page).toHaveURL(/\/candidate\/matches$/, { timeout: 15_000 });

  await page.goto(`/candidate/jobs/${vacancyId}`);
  await page.getByRole("button", { name: "Apply with profile" }).click();
  await expect(page).toHaveURL(/\/candidate\/applications\/[0-9a-f-]{36}$/, {
    timeout: 15_000,
  });

  return { candidateDisplayName, applicationUrl: page.url() };
}

const TERMINAL_TRANSITIONS = new Set(["accepted", "rejected"]);

async function expectReviewStatusSettled(
  employerPage: Page,
  targetStatus: ApplicationStatus,
): Promise<void> {
  await expect(
    employerPage
      .getByRole("region", { name: "Review" })
      .getByText(applicationStatusLabel(targetStatus), { exact: true }),
  ).toBeVisible({ timeout: 20_000 });
}

async function submitEmployerStatusActionAndReload(
  employerPage: Page,
  click: () => Promise<void>,
): Promise<void> {
  const [response] = await Promise.all([
    employerPage.waitForResponse(
      (candidate) =>
        candidate.request().method() === "POST" &&
        /\/employer\/applications\//.test(candidate.url()),
    ),
    click(),
  ]);
  expect(response.status(), "status transition POST should succeed").toBe(200);
  await employerPage.reload();
}

/**
 * Drives the employer's discrete status-action buttons on an already-open
 * detail page (`page` must already be at
 * `/employer/applications/[applicationId]`). Ordinary transitions
 * (`reviewing`/`shortlisted`) submit directly via their own button;
 * terminal transitions (`accepted`/`rejected`) open
 * `StatusTransitionConfirmDialog` first and submit via its scoped confirm
 * button — `reason` is only meaningful for `rejected` and is filled inside
 * that dialog before confirming.
 */
export async function transitionApplicationStatusAsEmployer(
  employerPage: Page,
  targetStatus: string,
  reason?: string,
): Promise<void> {
  const label = employerApplicationActionLabel(
    targetStatus as ApplicationStatus,
  );

  if (!TERMINAL_TRANSITIONS.has(targetStatus)) {
    await submitEmployerStatusActionAndReload(employerPage, () =>
      employerPage.getByRole("button", { name: label }).click(),
    );
    await expectReviewStatusSettled(
      employerPage,
      targetStatus as ApplicationStatus,
    );
    return;
  }

  // Click the trigger first (its accessible name is the action-verb
  // label, e.g. "Accept" — not yet ambiguous, since the dialog doesn't
  // exist yet), then scope every subsequent lookup to the now-open
  // dialog. The dialog's own confirm-button copy is distinct from the
  // trigger's for "accepted" ("Accept application" vs. "Accept") and
  // happens to coincide for "rejected" (both "Reject application") — do
  // not assume the two labels match.
  await employerPage.getByRole("button", { name: label }).click();
  const dialogHeading =
    targetStatus === "accepted"
      ? "Accept this application?"
      : "Reject this application?";
  const confirmLabel =
    targetStatus === "accepted" ? "Accept application" : "Reject application";
  const dialog = employerPage.getByRole("alertdialog", {
    name: dialogHeading,
  });
  await expect(dialog).toBeVisible();
  if (reason !== undefined) {
    await dialog.getByLabel(/reason/i).fill(reason);
  }
  await submitEmployerStatusActionAndReload(employerPage, () =>
    dialog.getByRole("button", { name: confirmLabel }).click(),
  );
  await expectReviewStatusSettled(
    employerPage,
    targetStatus as ApplicationStatus,
  );
}
