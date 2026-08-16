import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import {
  extractConfirmNavigationTarget,
  waitForMailpitMessage,
} from "./helpers/mailpit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

async function registerAndConfirm(
  page: import("@playwright/test").Page,
  stamp: number,
) {
  const email = `complete.${stamp}@example.test`;
  const password = `TestPass-${stamp}!`;
  const displayName = `Complete ${stamp}`;

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

async function fillEssentials(page: import("@playwright/test").Page) {
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

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 3);
  await page
    .getByLabel("Earliest date you can start")
    .fill(tomorrow.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=employment/);

  await page.getByRole("checkbox", { name: "Part time" }).check();
  await page.getByRole("checkbox", { name: "Evening" }).check();
  await page.getByRole("button", { name: "Save and review" }).click();
  await expect(page).toHaveURL(/group=review/);
}

test.describe("Slice 1 completion gate journey", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("confirm completion, resume completed, invalidate on edit", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const { email, password, displayName } = await registerAndConfirm(
      page,
      stamp,
    );

    await fillEssentials(page);
    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Essentials look complete, ${displayName}`, "i"),
      }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Confirm essentials" }).click();
    await expect(page).toHaveURL(/\/candidate\/matches$/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Jobs that match your preferences",
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /Matches are shown using the work-authorisation declaration/i,
      ),
    ).toBeVisible();

    const client = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: sessionData, error: signInError } =
      await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();
    const userId = sessionData.user?.id ?? "";

    const { data: completedProfile } = await client
      .from("candidate_profiles")
      .select(
        "onboarding_completed_at, work_authorisation_declared_at, work_authorisation_declared",
      )
      .eq("id", userId)
      .single();

    expect(completedProfile?.onboarding_completed_at).not.toBeNull();
    expect(completedProfile?.work_authorisation_declared_at).not.toBeNull();
    expect(completedProfile?.work_authorisation_declared).toBe(true);

    await page.reload();
    await expect(page).toHaveURL(/\/candidate\/matches$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Jobs that match your preferences",
      }),
    ).toBeVisible();
    await page.goto("/candidate/onboarding?group=review");
    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Essentials confirmed, ${displayName}`, "i"),
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /View matching jobs/i }),
    ).toBeVisible();

    await page.goto("/candidate/onboarding?group=work_authorisation");
    await page.getByRole("radio", { name: "Not sure" }).check();
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page).toHaveURL(/group=location/, { timeout: 15_000 });

    const { data: clearedProfile } = await client
      .from("candidate_profiles")
      .select(
        "onboarding_completed_at, work_authorisation_declared, work_authorisation_declared_at",
      )
      .eq("id", userId)
      .single();

    expect(clearedProfile?.work_authorisation_declared).toBe(false);
    expect(clearedProfile?.work_authorisation_declared_at).toBeNull();
    expect(clearedProfile?.onboarding_completed_at).toBeNull();

    await page.goto("/candidate");
    await expect(
      page.getByRole("link", { name: /Continue onboarding/i }),
    ).toBeVisible();
  });
});
