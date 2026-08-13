import { expect, test } from "@playwright/test";

import { registerAndConfirm } from "./helpers/auth";
import {
  getLocalUserIdByEmail,
  provisionLocalVerificationOperator,
} from "./helpers/local-operator-proof";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

async function completePrivateEmployer(
  page: Parameters<typeof registerAndConfirm>[0],
  stamp: number,
) {
  const email = `vacancy.private.${stamp}@example.test`;
  const password = `TestPass-${stamp}!`;

  await registerAndConfirm(page, {
    email,
    password,
    displayName: `Vacancy Private ${stamp}`,
    registerPath: "/employer/register",
    expectedPath: /\/employer\/onboarding$/,
  });

  await page.getByRole("radio", { name: /Private person/i }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Display name").fill(`Vacancy Private ${stamp}`);
  await page.getByLabel("Berlin locality").fill("Mitte");
  await page
    .getByRole("checkbox", { name: /allowed to work in Germany/i })
    .check();
  await page.getByRole("button", { name: "Complete onboarding" }).click();
  await expect(page).toHaveURL(/\/employer$/, { timeout: 15_000 });
}

async function completeOrganisationEmployer(
  page: Parameters<typeof registerAndConfirm>[0],
  stamp: number,
) {
  const email = `vacancy.org.${stamp}@example.test`;
  const password = `TestPass-${stamp}!`;
  const slug = `vacancy-org-${stamp}`;

  await registerAndConfirm(page, {
    email,
    password,
    displayName: `Vacancy Org ${stamp}`,
    registerPath: "/employer/register",
    expectedPath: /\/employer\/onboarding$/,
  });

  await page.getByRole("radio", { name: /Organisation/i }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Contact display name").fill(`Vacancy Org ${stamp}`);
  await page
    .getByLabel("Organisation legal name")
    .fill(`Vacancy Org GmbH ${stamp}`);
  await page.getByLabel("Berlin locality").fill("Kreuzberg");
  await page.getByLabel("Company display name").fill(`Vacancy Co ${stamp}`);
  await page.getByLabel("Company slug").fill(slug);
  await page
    .getByRole("checkbox", { name: /allowed to work in Germany/i })
    .check();
  await page.getByRole("button", { name: "Complete onboarding" }).click();
  await expect(page).toHaveURL(/\/employer$/, { timeout: 15_000 });
}

test.describe("employer vacancy draft journeys", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("private employer creates, edits, reaches readiness, deletes draft", async ({
    page,
    browser,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const title = `Morning clean ${stamp}`;
    const employerDisplayName = `Vacancy Private ${stamp}`;

    await completePrivateEmployer(page, stamp);

    await page
      .getByLabel("Employer")
      .getByRole("link", { name: "Vacancies" })
      .click();
    await expect(page).toHaveURL(/\/employer\/vacancies$/);
    await expect(page.getByText(/no vacancies yet/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /publish/i })).toHaveCount(0);

    await page.getByRole("link", { name: "Create draft" }).click();
    await expect(page).toHaveURL(/\/employer\/vacancies\/new$/);
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Job category").selectOption("cleaning");
    await page.getByLabel("Berlin public locality").fill("Mitte");
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page).toHaveURL(/\/employer\/vacancies\/.+\/edit$/, {
      timeout: 15_000,
    });

    await page.reload();
    await expect(page.getByLabel("Title")).toHaveValue(title);
    await expect(page.getByLabel("Berlin public locality")).toHaveValue(
      "Mitte",
    );

    await page
      .getByLabel("Description")
      .fill("Wash kitchen floors before noon.");
    await page.getByLabel("Workplace type").selectOption("office");
    await page.getByLabel("Work frequency").selectOption("recurring");
    await page.getByRole("checkbox", { name: "Full time" }).check();
    await page.getByRole("checkbox", { name: "Morning" }).check();
    await page.getByLabel("Amount in EUR").fill("15.50");
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

    // D-M5-19: employer verification is a genuine readiness requirement —
    // employer_vacancy_draft_readiness and publish_employer_vacancy both
    // require verification_state = 'verified'. Request and approve it
    // through the real workflow (same pattern as
    // internal-verification-journey.spec.ts) so this test legitimately
    // reaches "Ready for a future publication step", rather than asserting
    // a readiness state the product correctly does not allow.
    const draftUrl = page.url();

    await page
      .getByRole("navigation", { name: "Employer" })
      .getByRole("link", { name: "Verification", exact: true })
      .click();
    await page
      .getByRole("checkbox", {
        name: /I confirm that the information in my employer profile/i,
      })
      .check();
    await page.getByRole("button", { name: "Request verification" }).click();
    await expect(
      page.getByRole("heading", { name: /Pending review/i }),
    ).toBeVisible({ timeout: 15_000 });

    const operatorContext = await browser.newContext();
    const operatorPage = await operatorContext.newPage();
    const operatorEmail = `vacancy.operator.${stamp}@example.test`;
    await registerAndConfirm(operatorPage, {
      email: operatorEmail,
      password: `TestPass-${stamp}!`,
      displayName: `Vacancy Operator ${stamp}`,
    });
    const operatorId = await getLocalUserIdByEmail(operatorEmail);
    await provisionLocalVerificationOperator(operatorId);

    await operatorPage.goto("/internal/verification");
    await operatorPage
      .getByRole("link", {
        name: new RegExp(`Review.*${employerDisplayName}`, "i"),
      })
      .click();
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

    await page.goto(draftUrl);
    await expect(
      page
        .getByLabel("Publication readiness")
        .getByText("Ready for a future publication step", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /publish/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /publish/i })).toHaveCount(0);

    await page
      .getByLabel("Employer")
      .getByRole("link", { name: "Vacancies" })
      .click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    await page.getByRole("link", { name: "Manage" }).click();
    await page.getByLabel("Type the draft title to confirm").fill(title);
    await page
      .getByRole("button", { name: "Delete draft permanently" })
      .click();
    await expect(page).toHaveURL(/\/employer\/vacancies$/, { timeout: 15_000 });
    await expect(page.getByText(/no vacancies yet/i)).toBeVisible();
  });

  test("organisation employer draft shows derived company and no selector", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const title = `Org warehouse ${stamp}`;

    await completeOrganisationEmployer(page, stamp);
    await page.getByRole("link", { name: "Create draft" }).click();
    await expect(
      page.getByText(/Organisation company: Vacancy Co/i),
    ).toBeVisible();
    await expect(page.getByLabel(/company/i)).toHaveCount(0);

    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Job category").selectOption("warehousing");
    await page.getByLabel("Berlin public locality").fill("Wedding");
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page).toHaveURL(/\/employer\/vacancies\/.+\/edit$/, {
      timeout: 15_000,
    });
    await expect(
      page.getByText(/Organisation company: Vacancy Co/i),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /publish/i })).toHaveCount(0);
  });

  test("foreign employer receives generic unavailable draft page", async ({
    browser,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();

    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await completePrivateEmployer(ownerPage, stamp);
    await ownerPage.goto("/employer/vacancies/new");
    await ownerPage.getByLabel("Title").fill(`Hidden draft ${stamp}`);
    await ownerPage.getByLabel("Job category").selectOption("cleaning");
    await ownerPage.getByLabel("Berlin public locality").fill("Mitte");
    await ownerPage.getByRole("button", { name: "Create draft" }).click();
    await expect(ownerPage).toHaveURL(/\/employer\/vacancies\/.+\/edit$/, {
      timeout: 15_000,
    });
    const draftUrl = ownerPage.url();
    const draftId = draftUrl.match(/\/employer\/vacancies\/([^/]+)\/edit/)?.[1];
    expect(draftId).toBeTruthy();
    await ownerContext.close();

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await completePrivateEmployer(otherPage, stamp + 1);
    await otherPage.goto(`/employer/vacancies/${draftId}`);
    await expect(
      otherPage.getByRole("heading", { name: /unavailable/i }),
    ).toBeVisible();
    await expect(otherPage.getByText(/Hidden draft/i)).toHaveCount(0);
    await otherPage.goto(`/employer/vacancies/${draftId}/edit`);
    await expect(
      otherPage.getByRole("heading", { name: /unavailable/i }),
    ).toBeVisible();
    await otherContext.close();
  });

  test("incomplete employer cannot access vacancy routes", async ({ page }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();

    await registerAndConfirm(page, {
      email: `vacancy.incomplete.${stamp}@example.test`,
      password: `TestPass-${stamp}!`,
      displayName: `Incomplete ${stamp}`,
      registerPath: "/employer/register",
      expectedPath: /\/employer\/onboarding$/,
    });

    await page.goto("/employer/vacancies");
    await expect(page).toHaveURL(/\/employer\/onboarding$/);
    await page.goto("/employer/vacancies/new");
    await expect(page).toHaveURL(/\/employer\/onboarding$/);
  });
});
