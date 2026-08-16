import { expect, test } from "@playwright/test";

import {
  extractConfirmNavigationTarget,
  waitForMailpitMessage,
} from "./helpers/mailpit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

const WORK_AUTHORISATION_NOTICE =
  "Matches are shown using the work-authorisation declaration you provided during onboarding. Klinnova has not verified documents.";

async function registerAndConfirm(
  page: import("@playwright/test").Page,
  stamp: number,
) {
  const email = `slice2.critical.${stamp}@example.test`;
  const password = `TestPass-${stamp}!`;
  const displayName = `Slice2 Critical ${stamp}`;

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

  return { email, password, displayName };
}

/** Values guaranteed to match at least the morning kitchen Demo vacancy. */
async function completeMatchingEssentials(
  page: import("@playwright/test").Page,
) {
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
  await expect(page).toHaveURL(/group=work_authorisation/, { timeout: 15_000 });

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
}

async function expectDemoMatchInventory(page: import("@playwright/test").Page) {
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Jobs that match your preferences",
    }),
  ).toBeVisible();
  await expect(page.getByText(/Demo vacancy/i).first()).toBeVisible();
  await expect(page.getByText("Demo Berlin Work Co").first()).toBeVisible();
  await expect(page.getByText(/Berlin/i).first()).toBeVisible();
  await expect(page.getByText(WORK_AUTHORISATION_NOTICE)).toBeVisible();
  await expect(
    page.getByText(/\d+\s*%|match score|perfect match/i),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /View job/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /apply|submit|contact|save/i }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /apply|save|contact/i }),
  ).toHaveCount(0);
}

test.describe("Slice 2 critical exit journey", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("complete journey: matches, authz, invalidate, recover", async ({
    page,
    context,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();

    // Unauthenticated visitor cannot access match inventory.
    await context.clearCookies();
    await page.goto("/candidate/matches");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(page.getByText(/Demo vacancy/i)).toHaveCount(0);
    await expect(page.getByText("Demo Berlin Work Co")).toHaveCount(0);

    await registerAndConfirm(page, stamp);

    // Incomplete candidate cannot access inventory.
    await page.goto("/candidate/matches");
    await expect(page).toHaveURL(/\/candidate\/onboarding/, {
      timeout: 15_000,
    });
    await expect(page.getByText(/Demo vacancy/i)).toHaveCount(0);
    await expect(page.getByText("Demo Berlin Work Co")).toHaveCount(0);

    await page.goto("/candidate");
    await completeMatchingEssentials(page);
    await page.getByRole("button", { name: "Confirm essentials" }).click();
    await expect(page).toHaveURL(/\/candidate\/matches$/, { timeout: 15_000 });
    await expectDemoMatchInventory(page);

    await page.reload();
    await expect(page).toHaveURL(/\/candidate\/matches$/);
    await expectDemoMatchInventory(page);

    // Invalidate an essential field → completion cleared → no inventory.
    await page.goto("/candidate/onboarding?group=work_authorisation");
    await page.getByRole("radio", { name: "Not sure" }).check();
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page).toHaveURL(/group=location/, { timeout: 15_000 });

    await page.goto("/candidate/matches");
    await expect(page).toHaveURL(/\/candidate\/onboarding/, {
      timeout: 15_000,
    });
    await expect(page.getByText(/Demo vacancy/i)).toHaveCount(0);
    await expect(page.getByText("Demo Berlin Work Co")).toHaveCount(0);

    await page.goto("/candidate");
    await expect(
      page.getByRole("link", { name: /Continue onboarding/i }),
    ).toBeVisible();

    // Correct, re-complete, matches return.
    await page.getByRole("link", { name: /Continue onboarding/i }).click();
    await page.goto("/candidate/onboarding?group=work_authorisation");
    await page.getByRole("radio", { name: "Yes" }).check();
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page).toHaveURL(/group=location/, { timeout: 15_000 });

    await page.goto("/candidate/onboarding?group=review");
    await page.getByRole("button", { name: "Confirm essentials" }).click();
    await expect(page).toHaveURL(/\/candidate\/matches$/, { timeout: 15_000 });
    await expectDemoMatchInventory(page);
  });
});
