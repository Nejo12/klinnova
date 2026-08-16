import { expect, test, type Page } from "@playwright/test";

import { registerAndConfirm } from "./helpers/auth";

// M5.1 Unit C — password recovery. Real local Supabase + Mailpit journey:
// forgot-password request -> real recovery email -> real recovery link ->
// set-new-password -> old password rejected, new password accepted.
//
// Deliberately does not reuse the shared `waitForMailpitMessage` helper for
// the recovery email: by the time the recovery request fires, the same
// recipient's mailbox already contains the earlier signup-confirmation
// email, and matching by recipient address alone (what that helper does)
// cannot reliably distinguish the two. This polls the same Mailpit API but
// filters for a message body that actually contains `type=recovery`.

const MAILPIT_API =
  process.env.MAILPIT_API_URL ?? "http://127.0.0.1:54324/api/v1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

type MailpitMessageSummary = { ID: string; To: Array<{ Address: string }> };
type MailpitMessage = { ID: string; Text: string; HTML: string };

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForRecoveryMessage(
  recipientEmail: string,
  options?: { timeoutMs?: number },
): Promise<MailpitMessage> {
  const timeoutMs = options?.timeoutMs ?? 20_000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const listResponse = await fetch(`${MAILPIT_API}/messages`);
    if (!listResponse.ok) {
      throw new Error(`Mailpit list failed: ${listResponse.status}`);
    }
    const listJson = (await listResponse.json()) as {
      messages: MailpitMessageSummary[];
    };
    const candidates = listJson.messages.filter((message) =>
      message.To.some(
        (to) => to.Address.toLowerCase() === recipientEmail.toLowerCase(),
      ),
    );

    for (const candidate of candidates) {
      const detailResponse = await fetch(
        `${MAILPIT_API}/message/${candidate.ID}`,
      );
      if (!detailResponse.ok) {
        continue;
      }
      const detail = (await detailResponse.json()) as MailpitMessage;
      const haystack = `${detail.Text}\n${detail.HTML}`;
      if (/type=recovery/i.test(haystack)) {
        return detail;
      }
    }

    await sleep(250);
  }

  throw new Error(
    `Timed out waiting for a recovery-type Mailpit message to ${recipientEmail}`,
  );
}

/**
 * Extract the real recovery link. The recovery template (C4G-R) links
 * directly to our own `/auth/confirm?token_hash=...&type=recovery...`
 * interstitial — never `{{ .ConfirmationURL }}`, which would point at
 * GoTrue's own `/auth/v1/verify` and consume the one-time token on any GET,
 * including automated email-link-prefetch scanners, before a human ever
 * clicks. The GoTrue-hosted-verify pattern is still matched as a fallback
 * in case a differently configured project ever emails one instead.
 */
