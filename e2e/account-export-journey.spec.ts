import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { registerAndConfirm } from "./helpers/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

type ExportEnvelope = {
  version: number;
  exported_at: string;
  account: { email: string; created_at: string };
  candidate?: unknown;
  employer?: unknown;
};

async function downloadAndParse(
  page: import("@playwright/test").Page,
  linkName: string,
): Promise<ExportEnvelope> {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: linkName }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (path === null) {
    throw new Error("download produced no local path");
  }
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as ExportEnvelope;
}

test.describe("account export journeys", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("candidate downloads a candidate-only JSON export of their own data", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const email = `export.candidate.${stamp}@example.test`;
    const password = `TestPass-${stamp}!`;

    await registerAndConfirm(page, {
      email,
      password,
      displayName: `Export Candidate ${stamp}`,
      registerPath: "/register",
      expectedPath: /\/candidate$/,
    });

    // Export lives on the Account destination (M5.1 Unit B).
    await page.goto("/candidate/account");
    const exportPayload = await downloadAndParse(
      page,
      "Download candidate data",
    );

    expect(exportPayload.version).toBe(1);
    expect(exportPayload.account.email).toBe(email);
    expect(exportPayload).toHaveProperty("candidate");
    expect(exportPayload).not.toHaveProperty("employer");
    expect(JSON.stringify(exportPayload)).not.toMatch(/verification_state/);
  });

  test("employer downloads an employer-only JSON export with no candidate PII", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const email = `export.employer.${stamp}@example.test`;
    const password = `TestPass-${stamp}!`;

    await registerAndConfirm(page, {
      email,
      password,
      displayName: `Export Employer ${stamp}`,
      registerPath: "/employer/register",
      expectedPath: /\/employer\/onboarding$/,
    });

    await page.getByRole("radio", { name: /Private person/i }).check();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByRole("heading", { name: /Private employer/i }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByLabel("Display name").fill(`Export Emp ${stamp}`);
    await page.getByLabel("Berlin locality").fill("Mitte");
    await page
      .getByRole("checkbox", { name: /allowed to work in Germany/i })
      .check();
    await page.getByRole("button", { name: "Complete onboarding" }).click();
    await expect(page).toHaveURL(/\/employer$/, { timeout: 15_000 });

    const exportPayload = await downloadAndParse(
      page,
      "Download employer data",
    );

    expect(exportPayload.version).toBe(1);
    expect(exportPayload.account.email).toBe(email);
    expect(exportPayload).toHaveProperty("employer");
    expect(exportPayload).not.toHaveProperty("candidate");

    const serialized = JSON.stringify(exportPayload);
    expect(serialized).not.toMatch(/candidate_snapshot/);
    expect(serialized).not.toMatch(/candidate_id/);
    expect(serialized).not.toMatch(/candidate-secret/);
  });

  test("dual-capability account: candidate surface exports candidate data only, employer surface exports employer data only", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const email = `export.dual.${stamp}@example.test`;
    const password = `TestPass-${stamp}!`;

    await registerAndConfirm(page, {
      email,
      password,
      displayName: `Export Dual ${stamp}`,
      registerPath: "/register",
      expectedPath: /\/candidate$/,
    });

    await page.goto("/employer/onboarding");
    await expect(page).toHaveURL(/\/employer\/onboarding$/);
    await page.getByRole("radio", { name: /Private person/i }).check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Display name").fill(`Export Dual Emp ${stamp}`);
    await page.getByLabel("Berlin locality").fill("Neukölln");
    await page
      .getByRole("checkbox", { name: /allowed to work in Germany/i })
      .check();
    await page.getByRole("button", { name: "Complete onboarding" }).click();
    await expect(page).toHaveURL(/\/employer$/, { timeout: 15_000 });

    const employerExport = await downloadAndParse(
      page,
      "Download employer data",
    );
    expect(employerExport).toHaveProperty("employer");
    expect(employerExport).not.toHaveProperty("candidate");

    await page.getByRole("link", { name: "Candidate" }).click();
    await expect(page).toHaveURL(/\/candidate/);

    // Export lives on the Account destination (M5.1 Unit B).
    await page.goto("/candidate/account");
    const candidateExport = await downloadAndParse(
      page,
      "Download candidate data",
    );
    expect(candidateExport).toHaveProperty("candidate");
    expect(candidateExport).not.toHaveProperty("employer");

    // Same authenticated identity, shared Auth metadata across both
    // independently-scoped downloads (D-088) — duplication, not leakage.
    expect(candidateExport.account.email).toBe(email);
    expect(employerExport.account.email).toBe(email);
  });
});
