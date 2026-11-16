import { expect, test } from "@playwright/test";

test("anonymous visitor is redirected from /candidate to login", async ({
  page,
}) => {
  await page.goto("/candidate");
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Sign in" }),
  ).toBeVisible();
});

test("register and login pages render accessible forms", async ({ page }) => {
  await page.goto("/register");
  await expect(
    page.getByRole("heading", { level: 1, name: "Create your account" }),
  ).toBeVisible();
  await expect(page.getByLabel("Display name")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "What happens next" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse available jobs first" }),
  ).toHaveAttribute("href", "/jobs");
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login",
  );

  await page.goto("/login");
  await expect(
    page.getByRole("heading", { level: 1, name: "Sign in" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("German register guidance fits 390px without horizontal overflow", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("klinnova-locale", "de");
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/register");

  await expect(
    page.getByRole("heading", { level: 2, name: "So geht es weiter" }),
  ).toBeVisible();
  const link = page.getByRole("link", {
    name: "Zuerst verfügbare Jobs ansehen",
  });
  await expect(link).toHaveAttribute("href", "/jobs");
  expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(24);
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
});
