import { expect, test, type Page, type Response } from "@playwright/test";

import { registerAndConfirm } from "./helpers/auth";
import {
  getLocalUserIdByEmail,
  provisionLocalVerificationOperator,
} from "./helpers/local-operator-proof";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

// D-M5-19 (M5.1 Unit A1) exit proof — the real end-to-end journey the
// diagnosed bugs made impossible: an employer completing every
// readiness-tracked field (including employment types / shift
// requirements, entered through the real form, never the raw-DB fixture
// escape hatch other specs use) can publish, and a compatible candidate
// can find and apply to the result. Interleaves the required negative
// proofs at the point each one is naturally observable.

async function registerAndOnboardPrivateEmployer(
  page: Page,
  stamp: number,
): Promise<{ email: string; displayName: string }> {
  const displayName = `A1 Employer ${stamp}`;
  const email = `a1.employer.${stamp}@example.test`;

  await registerAndConfirm(page, {
    email,
    password: `TestPass-${stamp}!`,
    displayName,
    registerPath: "/employer/register",
    expectedPath: /\/employer\/onboarding$/,
  });

  await page.getByRole("radio", { name: /Private person/i }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Berlin locality").fill("Mitte");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Complete onboarding" }).click();
  await expect(page).toHaveURL(/\/employer$/, { timeout: 15_000 });

  return { email, displayName };
}

function waitForVacancyEditPost(page: Page): Promise<Response> {
  return page.waitForResponse(
    (candidate) =>
      candidate.url().includes("/edit") &&
      candidate.request().method() === "POST",
  );
}

async function readinessRow(page: Page, label: string) {
  return page
    .getByLabel("Publication readiness")
    .getByText(label, { exact: true })
    .locator("..");
}

async function saveDraftAndReload(page: Page): Promise<void> {
  const [response] = await Promise.all([
    waitForVacancyEditPost(page),
    page.getByRole("button", { name: "Save draft" }).click(),
  ]);
  expect(response.status()).toBe(200);
  await page.reload();
}

async function saveLanguagesAndReload(page: Page): Promise<void> {
  const [response] = await Promise.all([
    waitForVacancyEditPost(page),
    page.getByRole("button", { name: "Save languages" }).click(),
  ]);
  expect(response.status()).toBe(200);
  await page.reload();
}

async function publishVacancyAndReload(page: Page): Promise<void> {
  const vacancyPath = new URL(page.url()).pathname;
  expect(vacancyPath).toMatch(/^\/employer\/vacancies\/[^/]+$/);

  await page
    .getByRole("checkbox", {
      name: /Publishing may make this vacancy publicly visible/i,
    })
    .check();
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) =>
        new URL(candidate.url()).pathname === vacancyPath &&
        candidate.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Publish" }).click(),
  ]);
  expect(response.status()).toBeLessThan(400);
  await page.reload();

  const statusRegion = page.getByRole("region", { name: "Status" });
  await expect(statusRegion.getByRole("status")).toHaveText("Published", {
    timeout: 15_000,
  });
  await expect(
    statusRegion.getByText(
      "This vacancy is currently visible to eligible candidates.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish" })).toHaveCount(0);
}

async function expectReadyDraftFieldsPersisted(page: Page): Promise<void> {
  await expect(page.getByLabel("Description")).toHaveValue(
    "Cleaning role, small office.",
  );
  await expect(page.getByLabel("Workplace type")).toHaveValue("office");
  await expect(page.getByLabel("Work frequency")).toHaveValue("recurring");
  await expect(
    page.getByRole("checkbox", { name: "CV required" }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Interview can be in English" }),
  ).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Full time" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Morning" })).toBeChecked();
  await expect(page.getByLabel("Amount in EUR")).toHaveValue("16.00");
  await expect(page.getByLabel("Period")).toHaveValue("hourly");
}

