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

  await page.goto("/login");
  await expect(
    page.getByRole("heading", { level: 1, name: "Sign in" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
