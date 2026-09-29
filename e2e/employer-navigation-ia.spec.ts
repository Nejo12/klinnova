import { expect, test, type Page } from "@playwright/test";

import { registerAndConfirm } from "./helpers/auth";

// Unit I / I2 — employer narrow-navigation regression coverage (I-01, I-02).
// Mirrors candidate-navigation-ia.spec.ts's viewport-loop pattern: the
// employer nav must stay within the viewport and keep its links reachable
// and visible-when-focused down to 360px, matching the fix in
// employer-vacancies.module.scss (.appNav flex-wrap).

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

async function registerAndCompleteEmployerOnboarding(
  page: Page,
  stamp: number,
): Promise<{ email: string; displayName: string }> {
  const displayName = `I2 Employer ${stamp}`;
  const email = `i2.employer.${stamp}@example.test`;

  await registerAndConfirm(page, {
    email,
    password: `TestPass-${stamp}!`,
    displayName,
    registerPath: "/employer/register",
    expectedPath: /\/employer\/onboarding$/,
  });

  const privateEmployerHeading = page.getByRole("heading", {
    name: /Private employer/i,
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const privatePersonOption = page.getByRole("radio", {
      name: /Private person/i,
    });
    await privatePersonOption.check();
    await expect(privatePersonOption).toBeChecked();
    await page.getByRole("button", { name: "Continue" }).click();

    try {
      await expect(privateEmployerHeading).toBeVisible({ timeout: 15_000 });
      break;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }

      await page.reload();
      if (await privateEmployerHeading.isVisible()) {
        break;
      }
    }
  }

  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Berlin locality").fill("Mitte");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Complete onboarding" }).click();
  await expect(page).toHaveURL(/\/employer$/, { timeout: 15_000 });

  return { email, displayName };
}

test.describe("employer navigation IA (Unit I / I2)", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  for (const width of [360, 390, 430]) {
    test(`employer nav has no horizontal overflow and stays keyboard/focus accessible at ${width}px`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
      const stamp = Date.now() + width;
      await page.setViewportSize({ width, height: 800 });
      const { displayName } = await registerAndCompleteEmployerOnboarding(
        page,
        stamp,
      );
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: `Welcome, ${displayName}`,
        }),
      ).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow).toBe(false);

      const nav = page.getByLabel("Employer");
      const homeLink = nav.getByRole("link", { name: "Employer home" });
      const vacanciesLink = nav.getByRole("link", { name: "Vacancies" });
      const applicationsLink = nav.getByRole("link", { name: "Applications" });
      const verificationLink = nav.getByRole("link", { name: "Verification" });

      await homeLink.scrollIntoViewIfNeeded();
      await expect(homeLink).toBeVisible();
      await expect(vacanciesLink).toBeVisible();
      await expect(applicationsLink).toBeVisible();
      await expect(verificationLink).toBeVisible();

      // Every nav link must stay within the viewport bounding box — not
      // merely present in the DOM. This is the exact I-01 regression check.
      for (const link of [
        homeLink,
        vacanciesLink,
        applicationsLink,
        verificationLink,
      ]) {
        await expect(link).toBeInViewport();
      }

      // Keyboard reachability + visible focus: the last nav link is the one
      // that clipped off-screen pre-fix (I-02). Focusing it must keep it
      // visible, not just present in the DOM.
      await verificationLink.focus();
      await expect(verificationLink).toBeFocused();
      await expect(verificationLink).toBeInViewport();
    });
  }

  test("employer nav has no horizontal overflow at a desktop viewport", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now() + 1000;
    await page.setViewportSize({ width: 1280, height: 900 });
    const { displayName } = await registerAndCompleteEmployerOnboarding(
      page,
      stamp,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: `Welcome, ${displayName}` }),
    ).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });

  test("employer home keeps nav Vacancies distinct from home vacancy actions (I-03)", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now() + 2000;
    const { displayName } = await registerAndCompleteEmployerOnboarding(
      page,
      stamp,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: `Welcome, ${displayName}` }),
    ).toBeVisible();

    // Exactly one "Vacancies" accessible name inside the primary nav.
    const navVacancies = page
      .getByLabel("Employer")
      .getByRole("link", { name: "Vacancies" });
    await expect(navVacancies).toHaveCount(1);
    await expect(navVacancies).toHaveAttribute("href", "/employer/vacancies");

    await expect(
      page.getByRole("link", { name: "Create draft" }),
    ).toHaveAttribute("href", "/employer/vacancies/new");
    await expect(
      page.getByRole("link", { name: "All vacancies" }),
    ).toHaveAttribute("href", "/employer/vacancies");
    await expect(
      page.getByRole("link", { name: "View vacancies" }),
    ).toHaveCount(0);
  });

  test("Employer Home and Account separate hiring from preferences at all required widths in EN and DE", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    await registerAndCompleteEmployerOnboarding(page, Date.now() + 264);

    for (const width of [360, 390, 430, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/employer");
      await expect(
        page.getByRole("heading", { name: "Vacancies" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Download employer data" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Interface preferences" }),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);

      await page
        .getByRole("button", { name: /Workspace and account: Employer/ })
        .click();
      await page.getByRole("link", { name: "Account and security" }).click();
      await expect(page).toHaveURL(/\/employer\/account$/);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Account and preferences",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("group", { name: "Appearance" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Download employer data" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Delete my Klinnova account" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Session security" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Interface preferences" }),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
    }

    await page.getByRole("radio", { name: "Dark" }).check();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme-preference",
      "dark",
    );
    await page.getByRole("radio", { name: "Deutsch" }).check();
    await expect(
      page.getByRole("heading", { level: 1, name: "Konto und Einstellungen" }),
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Darstellung" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Kontodaten exportieren" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Sitzungssicherheit" }),
    ).toBeVisible();
    for (const width of [360, 390, 430, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
    }
  });
});
