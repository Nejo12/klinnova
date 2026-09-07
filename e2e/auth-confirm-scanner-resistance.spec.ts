import { expect, test } from "@playwright/test";

import {
  extractConfirmNavigationTarget,
  waitForMailpitMessage,
} from "./helpers/mailpit";

// C4G-R1 — the core acceptance test for the scanner-resistant Auth
// confirmation/recovery redesign. Proves the defect (an automated GET
// consuming a one-time Auth token before the human's own click) is fixed:
// a bare GET to the emailed link — simulating an email-security scanner's
// prefetch, via Playwright's `request` fixture, which never runs page JS
// or submits forms — must perform zero Auth mutation. Only the human's own
// explicit form submission (the real browser `page`) consumes the token.
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

test.describe("Auth confirmation/recovery scanner resistance (C4G-R1)", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("signup: a simulated scanner GET does not confirm the account; only the human's explicit POST does, and the token cannot be reused", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);

    const stamp = Date.now();
    const email = `c4gr1-scanner-signup-${stamp}@example.test`;
    const password = `ScannerPass-${stamp}!`;

    await page.goto("/register");
    await page.getByLabel("Display name").fill(`Scanner Signup ${stamp}`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("status")).toContainText(/Check your email/i, {
      timeout: 15_000,
    });

    const message = await waitForMailpitMessage(email);
    const link = extractConfirmNavigationTarget(message);

    // Step 1 — simulated scanner prefetch: a bare GET via a request context
    // that shares no session with the real browser `page` and executes no
    // JavaScript or form submission, mirroring an automated email-security
    // scanner following the link independently of the eventual human click.
    const scannerResponse = await request.get(link);
    expect(scannerResponse.ok()).toBe(true);

    // The scanner's GET must not have confirmed the account: signing in
    // with the real credentials must still fail (Supabase rejects
    // unconfirmed accounts; the app's generic, enumeration-safe failure
    // copy is identical regardless of the underlying reason).
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByText("Something went wrong. Check your details and try again."),
    ).toBeVisible({ timeout: 15_000 });

    // Step 2 — the real human visits the same link and explicitly submits
    // the interstitial's own form.
    await page.goto(link);
    await expect(
      page.getByRole("heading", { name: "Confirm your email address" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Confirm email address" }).click();
    await expect(page).toHaveURL(/\/candidate$/, { timeout: 15_000 });

    // Step 3 — one-time enforcement: revisiting the same link and
    // submitting again must fail safely, never silently re-confirm.
    await page.goto(link);
    await page.getByRole("button", { name: "Confirm email address" }).click();
    await expect(page).toHaveURL(/\/auth\/error/, { timeout: 15_000 });
  });

  test("recovery: a simulated scanner GET does not consume the recovery token; only the human's explicit POST does", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);
    const stamp = Date.now();
    const email = `c4gr1-scanner-recovery-${stamp}@example.test`;
    const password = `ScannerPass-${stamp}!`;
    const newPassword = `NewScannerPass-${stamp}!`;

    await page.goto("/register");
    await page.getByLabel("Display name").fill(`Scanner Recovery ${stamp}`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("status")).toContainText(/Check your email/i, {
      timeout: 15_000,
    });
    const signupMessage = await waitForMailpitMessage(email);
    await page.goto(extractConfirmNavigationTarget(signupMessage));
    await page.getByRole("button", { name: "Confirm email address" }).click();
    await expect(page).toHaveURL(/\/candidate$/, { timeout: 15_000 });

    await page.goto("/candidate/account");
    await page.getByRole("button", { name: "Log out", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset instructions" }).click();
    await expect(page.getByRole("status")).toContainText(
      /if an account exists for that email/i,
      { timeout: 15_000 },
    );

    // Poll Mailpit for the recovery-typed message specifically (the inbox
    // already contains the earlier signup-confirmation email).
    const recoveryLink = await (async () => {
      const started = Date.now();
      while (Date.now() - started < 20_000) {
        const listResponse = await fetch(
          `${process.env.MAILPIT_API_URL ?? "http://127.0.0.1:54324/api/v1"}/messages`,
        );
        const listJson = (await listResponse.json()) as {
          messages: Array<{ ID: string; To: Array<{ Address: string }> }>;
        };
        for (const candidate of listJson.messages) {
          if (
            !candidate.To.some(
              (to) => to.Address.toLowerCase() === email.toLowerCase(),
            )
          ) {
            continue;
          }
          const detailResponse = await fetch(
            `${process.env.MAILPIT_API_URL ?? "http://127.0.0.1:54324/api/v1"}/message/${candidate.ID}`,
          );
          const detail = (await detailResponse.json()) as {
            Text: string;
            HTML: string;
          };
          const haystack = `${detail.Text}\n${detail.HTML}`;
          if (/type=recovery/i.test(haystack)) {
            const match = haystack
              .replace(/&amp;/g, "&")
              .match(/https?:\/\/[^\s"'<>]+\/auth\/confirm\?[^\s"'<>]+/i);
            if (match?.[0] !== undefined) {
              return match[0];
            }
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error("Timed out waiting for a recovery-type Mailpit message");
    })();

    // Step 1 — simulated scanner prefetch on the recovery link.
    const scannerResponse = await request.get(recoveryLink);
    expect(scannerResponse.ok()).toBe(true);

    // Step 2 — the real human visits the same link and explicitly submits.
    await page.goto(recoveryLink);
    await expect(
      page.getByRole("heading", { name: "Reset your password" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Continue to password reset" })
      .click();
    await expect(page).toHaveURL(/\/reset-password$/, { timeout: 15_000 });

    await page.getByLabel("New password", { exact: true }).fill(newPassword);
    await page.getByLabel("Confirm new password").fill(newPassword);
    await page.getByRole("button", { name: "Set new password" }).click();
    await expect(page.getByRole("status")).toContainText(
      "Your password has been reset.",
      { timeout: 15_000 },
    );

    // The scanner's earlier GET did not consume the token — the human's
    // subsequent real flow above completed successfully, proving it.
  });
});
