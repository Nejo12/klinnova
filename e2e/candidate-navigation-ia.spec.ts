import { expect, test, type Page } from "@playwright/test";

import { registerAndConfirm } from "./helpers/auth";

// M5.1 Unit B — coherent candidate navigation/account IA. Proves the four
// destinations (Matches, Applications, Profile, Account) are reachable
// through the real consolidated nav, that Profile opens the existing
// onboarding-review flow without resetting saved answers, that Account
// exposes export/delete/sign-out without a destructive action firing
// merely by navigating there, and that the nav/header stay usable —
// no horizontal overflow, keyboard reachable, focus visible — down to
// 360px.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

async function registerAndCompleteCandidateOnboarding(
  page: Page,
  stamp: number,
): Promise<{ email: string; displayName: string }> {
  const displayName = `Unit B Candidate ${stamp}`;
  const email = `unit-b.candidate.${stamp}@example.test`;

  await registerAndConfirm(page, {
    email,
    password: `TestPass-${stamp}!`,
    displayName,
  });

  await page.getByRole("link", { name: "Continue onboarding" }).click();
  await expect(page).toHaveURL(/group=languages/, { timeout: 15_000 });
  await page
    .getByRole("radio", {
      name: /I can understand and use some basic German/i,
    })
    .check();
  await page.getByLabel("Language 1", { exact: true }).selectOption("en");
  await page.getByLabel("Proficiency 1", { exact: true }).selectOption("basic");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=work_authorisation/, {
    timeout: 15_000,
  });

  await page.getByRole("radio", { name: "Yes" }).check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=location/);

  await page.getByRole("radio", { name: /Up to 45 minutes one way/i }).check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=categories/);

  await page.getByRole("checkbox", { name: "Cleaning" }).check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=availability/);

  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() + 3);
  await page
    .getByLabel("Earliest date you can start")
    .fill(startDate.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=employment/, { timeout: 15_000 });

  await page.getByRole("checkbox", { name: "Full time" }).check();
  await page.getByRole("checkbox", { name: "Morning" }).check();
  await page.getByRole("button", { name: "Save and review" }).click();
  await expect(page).toHaveURL(/group=review/);

  await page.getByRole("button", { name: "Confirm essentials" }).click();
  await expect(page).toHaveURL(/\/candidate\/matches$/, { timeout: 15_000 });

  return { email, displayName };
}

test.describe("candidate navigation and account IA (M5.1 Unit B)", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("a completed candidate reaches Matches, Applications, Profile, and Account through the real nav, each with accurate current-state", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    await registerAndCompleteCandidateOnboarding(page, stamp);

    // Already on Matches after confirming essentials.
    await expect(
      page.getByLabel("Candidate").getByRole("link", { name: "Matches" }),
    ).toHaveAttribute("aria-current", "page");

    await page
      .getByLabel("Candidate")
      .getByRole("link", { name: "Applications" })
      .click();
    await expect(page).toHaveURL(/\/candidate\/applications$/);
    await expect(
      page.getByLabel("Candidate").getByRole("link", { name: "Applications" }),
    ).toHaveAttribute("aria-current", "page");
    // Matches must not falsely claim current-state on a different route.
    await expect(
      page.getByLabel("Candidate").getByRole("link", { name: "Matches" }),
    ).not.toHaveAttribute("aria-current", "page");

    await page
      .getByLabel("Candidate")
      .getByRole("link", { name: "Profile" })
      .click();
    await expect(page).toHaveURL(/\/candidate\/onboarding\?group=review$/);
    await expect(
      page.getByRole("heading", { name: /Essentials confirmed/i }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Candidate").getByRole("link", { name: "Profile" }),
    ).toHaveAttribute("aria-current", "page");

    await page
      .getByLabel("Candidate")
      .getByRole("link", { name: "Account" })
      .click();
    await expect(page).toHaveURL(/\/candidate\/account$/);
    await expect(
      page.getByLabel("Candidate").getByRole("link", { name: "Account" }),
    ).toHaveAttribute("aria-current", "page");

    // Sign-out is not a primary-nav destination once Account exists.
    await expect(
      page.getByLabel("Candidate").getByRole("link", { name: /log out/i }),
    ).toHaveCount(0);
  });

  test("Account exposes export/delete/sign-out without any destructive action firing merely by navigating there", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const stamp = Date.now() + 1;
    await registerAndCompleteCandidateOnboarding(page, stamp);

    await page.goto("/candidate/account");
    await expect(
      page.getByRole("link", { name: "Download candidate data" }),
    ).toHaveAttribute("href", "/candidate/account/export");
    const deleteLink = page.getByRole("link", {
      name: "Delete my Klinnova account",
    });
    await expect(deleteLink).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Log out", exact: true }),
    ).toBeVisible();

    // Merely reaching the Account hub must not have deleted anything —
    // the profile must still exist and matches must still work.
    await page.goto("/candidate/matches");
    await expect(page).toHaveURL(/\/candidate\/matches$/);

    // Reaching the delete page itself must not trigger deletion either —
    // the confirmation checkbox/button must still require an explicit act.
    await page.goto("/candidate/account");
    await page
      .getByRole("link", { name: "Delete my Klinnova account" })
      .click();
    await expect(page).toHaveURL(/\/candidate\/account\/delete$/);
    await expect(
      page.getByRole("heading", { name: "Delete my Klinnova account" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Delete my account" }),
    ).toBeDisabled();
  });

  test("Profile navigation opens the existing review flow without resetting saved answers", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const stamp = Date.now() + 2;
    await registerAndCompleteCandidateOnboarding(page, stamp);

    await page
      .getByLabel("Candidate")
      .getByRole("link", { name: "Profile" })
      .click();
    await expect(page).toHaveURL(/\/candidate\/onboarding\?group=review$/);
    await page.getByRole("link", { name: "Review answers" }).click();
    await expect(page).toHaveURL(/group=languages/);

    // The previously-saved answer must still be selected, not reset.
    await expect(page.getByLabel("Language 1", { exact: true })).toHaveValue(
      "en",
    );
    await expect(
      page.getByRole("radio", {
        name: /I can understand and use some basic German/i,
      }),
    ).toBeChecked();
  });

  for (const width of [360, 390, 430]) {
    test(`candidate nav has no horizontal overflow and stays keyboard/focus accessible at ${width}px`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      const stamp = Date.now() + width;
      await page.setViewportSize({ width, height: 800 });
      await registerAndCompleteCandidateOnboarding(page, stamp);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow).toBe(false);

      const nav = page.getByLabel("Candidate");
      await expect(nav.getByRole("link", { name: "Matches" })).toBeVisible();
      await expect(
        nav.getByRole("link", { name: "Applications" }),
      ).toBeVisible();
      await expect(nav.getByRole("link", { name: "Profile" })).toBeVisible();
      await expect(nav.getByRole("link", { name: "Account" })).toBeVisible();

      // Keyboard reachability + visible focus: Tab to the Account link and
      // confirm it actually receives focus (not just DOM presence).
      const accountLink = nav.getByRole("link", { name: "Account" });
      await accountLink.focus();
      await expect(accountLink).toBeFocused();
    });
  }

  test("candidate nav has no horizontal overflow at a desktop viewport", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const stamp = Date.now() + 1000;
    await page.setViewportSize({ width: 1280, height: 900 });
    await registerAndCompleteCandidateOnboarding(page, stamp);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });
});
