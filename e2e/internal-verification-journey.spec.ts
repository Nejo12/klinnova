import { expect, test } from "@playwright/test";

import { registerAndConfirm } from "./helpers/auth";
import {
  getLocalUserIdByEmail,
  provisionLocalVerificationOperator,
} from "./helpers/local-operator-proof";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

test.describe("internal verification operator journey", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("active operator approves a pending employer verification request", async ({
    page,
    browser,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const employerDisplayName = `Internal Emp ${stamp}`;
    const employerEmail = `internal.employer.${stamp}@example.test`;
    const employerPassword = `TestPass-${stamp}!`;

    await registerAndConfirm(page, {
      email: employerEmail,
      password: employerPassword,
      displayName: employerDisplayName,
      registerPath: "/employer/register",
      expectedPath: /\/employer\/onboarding$/,
    });

    await page.getByRole("radio", { name: /Private person/i }).check();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByRole("heading", { name: /Private employer/i }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByLabel("Display name").fill(employerDisplayName);
    await page.getByLabel("Berlin locality").fill("Mitte");
    await page
      .getByRole("checkbox", { name: /allowed to work in Germany/i })
      .check();
    await page.getByRole("button", { name: "Complete onboarding" }).click();
    await expect(page).toHaveURL(/\/employer$/, { timeout: 15_000 });

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

    const employerId = await getLocalUserIdByEmail(employerEmail);

    // Separate browser context: the operator is a distinct authenticated
    // session, not the employer's session gaining a new capability.
    const operatorContext = await browser.newContext();
    const operatorPage = await operatorContext.newPage();
    const operatorEmail = `internal.operator.${stamp}@example.test`;
    const operatorPassword = `TestPass-${stamp}!`;

    await registerAndConfirm(operatorPage, {
      email: operatorEmail,
      password: operatorPassword,
      displayName: `Internal Op ${stamp}`,
    });

    const operatorId = await getLocalUserIdByEmail(operatorEmail);
    await provisionLocalVerificationOperator(operatorId);

    await operatorPage.goto("/internal/verification");
    await expect(
      operatorPage.getByRole("heading", { name: /Verification queue/i }),
    ).toBeVisible();
    await operatorPage
      .getByRole("link", {
        name: new RegExp(`Review.*${employerDisplayName}`, "i"),
      })
      .click();
    await expect(operatorPage).toHaveURL(
      new RegExp(`/internal/verification/${employerId}$`),
    );
    await expect(
      operatorPage.getByRole("heading", { name: employerDisplayName }),
    ).toBeVisible();

    await operatorPage
      .getByRole("checkbox", {
        name: /I confirm this employer should be verified/i,
      })
      .check();
    await operatorPage.getByRole("button", { name: "Approve" }).click();
    await expect(operatorPage).toHaveURL(/\/internal\/verification$/, {
      timeout: 15_000,
    });
    await expect(operatorPage.getByText(employerDisplayName)).toHaveCount(0);

    await operatorContext.close();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: /^Verified$/i }),
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("internal verification route authorization", () => {
  test("unauthenticated queue route redirects with safe next", async ({
    page,
  }) => {
    await page.goto("/internal/verification");
    await expect(page).toHaveURL(/\/login\?next=%2Finternal%2Fverification$/, {
      timeout: 15_000,
    });
  });
});

test.describe("internal verification non-operator authorization", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("authenticated non-operator sees a generic unavailable page, not the queue", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();

    await registerAndConfirm(page, {
      email: `internal.plain.${stamp}@example.test`,
      password: `TestPass-${stamp}!`,
      displayName: `Plain User ${stamp}`,
    });

    await page.goto("/internal/verification");
    await expect(
      page.getByRole("heading", { name: /Not available/i }),
    ).toBeVisible();
  });
});
