import { expect, test } from "@playwright/test";

import { registerAndConfirm } from "./helpers/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

test.describe("employer onboarding journeys", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("private employer register, resume, complete, no vacancy controls", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const email = `employer.private.${stamp}@example.test`;
    const password = `TestPass-${stamp}!`;

    await registerAndConfirm(page, {
      email,
      password,
      displayName: `Private Emp ${stamp}`,
      registerPath: "/employer/register",
      expectedPath: /\/employer\/onboarding$/,
    });

    await page.getByRole("radio", { name: /Private person/i }).check();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByRole("heading", { name: /Private employer/i }),
    ).toBeVisible({
      timeout: 15_000,
    });

    await page.getByLabel("Display name").fill(`Private Emp ${stamp}`);
    await page.getByLabel("Berlin locality").fill("Mitte");
    await page.getByRole("button", { name: "Save progress" }).click();
    await expect(page.getByRole("status")).toContainText(/saved/i, {
      timeout: 15_000,
    });

    await page.reload();
    await expect(page.getByLabel("Display name")).toHaveValue(
      `Private Emp ${stamp}`,
    );
    await expect(page.getByLabel("Berlin locality")).toHaveValue("Mitte");

    await page
      .getByRole("checkbox", { name: /allowed to work in Germany/i })
      .check();
    await page.getByRole("button", { name: "Complete onboarding" }).click();
    await expect(page).toHaveURL(/\/employer$/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: `Welcome, Private Emp ${stamp}`,
      }),
    ).toBeVisible();
    await expect(page.getByText(/Verification is required/i)).toBeVisible();
    await expect(page.getByText(/Organisation company/i)).toHaveCount(0);
    await expect(
      page.getByLabel("Employer").getByRole("link", { name: "Vacancies" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Create draft", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /publish/i })).toHaveCount(0);
  });

  test("organisation employer bootstrap, resume, complete", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const email = `employer.org.${stamp}@example.test`;
    const password = `TestPass-${stamp}!`;
    const slug = `org-care-${stamp}`;

    await registerAndConfirm(page, {
      email,
      password,
      displayName: `Org Emp ${stamp}`,
      registerPath: "/employer/register",
      expectedPath: /\/employer\/onboarding$/,
    });

    await page.getByRole("radio", { name: /Organisation/i }).check();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByRole("heading", { name: /Organisation employer/i }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByLabel("Contact display name").fill(`Org Emp ${stamp}`);
    await page.getByLabel("Organisation legal name").fill(`Org GmbH ${stamp}`);
    await page.getByLabel("Berlin locality").fill("Kreuzberg");
    await page.getByLabel("Company display name").fill(`Org Care ${stamp}`);
    await page.getByLabel("Company slug").fill(slug);
    await page.getByRole("button", { name: "Save progress" }).click();
    await expect(page.getByRole("status")).toContainText(/saved/i, {
      timeout: 15_000,
    });

    await page.reload();
    await expect(page.getByLabel("Company slug")).toHaveValue(slug);

    await page
      .getByRole("checkbox", { name: /allowed to work in Germany/i })
      .check();
    await page.getByRole("button", { name: "Complete onboarding" }).click();
    await expect(page).toHaveURL(/\/employer$/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: `Welcome, Org Emp ${stamp}`,
      }),
    ).toBeVisible();
    await expect(page.getByText(/Verification is required/i)).toBeVisible();
    await expect(
      page.getByLabel("Employer").getByRole("link", { name: "Vacancies" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /publish/i })).toHaveCount(0);
  });

  test("dual-capability candidate can add employer independently", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const email = `dual.${stamp}@example.test`;
    const password = `TestPass-${stamp}!`;

    await registerAndConfirm(page, {
      email,
      password,
      displayName: `Dual ${stamp}`,
      registerPath: "/register",
      expectedPath: /\/candidate$/,
    });

    await page.goto("/employer/onboarding");
    await expect(page).toHaveURL(/\/employer\/onboarding$/);
    await page.getByRole("radio", { name: /Private person/i }).check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Display name").fill(`Dual Emp ${stamp}`);
    await page.getByLabel("Berlin locality").fill("Neukölln");
    await page
      .getByRole("checkbox", { name: /allowed to work in Germany/i })
      .check();
    await page.getByRole("button", { name: "Complete onboarding" }).click();
    await expect(page).toHaveURL(/\/employer$/, { timeout: 15_000 });

    await expect(
      page.getByRole("navigation", { name: /Account spaces/i }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Candidate" }).click();
    await expect(page).toHaveURL(/\/candidate/);
  });
});

test.describe("employer route authorization", () => {
  test("unauthenticated employer routes redirect with safe next", async ({
    page,
  }) => {
    await page.goto("/employer");
    await expect(page).toHaveURL(/\/login\?next=%2Femployer$/);

    await page.goto("/login?next=https://evil.example");
    await expect(page.locator('input[name="next"]')).toHaveValue("");
  });

  test("employer register remains public", async ({ page }) => {
    await page.goto("/employer/register");
    await expect(page).toHaveURL(/\/employer\/register$/);
    await expect(
      page.getByRole("heading", { name: /Create an employer account/i }),
    ).toBeVisible();
  });
});
