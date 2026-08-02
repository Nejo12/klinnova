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
  const email = `onboarding.${stamp}@example.test`;
  const password = `TestPass-${stamp}!`;
  const displayName = `Onboard ${stamp}`;

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
  await expect(page).toHaveURL(/\/candidate$/, { timeout: 15_000 });

  return { email, password, displayName };
}

test.describe("local onboarding persistence journey", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("persist every group, reload, review, logout/login", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const { email, password, displayName } = await registerAndConfirm(
      page,
      stamp,
    );

    await page.getByRole("link", { name: "Continue onboarding" }).click();
    await expect(page).toHaveURL(/group=languages/);

    await page
      .getByRole("radio", {
        name: /I can understand and use some basic German/i,
      })
      .check();
    await page.getByLabel("Language 1", { exact: true }).selectOption("de");
    await page
      .getByLabel("Proficiency 1", { exact: true })
      .selectOption("native");
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page).toHaveURL(/group=work_authorisation/, {
      timeout: 15_000,
    });

    await page.getByRole("radio", { name: "Yes" }).check();
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page).toHaveURL(/group=location/);

    await page
      .getByRole("radio", { name: /Up to 30 minutes one way/i })
      .check();
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page).toHaveURL(/group=categories/);

    await page.getByRole("checkbox", { name: "Cleaning" }).check();
    await page.getByRole("checkbox", { name: "Retail" }).check();
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page).toHaveURL(/group=availability/);

    // Mid-flow reload persistence check after categories were saved.
    await page.goto("/candidate/onboarding?group=categories");
    await expect(
      page.getByRole("checkbox", { name: "Cleaning" }),
    ).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Retail" })).toBeChecked();

    await page.goto("/candidate/onboarding?group=availability");
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 2);
    const iso = tomorrow.toISOString().slice(0, 10);
    await page.getByLabel("Earliest date you can start").fill(iso);
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page).toHaveURL(/group=employment/);

    await page.getByRole("checkbox", { name: "Full time" }).check();
    await page.getByRole("checkbox", { name: "Daytime" }).check();
    await page.getByRole("button", { name: "Save and review" }).click();
    await expect(page).toHaveURL(/group=review/);
    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Essentials look complete, ${displayName}`, "i"),
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/After you confirm, you can view jobs/i),
    ).toBeVisible();

    await page.goto("/candidate/onboarding?group=location");
    await expect(
      page.getByRole("radio", { name: /Up to 30 minutes one way/i }),
    ).toBeChecked();

    const client = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: sessionData, error: signInError } =
      await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();
    const userId = sessionData.user?.id ?? "";

    const { data: profile } = await client
      .from("candidate_profiles")
      .select(
        "german_comfort, work_authorisation_declared, work_authorisation_declared_at, city, travel_radius_minutes, job_categories, onboarding_completed_at",
      )
      .eq("id", userId)
      .single();

    expect(profile?.german_comfort).toBe("basic");
    expect(profile?.work_authorisation_declared).toBe(true);
    // Declaration stamp is trigger-synced when declared true; completion remains null.
    expect(profile?.work_authorisation_declared_at).not.toBeNull();
    expect(profile?.onboarding_completed_at).toBeNull();
    expect(profile?.city).toBe("Berlin");
    expect(profile?.travel_radius_minutes).toBe(30);
    expect(profile?.job_categories).toEqual(
      expect.arrayContaining(["cleaning", "retail"]),
    );

    const { data: languages, error: languageError } = await client
      .from("candidate_languages")
      .select("language_code")
      .eq("candidate_id", userId);
    expect(languageError).toBeNull();
    expect(languages).toHaveLength(1);
    expect(languages?.[0]?.language_code).toBe("de");

    await page.goto("/candidate");
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/candidate$/);
    await page
      .getByRole("link", { name: /Review and confirm essentials/i })
      .click();
    await expect(page).toHaveURL(/group=review/);
    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Essentials look complete, ${displayName}`, "i"),
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirm essentials" }),
    ).toBeVisible();
  });
});
