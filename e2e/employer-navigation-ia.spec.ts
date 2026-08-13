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

  await page.getByRole("radio", { name: /Private person/i }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("heading", { name: /Private employer/i }),
  ).toBeVisible({ timeout: 15_000 });

  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Berlin locality").fill("Mitte");
  await page
    .getByRole("checkbox", { name: /allowed to work in Germany/i })
    .check();
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
      await registerAndCompleteEmployerOnboarding(page, stamp);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow).toBe(false);

      const nav = page.getByLabel("Employer");
      const homeLink = nav.getByRole("link", { name: "Employer home" });
      const vacanciesLink = nav.getByRole("link", { name: "Vacancies" });
      const applicationsLink = nav.getByRole("link", { name: "Applications" });
      const verificationLink = nav.getByRole("link", { name: "Verification" });

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
    await registerAndCompleteEmployerOnboarding(page, stamp);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });

  test("dashboard has exactly one nav-scoped 'Vacancies' link and a distinctly-named quick action, both reaching /employer/vacancies (I-03)", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now() + 2000;
    await registerAndCompleteEmployerOnboarding(page, stamp);

    // Exactly one "Vacancies" accessible name inside the primary nav.
    const navVacancies = page
      .getByLabel("Employer")
      .getByRole("link", { name: "Vacancies" });
    await expect(navVacancies).toHaveCount(1);
    await expect(navVacancies).toHaveAttribute("href", "/employer/vacancies");

    // The dashboard quick-action keeps its visible text "Vacancies" but
    // exposes a distinct accessible name, so it no longer collides with the
    // nav link under a page-wide role query.
    const quickAction = page.getByRole("link", { name: "View vacancies" });
    await expect(quickAction).toHaveCount(1);
    await expect(quickAction).toHaveText("Vacancies");
    await expect(quickAction).toHaveAttribute("href", "/employer/vacancies");

    // A page-wide query for the exact text "Vacancies" still finds both
    // elements (visible text intentionally unchanged) — only the
    // accessible-name query is disambiguated.
    await expect(page.getByText("Vacancies", { exact: true })).toHaveCount(2);
  });
});