function extractRecoveryLink(message: MailpitMessage): string {
  const haystack = `${message.Text}\n${message.HTML}`
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
  const patterns = [
    /https?:\/\/[^\s"'<>]+\/auth\/confirm\?[^\s"'<>]+type=recovery[^\s"'<>]*/i,
    /\/auth\/confirm\?[^\s"'<>]+type=recovery[^\s"'<>]*/i,
    /https?:\/\/[^\s"'<>]+\/auth\/v1\/verify\?[^\s"'<>]*type=recovery[^\s"'<>]*/i,
  ];
  for (const pattern of patterns) {
    const match = haystack.match(pattern);
    if (match?.[0] !== undefined) {
      return match[0];
    }
  }
  throw new Error("Recovery link not found in Mailpit message");
}

async function registerAndConfirmCandidate(
  page: Page,
  stamp: number,
): Promise<{ email: string; password: string }> {
  const email = `unit-c.recovery.${stamp}@example.test`;
  const password = `OldPass-${stamp}!`;

  await registerAndConfirm(page, {
    email,
    password,
    displayName: `Unit C Recovery ${stamp}`,
  });

  return { email, password };
}

test.describe("password recovery journey (M5.1 Unit C)", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("forgot password -> real recovery email -> set new password -> old password rejected, new password accepted, same account", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const { email, password: oldPassword } = await registerAndConfirmCandidate(
      page,
      stamp,
    );
    const newPassword = `NewPass-${stamp}!`;

    // Log out so the recovery flow is proven from a signed-out state, per
    // the required journey.
    await page.goto("/candidate/account");
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/$/);

    // Open Forgot password from login.
    await page.goto("/login");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);

    // Submit the email and confirm the enumeration-safe generic response.
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset instructions" }).click();
    await expect(page.getByRole("status")).toContainText(
      /if an account exists for that email/i,
      { timeout: 15_000 },
    );

    // Read the real recovery email from local Mailpit and follow the real link.
    const recoveryMessage = await waitForRecoveryMessage(email);
    const recoveryLink = extractRecoveryLink(recoveryMessage);
    await page.goto(recoveryLink);

    // Scanner-resistant interstitial (C4G-R): the emailed link lands on a
    // page that performs no Auth call until the human explicitly submits it.
    await expect(
      page.getByRole("heading", { name: "Reset your password" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Continue to password reset" })
      .click();

    // Reach the real set-new-password UI.
    await expect(page).toHaveURL(/\/reset-password$/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Set a new password" }),
    ).toBeVisible();

    await page.getByLabel("New password", { exact: true }).fill(newPassword);
    await page.getByLabel("Confirm new password").fill(newPassword);
    await page.getByRole("button", { name: "Set new password" }).click();

    await expect(page.getByRole("status")).toContainText(
      "Your password has been reset.",
      { timeout: 15_000 },
    );
    await page.getByRole("button", { name: "Continue to sign in" }).click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });

    // Old password must now fail safely (no account-enumeration hint).
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(oldPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByText("Something went wrong. Check your details and try again."),
    ).toBeVisible({ timeout: 15_000 });

    // New password must succeed, landing on the same account (no duplicate
    // auth user, no onboarding reset — this candidate already completed
    // onboarding once via registerAndConfirm's default flow target). The
    // failed submission above cleared both fields (uncontrolled inputs
    // re-rendered by the Server Action), so both are refilled here.
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(newPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/candidate$/, { timeout: 15_000 });
  });

  test("an unknown email produces the identical generic response as a real account", async ({
    page,
  }) => {
    test.setTimeout(30_000);
    await page.goto("/forgot-password");
    await page
      .getByLabel("Email")
      .fill(`unit-c.unknown.${Date.now()}@example.test`);
    await page.getByRole("button", { name: "Send reset instructions" }).click();
    await expect(page.getByRole("status")).toContainText(
      "If an account exists for that email, we've sent password reset instructions.",
      { timeout: 15_000 },
    );
  });

  test("an invalid/malformed recovery link renders the interstitial (no Auth call on GET), and fails safely only after the human submits it", async ({
    page,
  }) => {
    test.setTimeout(30_000);
    await page.goto("/auth/confirm?token_hash=not-a-real-token&type=recovery");

    // GET alone must never consume anything — it lands on the
    // scanner-resistant interstitial, not an error page (C4G-R).
    await expect(page).toHaveURL(
      /\/auth\/confirm\?token_hash=not-a-real-token&type=recovery$/,
    );
    await expect(
      page.getByRole("heading", { name: "Reset your password" }),
    ).toBeVisible();

    // Only the explicit human submit actually attempts verification, which
    // then fails safely for a garbage token.
    await page
      .getByRole("button", { name: "Continue to password reset" })
      .click();
    await expect(page).toHaveURL(/\/auth\/error\?reason=recovery$/, {
      timeout: 15_000,
    });
    await expect(
      page.getByText(/invalid or has expired\. request a new one/i),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Request another reset" }),
    ).toHaveAttribute("href", "/forgot-password");
  });

  test("a GET to the confirmation/recovery interstitial with no token at all renders the error state directly", async ({
    page,
  }) => {
    test.setTimeout(30_000);
    await page.goto("/auth/confirm");
    await expect(
      page.getByText(
        /confirmation link is invalid or has expired\. request a new one/i,
      ),
    ).toBeVisible();
    // No form is rendered — nothing to submit.
    await expect(page.getByRole("button")).toHaveCount(0);
  });

  test("visiting /reset-password directly with no recovery session reaches the safe retry state", async ({
    page,
  }) => {
    test.setTimeout(30_000);
    await page.goto("/reset-password");
    await expect(
      page.getByText(/invalid or has expired\. request a new one/i),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Request another reset" }),
    ).toHaveAttribute("href", "/forgot-password");
  });
});
