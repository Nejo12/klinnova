import { expect, type Page } from "@playwright/test";

import {
  extractConfirmNavigationTarget,
  waitForMailpitMessage,
} from "./mailpit";

export async function registerAndConfirm(
  page: Page,
  options: {
    email: string;
    password: string;
    displayName: string;
    registerPath?: string;
    expectedPath?: RegExp;
  },
): Promise<void> {
  await page.goto(options.registerPath ?? "/register");
  await page.getByLabel("Display name").fill(options.displayName);
  await page.getByLabel("Email").fill(options.email);
  await page.getByLabel("Password").fill(options.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status")).toContainText(/Check your email/i, {
    timeout: 15_000,
  });

  const message = await waitForMailpitMessage(options.email);
  await page.goto(extractConfirmNavigationTarget(message));
  await expect(page).toHaveURL(options.expectedPath ?? /\/candidate$/, {
    timeout: 15_000,
  });
}