async function expectBasicEnglishRequirementPersisted(
  page: Page,
): Promise<void> {
  await expect(page.getByLabel(/Language 1/i)).toHaveValue("en");
  await expect(page.getByLabel(/Minimum proficiency 1/i)).toHaveValue("basic");
}

test.describe("publication readiness and matching integrity (D-M5-19)", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("employer completes readiness through the real form, publishes, and a compatible candidate matches and applies — with the required negative proofs along the way", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const { email: employerEmail, displayName: employerDisplayName } =
      await registerAndOnboardPrivateEmployer(page, stamp);

    await page.goto("/employer/vacancies/new");
    await page.getByLabel("Title").fill(`A1 Cleaning Role ${stamp}`);
    await page.getByLabel("Job category").selectOption("cleaning");
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

    // --- Negative proof: readiness truthfully reports what publish will
    // actually require, before anything beyond the minimum is filled.
    await expect(
      page.getByText(
        /still needed before publishing\.|missing before publishing\./,
      ),
    ).toBeVisible({
      timeout: 15_000,
    });
    const workplaceTypeRow = page
      .getByLabel("Publication readiness")
      .getByText("Workplace type", { exact: true })
      .locator("..");
    await expect(workplaceTypeRow).toHaveAttribute("data-complete", "false");

    // Complete every remaining vacancy-level field, including the two new
    // checkbox groups this unit adds — through the real form, not a fixture.
    await page.getByLabel("Description").fill("Cleaning role, small office.");
    await page.getByLabel("Workplace type").selectOption("office");
    await page.getByLabel("Work frequency").selectOption("recurring");
    await page.getByRole("checkbox", { name: "CV required" }).check();
    await page
      .getByRole("checkbox", { name: "Interview can be in English" })
      .check();
    await page.getByRole("checkbox", { name: "Full time" }).check();
    await page.getByRole("checkbox", { name: "Morning" }).check();
    await page.getByLabel("Amount in EUR").fill("16.00");
    await page.getByLabel("Period").selectOption("hourly");
    await saveDraftAndReload(page);
    await expectReadyDraftFieldsPersisted(page);

    // --- Negative proof, inverted: readiness reflects the durably saved
    // draft fields. workplace_type is now correctly "Complete".
    await expect(await readinessRow(page, "Workplace type")).toHaveAttribute(
      "data-complete",
      "true",
    );

    await page.getByRole("button", { name: "Add language" }).click();
    await page.getByLabel(/Language 1/i).selectOption("en");
    await page.getByLabel(/Minimum proficiency 1/i).selectOption("basic");
    await saveLanguagesAndReload(page);
    await expectBasicEnglishRequirementPersisted(page);

    // Still not ready: employer is not yet verified. Readiness must not
    // claim otherwise merely because every vacancy field is complete.
    await expect(
      page.getByText("Employer verification still needed before publishing."),
    ).toBeVisible({
      timeout: 15_000,
    });
    const verificationRow = page
      .getByText("Employer verification", { exact: true })
      .locator("..");
    await expect(verificationRow).toHaveAttribute("data-complete", "false");

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
      email: `a1.operator.${stamp}@example.test`,
      password: `TestPass-${stamp}!`,
      displayName: `A1 Operator ${stamp}`,
    });
    const operatorId = await getLocalUserIdByEmail(
      `a1.operator.${stamp}@example.test`,
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
    await expect(
      page.getByText("Ready to publish.", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await publishVacancyAndReload(page);

    // --- Candidate side: onboard with genuinely compatible requirements,
    // reach Matches, open the job, and apply — the exact chain the
    // diagnosed empty-array bug made permanently impossible.
    const candidateContext = await page.context().browser()?.newContext();
    if (candidateContext === undefined) {
      throw new Error("could not open a candidate browser context");
    }
    const candidatePage = await candidateContext.newPage();
    const candidateDisplayName = `A1 Match Candidate ${stamp}`;
    await registerAndConfirm(candidatePage, {
      email: `a1.candidate.match.${stamp}@example.test`,
      password: `TestPass-${stamp}!`,
      displayName: candidateDisplayName,
    });

    await candidatePage
      .getByRole("link", { name: "Continue onboarding" })
      .click();
    await expect(candidatePage).toHaveURL(/group=languages/);
    await candidatePage
      .getByRole("radio", {
        name: /I can understand and use some basic German/i,
      })
      .check();
    await candidatePage
      .getByLabel("Language 1", { exact: true })
      .selectOption("en");
    await candidatePage
      .getByLabel("Proficiency 1", { exact: true })
      .selectOption("basic");
    await candidatePage
      .getByRole("button", { name: "Save and continue" })
      .click();
    await expect(candidatePage).toHaveURL(/group=work_authorisation/, {
      timeout: 15_000,
    });

    await candidatePage.getByRole("radio", { name: "Yes" }).check();
    await candidatePage
      .getByRole("button", { name: "Save and continue" })
      .click();
    await expect(candidatePage).toHaveURL(/group=location/);

    await candidatePage
      .getByRole("radio", { name: /Up to 45 minutes one way/i })
      .check();
    await candidatePage
      .getByRole("button", { name: "Save and continue" })
      .click();
    await expect(candidatePage).toHaveURL(/group=categories/);

    await candidatePage.getByRole("checkbox", { name: "Cleaning" }).check();
    await candidatePage
      .getByRole("button", { name: "Save and continue" })
      .click();
    await expect(candidatePage).toHaveURL(/group=availability/);

    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() + 3);
    await candidatePage
      .getByLabel("Earliest date you can start")
      .fill(startDate.toISOString().slice(0, 10));
    await candidatePage
      .getByRole("button", { name: "Save and continue" })
      .click();
    await expect(candidatePage).toHaveURL(/group=employment/, {
      timeout: 15_000,
    });

    await candidatePage.getByRole("checkbox", { name: "Full time" }).check();
    await candidatePage.getByRole("checkbox", { name: "Morning" }).check();
    await candidatePage
      .getByRole("button", { name: "Save and review" })
      .click();
    await expect(candidatePage).toHaveURL(/group=review/);

    await candidatePage
      .getByRole("button", { name: "Complete profile" })
      .click();
    await expect(candidatePage).toHaveURL(/\/candidate\/matches$/, {
      timeout: 15_000,
    });

    await expect(
      candidatePage.getByRole("heading", { name: `A1 Cleaning Role ${stamp}` }),
    ).toBeVisible({ timeout: 15_000 });

    await candidatePage.goto(`/candidate/jobs/${vacancyId}`);
    await candidatePage
      .getByRole("button", { name: "Preview application" })
      .click();
    await expect(
      candidatePage.getByRole("heading", {
        name: "Review before submitting",
      }),
    ).toBeVisible();
    await candidatePage
      .getByRole("button", { name: "Submit application" })
      .click();
    await expect(candidatePage).toHaveURL(
      /\/candidate\/applications\/[0-9a-f-]{36}$/,
      { timeout: 15_000 },
    );

    await candidateContext.close();
  });

  test("a candidate with incompatible employment type and shift does not see the published vacancy in Matches", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now() + 1;
    const { email: employerEmail, displayName: employerDisplayName } =
      await registerAndOnboardPrivateEmployer(page, stamp);

    await page.goto("/employer/vacancies/new");
    await page.getByLabel("Title").fill(`A1 No-Match Role ${stamp}`);
    await page.getByLabel("Job category").selectOption("cleaning");
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

    await page.getByLabel("Description").fill("Cleaning role, small office.");
    await page.getByLabel("Workplace type").selectOption("office");
    await page.getByLabel("Work frequency").selectOption("recurring");
    await page.getByRole("checkbox", { name: "CV required" }).check();
    await page
      .getByRole("checkbox", { name: "Interview can be in English" })
      .check();
    // Full time / morning only — a part-time/evening candidate cannot match.
    await page.getByRole("checkbox", { name: "Full time" }).check();
    await page.getByRole("checkbox", { name: "Morning" }).check();
    await page.getByLabel("Amount in EUR").fill("16.00");
    await page.getByLabel("Period").selectOption("hourly");
    await saveDraftAndReload(page);
    await expectReadyDraftFieldsPersisted(page);

    await page.getByRole("button", { name: "Add language" }).click();
    await page.getByLabel(/Language 1/i).selectOption("en");
    await page.getByLabel(/Minimum proficiency 1/i).selectOption("basic");
    await saveLanguagesAndReload(page);
    await expectBasicEnglishRequirementPersisted(page);

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
      email: `a1.operator2.${stamp}@example.test`,
      password: `TestPass-${stamp}!`,
      displayName: `A1 Operator2 ${stamp}`,
    });
    const operatorId = await getLocalUserIdByEmail(
      `a1.operator2.${stamp}@example.test`,
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
    await publishVacancyAndReload(page);

    const candidateContext = await page.context().browser()?.newContext();
    if (candidateContext === undefined) {
      throw new Error("could not open a candidate browser context");
    }
    const candidatePage = await candidateContext.newPage();
    await registerAndConfirm(candidatePage, {
      email: `a1.candidate.nomatch.${stamp}@example.test`,
      password: `TestPass-${stamp}!`,
      displayName: `A1 No-Match Candidate ${stamp}`,
    });

    await candidatePage
      .getByRole("link", { name: "Continue onboarding" })
      .click();
    await expect(candidatePage).toHaveURL(/group=languages/);
    await candidatePage
      .getByRole("radio", {
        name: /I can understand and use some basic German/i,
      })
      .check();
    await candidatePage
      .getByLabel("Language 1", { exact: true })
      .selectOption("en");
    await candidatePage
      .getByLabel("Proficiency 1", { exact: true })
      .selectOption("basic");
    await candidatePage
      .getByRole("button", { name: "Save and continue" })
      .click();
    await expect(candidatePage).toHaveURL(/group=work_authorisation/, {
      timeout: 15_000,
    });

    await candidatePage.getByRole("radio", { name: "Yes" }).check();
    await candidatePage
      .getByRole("button", { name: "Save and continue" })
      .click();
    await expect(candidatePage).toHaveURL(/group=location/);

    await candidatePage
      .getByRole("radio", { name: /Up to 45 minutes one way/i })
      .check();
    await candidatePage
      .getByRole("button", { name: "Save and continue" })
      .click();
    await expect(candidatePage).toHaveURL(/group=categories/);

    await candidatePage.getByRole("checkbox", { name: "Cleaning" }).check();
    await candidatePage
      .getByRole("button", { name: "Save and continue" })
      .click();
    await expect(candidatePage).toHaveURL(/group=availability/);

    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() + 3);
    await candidatePage
      .getByLabel("Earliest date you can start")
      .fill(startDate.toISOString().slice(0, 10));
    await candidatePage
      .getByRole("button", { name: "Save and continue" })
      .click();
    await expect(candidatePage).toHaveURL(/group=employment/, {
      timeout: 15_000,
    });

    // Deliberately incompatible: part-time / evening only.
    await candidatePage.getByRole("checkbox", { name: "Part time" }).check();
    await candidatePage.getByRole("checkbox", { name: "Evening" }).check();
    await candidatePage
      .getByRole("button", { name: "Save and review" })
      .click();
    await expect(candidatePage).toHaveURL(/group=review/);

    await candidatePage
      .getByRole("button", { name: "Complete profile" })
      .click();
    await expect(candidatePage).toHaveURL(/\/candidate\/matches$/, {
      timeout: 15_000,
    });

    await expect(
      candidatePage.getByRole("heading", {
        name: `A1 No-Match Role ${stamp}`,
      }),
    ).not.toBeVisible();

    await candidateContext.close();
  });
});
