import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import {
  extractConfirmNavigationTarget,
  waitForMailpitMessage,
} from "./helpers/mailpit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

test.describe("local Auth journey", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("register → confirm → candidate → logout → login", async ({
    page,
    request,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    expect(publishableKey.length).toBeGreaterThan(0);

    const stamp = Date.now();
    const email = `candidate.${stamp}@example.test`;
    const password = `TestPass-${stamp}!`;
    const displayName = `Ada ${stamp}`;

    await page.goto("/register");
    await page.getByLabel("Display name").fill(displayName);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("status")).toContainText(/Check your email/i, {
      timeout: 15_000,
    });

    const message = await waitForMailpitMessage(email);
    const confirmTarget = extractConfirmNavigationTarget(message);

    await page.goto(confirmTarget);
    // Scanner-resistant interstitial (C4G-R): no Auth call until the human
    // explicitly submits it.
    await page.getByRole("button", { name: "Confirm email address" }).click();
    await expect(page).toHaveURL(/\/candidate$/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { level: 1, name: `Welcome, ${displayName}` }),
    ).toBeVisible();

    const admin = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Authenticated REST via user session cookies is harder from Node; verify via
    // Auth admin is unavailable without service role. Instead, sign in with the
    // same credentials and read the profile under RLS.
    const { data: sessionData, error: signInError } =
      await admin.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();
    expect(sessionData.user?.id).toBeTruthy();

    const userId = sessionData.user?.id ?? "";
    const { data: profile, error: profileError } = await admin
      .from("candidate_profiles")
      .select(
        "id, display_name, onboarding_completed_at, work_authorisation_declared_at",
      )
      .eq("id", userId)
      .maybeSingle();

    expect(profileError).toBeNull();
    expect(profile?.id).toBe(userId);
    expect(profile?.display_name).toBe(displayName);
    expect(profile?.onboarding_completed_at).toBeNull();
    expect(profile?.work_authorisation_declared_at).toBeNull();

    await page.reload();
    await expect(page).toHaveURL(/\/candidate$/);
    await expect(
      page.getByRole("heading", { level: 1, name: `Welcome, ${displayName}` }),
    ).toBeVisible();

    const { count, error: countError } = await admin
      .from("candidate_profiles")
      .select("id", { count: "exact", head: true })
      .eq("id", userId);
    expect(countError).toBeNull();
    expect(count).toBe(1);

    // Sign-out lives on the Account destination (M5.1 Unit B), not the
    // candidate home header.
    await page.goto("/candidate/account");
    await page.getByRole("button", { name: "Log out", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/candidate");
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/candidate$/);
    await expect(
      page.getByRole("heading", { level: 1, name: `Welcome, ${displayName}` }),
    ).toBeVisible();

    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Dashboard" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Create account" }),
    ).toHaveCount(0);

    await page.goto("/candidate/account");
    await page.getByRole("button", { name: "Log out all devices" }).click();
    const allDevicesDialog = page.getByRole("dialog", {
      name: "Log out all devices",
    });
    await expect(allDevicesDialog).toBeVisible();
    await allDevicesDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/\/candidate\/account$/);

    await page.getByRole("button", { name: "Log out all devices" }).click();
    await allDevicesDialog
      .getByRole("button", { name: "Log out all devices" })
      .click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/candidate");
    await expect(page).toHaveURL(/\/login/);

    // Keep request fixture referenced so Playwright injects it if needed later.
    expect(request).toBeTruthy();
  });
});
