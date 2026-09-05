import { expect, type Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { registerAndConfirm } from "./auth";
import {
  createLocalUserClient,
  signInLocalUser,
} from "./local-application-proof";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/**
 * Registers and onboards a candidate eligible for
 * `publishEligibleEmployerVacancy`'s output (`candidate-application-status-fixture.ts`),
 * then submits an application to the given vacancy. Duplicates the shared
 * fixture's candidate flow — rather than extending it — because this D-M5-22
 * journey needs the candidate's own email/password back (to re-authenticate
 * a raw RPC client against `record_application_outcome`'s candidate-safe
 * counterpart later), which the shared helper does not return.
 */
export async function registerAndApplyAsCandidateWithCredentials(
  page: Page,
  stamp: number,
  vacancyId: string,
): Promise<{
  candidateDisplayName: string;
  candidateEmail: string;
  candidatePassword: string;
  applicationUrl: string;
}> {
  const candidateDisplayName = `Outcome Candidate ${stamp}`;
  const candidateEmail = `outcome.candidate.${stamp}@example.test`;
  const candidatePassword = `TestPass-${stamp}!`;

  await registerAndConfirm(page, {
    email: candidateEmail,
    password: candidatePassword,
    displayName: candidateDisplayName,
  });

  await page.getByRole("link", { name: "Continue onboarding" }).click();
  await expect(page).toHaveURL(/group=languages/);
  await page
    .getByRole("radio", {
      name: /I can understand and use some basic German/i,
    })
    .check();
  await page.getByLabel("Language 1", { exact: true }).selectOption("en");
  await page
    .getByLabel("Proficiency 1", { exact: true })
    .selectOption("conversational");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=work_authorisation/, {
    timeout: 15_000,
  });

  await page.getByRole("radio", { name: "Yes" }).check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=location/);

  await page.getByRole("radio", { name: /Up to 45 minutes one way/i }).check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=categories/);

  await page.getByRole("checkbox", { name: "Hospitality" }).check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=availability/);

  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() + 3);
  await page
    .getByLabel("Earliest date you can start")
    .fill(startDate.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/group=employment/, { timeout: 15_000 });

  await page.getByRole("checkbox", { name: "Part time" }).check();
  await page.getByRole("checkbox", { name: "Morning" }).check();
  await page.getByRole("button", { name: "Save and review" }).click();
  await expect(page).toHaveURL(/group=review/);

  await page.getByRole("button", { name: "Confirm essentials" }).click();
  await expect(page).toHaveURL(/\/candidate\/matches$/, { timeout: 15_000 });

  await page.goto(`/candidate/jobs/${vacancyId}`);
  await page.getByRole("button", { name: "Preview application" }).click();
  await expect(
    page.getByRole("heading", { name: "Review before submitting" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page).toHaveURL(/\/candidate\/applications\/[0-9a-f-]{36}$/, {
    timeout: 15_000,
  });

  return {
    candidateDisplayName,
    candidateEmail,
    candidatePassword,
    applicationUrl: page.url(),
  };
}

export async function signInAsRpcClient(
  email: string,
  password: string,
): Promise<SupabaseClient> {
  const client = createLocalUserClient(supabaseUrl, publishableKey);
  await signInLocalUser(client, email, password);
  return client;
}

type OutcomeRpcResult = Record<string, unknown>;

export async function recordApplicationOutcome(
  client: SupabaseClient,
  applicationId: string,
  outcomeType: string,
  occurredAt: string,
): Promise<OutcomeRpcResult> {
  const { data, error } = await client.rpc("record_application_outcome", {
    p_application_id: applicationId,
    p_outcome_type: outcomeType,
    p_occurred_at: occurredAt,
  });
  if (error !== null) {
    throw new Error(`record_application_outcome failed: ${error.message}`);
  }
  return data as OutcomeRpcResult;
}

export async function voidApplicationOutcome(
  client: SupabaseClient,
  outcomeEventId: string,
): Promise<OutcomeRpcResult> {
  const { data, error } = await client.rpc("void_application_outcome", {
    p_outcome_event_id: outcomeEventId,
  });
  if (error !== null) {
    throw new Error(`void_application_outcome failed: ${error.message}`);
  }
  return data as OutcomeRpcResult;
}

export async function candidateApplicationOutcomes(
  client: SupabaseClient,
  applicationId: string,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await client.rpc("candidate_application_outcomes", {
    p_application_id: applicationId,
  });
  if (error !== null) {
    throw new Error(`candidate_application_outcomes failed: ${error.message}`);
  }
  return (data ?? []) as Record<string, unknown>[];
}

export async function employerApplicationOutcomes(
  client: SupabaseClient,
  applicationId: string,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await client.rpc("employer_application_outcomes", {
    p_application_id: applicationId,
  });
  if (error !== null) {
    throw new Error(`employer_application_outcomes failed: ${error.message}`);
  }
  return (data ?? []) as Record<string, unknown>[];
}
