import { expect, test } from "@playwright/test";

import {
  extractConfirmNavigationTarget,
  waitForMailpitMessage,
} from "./helpers/mailpit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

async function registerAndConfirm(
  page: import("@playwright/test").Page,
  stamp: number,
) {
  const email = `matches.${stamp}@example.test`;
  const password = `TestPass-${stamp}!`;
  const displayName = `Matches ${stamp}`;

  await page.goto("/register");
  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status")).toContainText(/Check your email/i, {
    timeout: 15_000,
  });

  const message = await waitForMailpitMessage(email);
  await page.goto(extractConfirmNavigationTarget(message));
  // Scanner-resistant interstitial (C4G-R): no Auth call until the human
  // explicitly submits it.
  await page.getByRole("button", { name: "Confirm email address" }).click();
  await expect(page).toHaveURL(/\/candidate$/, { timeout: 15_000 });
}

async function completeBroadEssentials(page: import("@playwright/test").Page) {
  await page.getByRole("link", { name: "Continue onboarding" }).click();
  await expect(page).toHaveURL(/group=languages/);

  await page
    .getByRole("radio", { name: /I am comfortable working in German/i })
    .check();
  await page.getByLabel("Language 1", { exact: true }).selectOption("en");
  await page
    .getByLabel("Proficiency 1", { exact: true })
    .selectOption("native");
  await page.getByRole("button", { name: "Add another language" }).click();
  await page.getByLabel("Language 2", { exact: true }).selectOption("ar");
  await page
    .getByLabel("Proficiency 2", { exact: true })
    .selectOption("native");
  await page.getByRole("button", { name: "Add another language" }).click();
  await page.getByLabel("Language 3", { exact: true }).selectOption("tr");
  await page
    .getByLabel("Proficiency 3", { exact: true })
    .selectOption("conversational");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=work_authorisation/, { timeout: 15_000 });

  await page.getByRole("radio", { name: "Yes" }).check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=location/);

  await page.getByRole("radio", { name: /Up to 45 minutes one way/i }).check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=categories/);

  for (const label of [
    "Cleaning",
    "Hospitality",
    "Logistics",
    "Warehousing",
    "Food production",
    "Moving",
    "Retail",
  ]) {
    await page.getByRole("checkbox", { name: label }).check();
  }
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=availability/);

  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() + 3);
  await page
    .getByLabel("Earliest date you can start")
    .fill(startDate.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=employment/, { timeout: 15_000 });

  for (const label of ["Full time", "Part time", "Mini-job", "Temporary"]) {
    await page.getByRole("checkbox", { name: label }).check();
  }
  await page.getByRole("checkbox", { name: "Flexible" }).check();
  await page.getByRole("button", { name: "Save and review" }).click();
  await expect(page).toHaveURL(/group=review/);
}

test.describe("Slice 2 candidate matches journey", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("completed candidate reaches matches with Demo vacancy and reasons", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    await registerAndConfirm(page, stamp);
    await completeBroadEssentials(page);

    await page.getByRole("button", { name: "Complete profile" }).click();
    await expect(page).toHaveURL(/\/candidate\/matches$/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Matches",
      }),
    ).toBeVisible();
    await expect(page.getByText(/Demo vacancy/i).first()).toBeVisible();
    await expect(
      page.getByText(/Based in Berlin|Berlin/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/\d+\s*%|match score|perfect match/i),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /View job/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /apply|submit|save|contact/i }),
    ).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(/\/candidate\/matches$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Matches",
      }),
    ).toBeVisible();
    await expect(page.getByText(/Demo vacancy/i).first()).toBeVisible();

    await page.goto("/candidate");
    await expect(page).toHaveURL(/\/candidate\/matches$/);
  });

  test("incomplete candidate cannot open matches inventory", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now() + 1;
    await registerAndConfirm(page, stamp);

    await page.goto("/candidate/matches");
    await expect(page).toHaveURL(/\/candidate\/onboarding/, {
      timeout: 15_000,
    });
    await expect(page.getByText(/Demo vacancy/i)).toHaveCount(0);
  });
});
