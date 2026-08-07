import { expect, test, type Page } from "@playwright/test";

import { registerAndConfirm } from "./helpers/auth";
import {
  revokeLocalEmployerVerification,
  seedVacancyMatchingArrays,
} from "./helpers/employer-application-fixture";
import {
  getLocalUserIdByEmail,
  provisionLocalVerificationOperator,
} from "./helpers/local-operator-proof";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

type PublishedVacancy = {
  vacancyId: string;
  employerId: string;
  employerEmail: string;
  employerPassword: string;
  employerDisplayName: string;
};

/**
 * Registers a private employer, creates a fully-readied draft, verifies it
 * (via a separate operator context), and publishes it. The employer vacancy
 * create/edit UI has no employment-type/shift field (an intentional PR 6.2
 * boundary), so `seedVacancyMatchingArrays` sets both directly — the only
 * way a candidate can ever become eligible for an employer-owned vacancy
 * today. `page` ends the helper signed in as the employer, on the manage
 * page for the now-published vacancy.
 */
async function publishEligibleEmployerVacancy(
  page: Page,
  stamp: number,
): Promise<PublishedVacancy> {
  const employerDisplayName = `Review Emp ${stamp}`;
  const employerEmail = `review.employer.${stamp}@example.test`;
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
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft changes saved.")).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("button", { name: "Add language" }).click();
  await page.getByLabel(/Language 1/i).selectOption("en");
  await page.getByLabel(/Minimum proficiency 1/i).selectOption("basic");
  await page.getByRole("button", { name: "Save languages" }).click();
  await expect(page.getByText("Language requirements saved.")).toBeVisible({
    timeout: 15_000,
  });

  await seedVacancyMatchingArrays(vacancyId, ["part_time"], ["morning"]);

  await page.goto("/employer/verification");
  await page
    .getByRole("checkbox", {
      name: /I confirm that the information in my employer profile/i,
    })
    .check();
  await page.getByRole("button", { name: "Request verification" }).click();
  await expect(
    page.getByRole("heading", { name: /Pending review/i }),
  ).toBeVisible({ timeout: 15_000 });

  const employerId = await getLocalUserIdByEmail(employerEmail);

  const operatorContext = await page.context().browser()?.newContext();
  if (operatorContext === undefined) {
    throw new Error("could not open an operator browser context");
  }
  const operatorPage = await operatorContext.newPage();
  await registerAndConfirm(operatorPage, {
    email: `review.operator.${stamp}@example.test`,
    password: `TestPass-${stamp}!`,
    displayName: `Review Op ${stamp}`,
  });
  const operatorId = await getLocalUserIdByEmail(
    `review.operator.${stamp}@example.test`,
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
  await page
    .getByRole("checkbox", {
      name: /Publishing may make this vacancy publicly visible/i,
    })
    .check();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published", { exact: true })).toBeVisible({
    timeout: 15_000,
  });

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
 * eligible for `publishEligibleEmployerVacancy`'s output (category
 * "hospitality", german "none" required / candidate "basic" declared,
 * employment "part_time", shift "morning", no fixed vacancy start date),
 * then submits an application to the given vacancy.
 */
async function registerAndApplyAsCandidate(
  page: Page,
  stamp: number,
  vacancyId: string,
): Promise<{ candidateDisplayName: string }> {
  const candidateDisplayName = `Review Candidate ${stamp}`;
  const candidateEmail = `review.candidate.${stamp}@example.test`;
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
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page).toHaveURL(/\/candidate\/applications\/[0-9a-f-]{36}$/, {
    timeout: 15_000,
  });

  return { candidateDisplayName };
}

