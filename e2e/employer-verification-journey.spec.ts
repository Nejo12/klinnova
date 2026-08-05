import { expect, test } from "@playwright/test";

import { registerAndConfirm } from "./helpers/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

test.describe("employer verification journeys", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("completed private employer requests verification and sees pending state after reload", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const email = `employer.verify.${stamp}@example.test`;
    const password = `TestPass-${stamp}!`;

    await registerAndConfirm(page, {
      email,
      password,
      displayName: `Verify Emp ${stamp}`,
      registerPath: "/employer/register",
      expectedPath: /\/employer\/onboarding$/,
    });

    await page.getByRole("radio", { name: /Private person/i }).check();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByRole("heading", { name: /Private employer/i }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByLabel("Display name").fill(`Verify Emp ${stamp}`);
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
    await expect(page).toHaveURL(/\/employer\/verification$/);
    await expect(
      page.getByRole("heading", { name: /Not requested/i }),
    ).toBeVisible();

    await page
      .getByRole("checkbox", {
        name: /I confirm that the information in my employer profile/i,
      })
      .check();
    await page.getByRole("button", { name: "Request verification" }).click();
    await expect(
      page.getByRole("heading", { name: /Pending review/i }),
    ).toBeVisible({ timeout: 15_000 });

    await page.reload();
    await expect(
      page.getByRole("heading", { name: /Pending review/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /request verification/i }),
    ).toHaveCount(0);
  });
});

test.describe("employer verification route authorization", () => {
  test("unauthenticated verification route redirects with safe next", async ({
    page,
  }) => {
    await page.goto("/employer/verification");
    await expect(page).toHaveURL(/\/login\?next=%2Femployer%2Fverification$/);
  });
});
