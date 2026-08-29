import { expect, test, type Page, type Response } from "@playwright/test";

import { registerAndConfirm } from "./helpers/auth";
import {
  getLocalUserIdByEmail,
  provisionLocalVerificationOperator,
} from "./helpers/local-operator-proof";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

function waitForVacancyEditPost(page: Page): Promise<Response> {
  return page.waitForResponse(
    (candidate) =>
      candidate.url().includes("/edit") &&
      candidate.request().method() === "POST",
  );
}

async function saveVacancyEditFormAndReload(
  page: Page,
  buttonName: "Save draft" | "Save languages",
): Promise<void> {
  const [response] = await Promise.all([
    waitForVacancyEditPost(page),
    page.getByRole("button", { name: buttonName }).click(),
  ]);
  expect(response.status()).toBe(200);
  await page.reload();
}

test.describe("public jobs discovery journey", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("anonymous visitors see published employer vacancies and lose them on withdrawal", async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const employerDisplayName = `Public Jobs Emp ${stamp}`;
    const employerEmail = `public.jobs.employer.${stamp}@example.test`;
    const employerPassword = `TestPass-${stamp}!`;
    const title = `Evening clean ${stamp}`;

    // --- Employer: register, complete onboarding, ready a draft ---
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
    await page.getByLabel("Job category").selectOption("cleaning");
    await page.getByLabel("Berlin public locality").fill("Mitte");
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page).toHaveURL(/\/employer\/vacancies\/.+\/edit$/, {
      timeout: 15_000,
    });
    const vacancyId = page
      .url()
      .match(/\/employer\/vacancies\/([^/]+)\/edit/)?.[1];
    expect(vacancyId).toBeTruthy();

    await page
      .getByLabel("Description")
      .fill("Evening kitchen clean, 2 hours.");
    await page.getByLabel("Workplace type").selectOption("private_home");
    await page.getByLabel("Work frequency").selectOption("recurring");
    await page.getByRole("checkbox", { name: "CV required" }).check();
    await page
      .getByRole("checkbox", { name: "Interview can be in English" })
      .check();
    await page.getByRole("checkbox", { name: "Full time" }).check();
    await page.getByRole("checkbox", { name: "Evening" }).check();
    await page.getByLabel("Amount in EUR").fill("18.00");
    await page.getByLabel("Period").selectOption("hourly");
    await saveVacancyEditFormAndReload(page, "Save draft");

    await page.getByRole("button", { name: "Add language" }).click();
    await page.getByLabel(/Language 1/i).selectOption("en");
    await page.getByLabel(/Minimum proficiency 1/i).selectOption("basic");
    await saveVacancyEditFormAndReload(page, "Save languages");

    // --- Employer: request verification ---
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

    // --- Operator: separate session approves ---
    const employerId = await getLocalUserIdByEmail(employerEmail);
    const operatorContext = await browser.newContext();
    const operatorPage = await operatorContext.newPage();
    await registerAndConfirm(operatorPage, {
      email: `public.jobs.operator.${stamp}@example.test`,
      password: `TestPass-${stamp}!`,
      displayName: `Public Jobs Op ${stamp}`,
    });
    const operatorId = await getLocalUserIdByEmail(
      `public.jobs.operator.${stamp}@example.test`,
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

    // --- Employer: publish ---
    await page.goto(`/employer/vacancies/${vacancyId}`);
    const vacancyPath = `/employer/vacancies/${vacancyId}`;
    await page
      .getByRole("checkbox", {
        name: /Publishing may make this vacancy publicly visible/i,
      })
      .check();
    const [publishResponse] = await Promise.all([
      page.waitForResponse(
        (candidate) =>
          new URL(candidate.url()).pathname === vacancyPath &&
          candidate.request().method() === "POST",
      ),
      page.getByRole("button", { name: "Publish" }).click(),
    ]);
    expect(publishResponse.status()).toBeLessThan(400);
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Status" }).getByRole("status"),
    ).toHaveText("Published", { timeout: 15_000 });

    // --- Anonymous: open /jobs in a fresh unauthenticated context ---
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();
    await anonPage.goto("/jobs");
    await expect(
      anonPage.getByRole("heading", { name: title, level: 2 }),
    ).toBeVisible({ timeout: 15_000 });

    await anonPage
      .getByRole("link", { name: new RegExp(`View job: ${title}`) })
      .click();
    await expect(anonPage).toHaveURL(new RegExp(`/jobs/${vacancyId}$`));
    await expect(
      anonPage.getByText("Sign in to check your eligibility and apply."),
    ).toBeVisible();
    await expect(
      anonPage.getByRole("link", { name: "Sign in" }),
    ).toHaveAttribute("href", `/login?next=%2Fjobs%2F${vacancyId}`);

    // --- Employer: withdraw ---
    await page.goto(`/employer/vacancies/${vacancyId}`);
    await page
      .getByRole("checkbox", { name: /Withdrawing this vacancy is final/i })
      .check();
    await page.getByRole("button", { name: "Withdraw" }).click();
    await expect(page.getByText("Withdrawn", { exact: true })).toBeVisible({
      timeout: 15_000,
    });

    // --- Anonymous: confirm it disappears ---
    await anonPage.goto("/jobs");
    await expect(
      anonPage.getByRole("heading", { name: title, level: 2 }),
    ).toHaveCount(0);
    const detailResponse = await anonPage.goto(`/jobs/${vacancyId}`);
    expect(detailResponse?.status()).toBe(404);

    await anonContext.close();
  });
});
