import { expect, test } from "@playwright/test";

import { registerAndConfirm } from "./helpers/auth";
import {
  getLocalUserIdByEmail,
  provisionLocalVerificationOperator,
} from "./helpers/local-operator-proof";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

test.describe("employer vacancy lifecycle journey", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("verified employer publishes, pauses, resumes, and withdraws a vacancy", async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const employerDisplayName = `Lifecycle Emp ${stamp}`;
    const employerEmail = `lifecycle.employer.${stamp}@example.test`;
    const employerPassword = `TestPass-${stamp}!`;
    const title = `Evening clean ${stamp}`;

    // --- Employer: register, complete onboarding, create a fully readied draft ---
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
    await page.getByLabel("Amount in EUR").fill("18.00");
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

    await page.reload();
    await expect(
      page
        .getByLabel("Publication readiness")
        .getByText("Ready for a future publication step", { exact: true }),
    ).toBeVisible();

    // --- Employer: request verification ---
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

    // --- Operator: separate session approves the pending request ---
    const operatorContext = await browser.newContext();
    const operatorPage = await operatorContext.newPage();
    await registerAndConfirm(operatorPage, {
      email: `lifecycle.operator.${stamp}@example.test`,
      password: `TestPass-${stamp}!`,
      displayName: `Lifecycle Op ${stamp}`,
    });
    const operatorId = await getLocalUserIdByEmail(
      `lifecycle.operator.${stamp}@example.test`,
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

    // --- Employer: manage page now offers Publish ---
    // The Publish form's own inline success message is not reliably
    // observable: revalidatePath() causes the manage page to refetch and
    // re-render into the published-state action set (Pause/Fill/Withdraw)
    // as part of the same transition, unmounting the Publish form. Assert
    // on the resulting state instead of the transient message.
    await page.goto(`/employer/vacancies/${vacancyId}`);
    await page
      .getByRole("checkbox", {
        name: /Publishing may make this vacancy publicly visible/i,
      })
      .check();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Published", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByText("Published", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish" })).toHaveCount(0);

    // --- Pause ---
    await page
      .getByRole("checkbox", {
        name: /Pausing stops this vacancy from being publicly visible/i,
      })
      .check();
    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByRole("button", { name: "Resume" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Paused", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Edit vacancy" }),
    ).toBeVisible();

    // --- Resume ---
    await page
      .getByRole("checkbox", {
        name: /Resuming checks readiness and verification again/i,
      })
      .check();
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Published", { exact: true })).toBeVisible();

    // --- Withdraw (terminal) ---
    await page
      .getByRole("checkbox", {
        name: /Withdrawing this vacancy is final/i,
      })
      .check();
    await page.getByRole("button", { name: "Withdraw" }).click();
    await expect(page.getByText("Withdrawn", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Mark filled" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("link", { name: "Edit vacancy" })).toHaveCount(
      0,
    );

    await page.reload();
    await expect(page.getByText("Withdrawn", { exact: true })).toBeVisible();
  });
});
