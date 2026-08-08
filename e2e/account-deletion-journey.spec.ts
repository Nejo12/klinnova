import { expect, test } from "@playwright/test";

import { registerAndConfirm } from "./helpers/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";
const hasServiceRoleKey =
  (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length > 0;

test.describe("account deletion journey", () => {
  test.skip(
    !runAuthJourney || !hasServiceRoleKey,
    "Set E2E_AUTH_JOURNEY=1 and SUPABASE_SERVICE_ROLE_KEY with local Supabase URL/key to run this journey",
  );

  test("candidate confirms whole-account deletion, sees success, and cannot log back in", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const email = `deletion.candidate.${stamp}@example.test`;
    const password = `TestPass-${stamp}!`;

    await registerAndConfirm(page, {
      email,
      password,
      displayName: `Deletion Candidate ${stamp}`,
      registerPath: "/register",
      expectedPath: /\/candidate$/,
    });

    await page.getByRole("link", { name: "Delete my Stint account" }).click();
    await expect(page).toHaveURL(/\/candidate\/account\/delete$/);

    const confirmButton = page.getByRole("button", {
      name: "Delete my account",
    });
    await expect(confirmButton).toBeDisabled();

    const confirmCheckbox = page.getByRole("checkbox", {
      name: "I understand that this deletes my whole Stint account.",
    });
    // Server-authoritative confirmation contract (not just client UX):
    // the checkbox must submit the exact field name/value both destructive
    // Server Actions require before any deletion RPC or privileged
    // processing can run.
    await expect(confirmCheckbox).toHaveAttribute(
      "name",
      "confirmAccountDeletion",
    );
    await expect(confirmCheckbox).toHaveAttribute("value", "yes");

    await confirmCheckbox.check();
    await expect(confirmButton).toBeEnabled();

    await confirmButton.click();
    await expect(page.getByRole("status")).toContainText(
      "Your Stint account has been deleted.",
      { timeout: 15_000 },
    );

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    // The ordinary generic Auth failure state, not a special "this account
    // was deleted" message — D-081 explicitly rejects account-enumeration
    // wording here.
    await expect(
      page.getByText("Something went wrong. Check your details and try again."),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("cancelling with no pending request reports nothing to cancel", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const email = `deletion.cancel.${stamp}@example.test`;
    const password = `TestPass-${stamp}!`;

    await registerAndConfirm(page, {
      email,
      password,
      displayName: `Deletion Cancel ${stamp}`,
      registerPath: "/register",
      expectedPath: /\/candidate$/,
    });

    await page.goto("/candidate/account/delete");
    await page
      .getByRole("button", { name: "Cancel any pending deletion request" })
      .click();

    await expect(page.getByRole("status")).toContainText(
      "There is no pending deletion request to cancel.",
      { timeout: 15_000 },
    );

    // The account remains fully usable — cancellation attempts are safe,
    // blind, response-driven, and never destructive on their own.
    await expect(
      page.getByRole("button", { name: "Delete my account" }),
    ).toBeDisabled();
  });
});
