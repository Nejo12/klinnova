import { expect, test } from "@playwright/test";

import { registerAndConfirm } from "./helpers/auth";
import {
  getLocalUserIdByEmail,
  provisionLocalVerificationOperator,
} from "./helpers/local-operator-proof";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

test.describe("M5 Founder metrics authorization", () => {
  test("unauthenticated requests redirect with a safe next path", async ({
    page,
  }) => {
    await page.goto("/internal/metrics");

    await expect(page).toHaveURL(/\/login\?next=%2Finternal%2Fmetrics$/, {
      timeout: 15_000,
    });
  });

  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test(
    "an authenticated non-operator cannot read metrics",
    async ({ page }) => {
      expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
      const stamp = Date.now();

      await registerAndConfirm(page, {
        email: `metrics.plain.${stamp}@example.test`,
        password: `TestPass-${stamp}!`,
        displayName: `Metrics Plain ${stamp}`,
      });

      await page.goto("/internal/metrics");

      await expect(
        page.getByRole("heading", { name: /Not available/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /M5 — Berlin private beta/i }),
      ).toHaveCount(0);
    },
  );

  test(
    "an active operator sees aggregate-only, read-only metrics",
    async ({ page }) => {
      expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
      const stamp = Date.now();
      const email = `metrics.operator.${stamp}@example.test`;

      await registerAndConfirm(page, {
        email,
        password: `TestPass-${stamp}!`,
        displayName: `Metrics Operator ${stamp}`,
      });

      const operatorId = await getLocalUserIdByEmail(email);
      await provisionLocalVerificationOperator(operatorId);

      await page.goto("/internal/metrics");

      await expect(
        page.getByRole("heading", { name: "M5 — Berlin private beta" }),
      ).toBeVisible();
      await expect(page.getByText("Participating employers")).toBeVisible();
      await expect(page.getByText("Verified vacancies")).toBeVisible();
      await expect(page.getByText("Confirmed hires")).toBeVisible();
      await expect(page.locator("form")).toHaveCount(0);
      await expect(page.getByRole("button")).toHaveCount(0);
      await expect(page.locator("input, textarea, select")).toHaveCount(0);
    },
  );
});