test.describe("employer applicant review journey", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("employer reviews an applicant end to end: submitted → reviewing → shortlisted → accepted, with visible history", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();

    const vacancy = await publishEligibleEmployerVacancy(page, stamp);

    const candidateContext = await page.context().browser()?.newContext();
    if (candidateContext === undefined) {
      throw new Error("could not open a candidate browser context");
    }
    const candidatePage = await candidateContext.newPage();
    const { candidateDisplayName } = await registerAndApplyAsCandidate(
      candidatePage,
      stamp,
      vacancy.vacancyId,
    );
    await candidateContext.close();

    await page.goto("/employer/applications");
    await expect(
      page.getByRole("heading", { level: 1, name: "Applications" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: candidateDisplayName }),
    ).toBeVisible();
    await expect(page.getByText("Status: Submitted")).toBeVisible();

    await page.getByRole("link", { name: "Review" }).click();
    await expect(page).toHaveURL(/\/employer\/applications\/[0-9a-f-]{36}$/, {
      timeout: 15_000,
    });
    await expect(
      page.getByRole("heading", { level: 1, name: candidateDisplayName }),
    ).toBeVisible();
    await expect(page.getByText("Declared")).toBeVisible();
    await expect(
      page.getByText(/legally authorized|visa verified|work permit confirmed/i),
    ).toHaveCount(0);

    // submitted -> reviewing. The transition form is remounted (keyed by
    // current status) as soon as revalidatePath refetches the page, the
    // same way the vacancy-lifecycle actions unmount their own inline
    // success message — so this asserts on the resulting state, not the
    // transient "Status updated to…" banner.
    await page.getByLabel("New status").selectOption("reviewing");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.getByText("Current status: In review")).toBeVisible({
      timeout: 15_000,
    });

    // reviewing -> shortlisted
    await page.getByLabel("New status").selectOption("shortlisted");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.getByText("Current status: Shortlisted")).toBeVisible({
      timeout: 15_000,
    });

    // shortlisted -> accepted (terminal)
    await page.getByLabel("New status").selectOption("accepted");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.getByText("Current status: Accepted")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/status is final/i)).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveCount(0);

    // Full history is visible, initial event renders as "Submitted" (not
    // "null → submitted"), and never shows actor identity.
    const historyRegion = page.getByRole("region", { name: "Status history" });
    await expect(
      historyRegion.getByText("Submitted", { exact: true }),
    ).toBeVisible();
    await expect(
      historyRegion.getByText("Submitted → In review"),
    ).toBeVisible();
    await expect(
      historyRegion.getByText("In review → Shortlisted"),
    ).toBeVisible();
    await expect(
      historyRegion.getByText("Shortlisted → Accepted"),
    ).toBeVisible();
    await expect(page.getByText(/actor/i)).toHaveCount(0);

    await page.reload();
    await expect(page.getByText("Current status: Accepted")).toBeVisible();
    await expect(page.getByText(/status is final/i)).toBeVisible();
  });

  test("employer rejects an applicant with a reason, visible in status history", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now() + 1;

    const vacancy = await publishEligibleEmployerVacancy(page, stamp);

    const candidateContext = await page.context().browser()?.newContext();
    if (candidateContext === undefined) {
      throw new Error("could not open a candidate browser context");
    }
    const candidatePage = await candidateContext.newPage();
    await registerAndApplyAsCandidate(candidatePage, stamp, vacancy.vacancyId);
    await candidateContext.close();

    await page.goto("/employer/applications");
    await page.getByRole("link", { name: "Review" }).click();
    await expect(page).toHaveURL(/\/employer\/applications\/[0-9a-f-]{36}$/, {
      timeout: 15_000,
    });

    await page.getByLabel("New status").selectOption("rejected");
    await expect(page.getByLabel(/reason/i)).toBeVisible();
    await page.getByLabel(/reason/i).fill("Role filled internally.");
    await page.getByRole("button", { name: "Update status" }).click();

    await expect(page.getByText("Current status: Rejected")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText("Reason: Role filled internally."),
    ).toBeVisible();
    await expect(page.getByText(/status is final/i)).toBeVisible();

    await page.reload();
    await expect(page.getByText("Current status: Rejected")).toBeVisible();
    await expect(
      page.getByText("Reason: Role filled internally."),
    ).toBeVisible();
  });

  test("a second employer cannot view or act on another employer's application", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now() + 2;

    const vacancy = await publishEligibleEmployerVacancy(page, stamp);

    const candidateContext = await page.context().browser()?.newContext();
    if (candidateContext === undefined) {
      throw new Error("could not open a candidate browser context");
    }
    const candidatePage = await candidateContext.newPage();
    await registerAndApplyAsCandidate(candidatePage, stamp, vacancy.vacancyId);
    await candidateContext.close();

    await page.goto("/employer/applications");
    await page.getByRole("link", { name: "Review" }).click();
    await expect(page).toHaveURL(/\/employer\/applications\/[0-9a-f-]{36}$/, {
      timeout: 15_000,
    });
    const applicationUrl = page.url();

    const otherContext = await page.context().browser()?.newContext();
    if (otherContext === undefined) {
      throw new Error("could not open a second employer browser context");
    }
    const otherPage = await otherContext.newPage();
    await publishEligibleEmployerVacancy(otherPage, stamp + 1000);

    // The second employer's applications list never shows the first
    // employer's applicant.
    await otherPage.goto("/employer/applications");
    await expect(
      otherPage.getByText("Review Candidate", { exact: false }),
    ).toHaveCount(0);

    // A deep link to the first employer's application collapses to the
    // identical unavailable state — no cross-employer existence oracle.
    await otherPage.goto(applicationUrl);
    await expect(
      otherPage.getByRole("heading", {
        level: 1,
        name: "Application unavailable",
      }),
    ).toBeVisible();
    await otherContext.close();
  });

  test("a revoked-verification employer can still list and review applications", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now() + 3;

    const vacancy = await publishEligibleEmployerVacancy(page, stamp);

    const candidateContext = await page.context().browser()?.newContext();
    if (candidateContext === undefined) {
      throw new Error("could not open a candidate browser context");
    }
    const candidatePage = await candidateContext.newPage();
    await registerAndApplyAsCandidate(candidatePage, stamp, vacancy.vacancyId);
    await candidateContext.close();

    await revokeLocalEmployerVerification(vacancy.employerId);

    await page.goto("/employer/applications");
    await expect(
      page.getByRole("heading", { level: 1, name: "Applications" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Review" })).toBeVisible();

    await page.getByRole("link", { name: "Review" }).click();
    await expect(page).toHaveURL(/\/employer\/applications\/[0-9a-f-]{36}$/, {
      timeout: 15_000,
    });
    await page.getByLabel("New status").selectOption("reviewing");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.getByText("Current status: In review")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("a stale transition attempt refreshes safely without a false success", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now() + 4;

    const vacancy = await publishEligibleEmployerVacancy(page, stamp);

    const candidateContext = await page.context().browser()?.newContext();
    if (candidateContext === undefined) {
      throw new Error("could not open a candidate browser context");
    }
    const candidatePage = await candidateContext.newPage();
    await registerAndApplyAsCandidate(candidatePage, stamp, vacancy.vacancyId);
    await candidateContext.close();

    await page.goto("/employer/applications");
    await page.getByRole("link", { name: "Review" }).click();
    await expect(page).toHaveURL(/\/employer\/applications\/[0-9a-f-]{36}$/, {
      timeout: 15_000,
    });
    const applicationUrl = page.url();

    // A second tab (same employer session) moves the application straight
    // to "accepted" — terminal, so the first tab's still-loaded "submitted"
    // view is now stale.
    const secondTab = await page.context().newPage();
    await secondTab.goto(applicationUrl);
    await secondTab.getByLabel("New status").selectOption("accepted");
    await secondTab.getByRole("button", { name: "Update status" }).click();
    await expect(secondTab.getByText("Current status: Accepted")).toBeVisible({
      timeout: 15_000,
    });
    await secondTab.close();

    // The first tab still shows the stale "submitted" form (no auto-poll).
    // Submitting it must never claim false success: the transition RPC
    // re-reads the live row and returns invalid_transition (the terminal
    // "accepted" status has no allowed targets), and the same
    // revalidatePath-triggered refresh that clears a real success message
    // elsewhere in this suite also replaces this stale form with the true
    // canonical (terminal, no-form) state — never a false "In review".
    await page.getByLabel("New status").selectOption("reviewing");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.getByText("Current status: Accepted")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/status is final/i)).toBeVisible();
    await expect(page.getByText("Current status: In review")).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(0);

    // A reload reflects the same true canonical state.
    await page.reload();
    await expect(page.getByText("Current status: Accepted")).toBeVisible();
    await expect(page.getByText(/status is final/i)).toBeVisible();
  });
});
