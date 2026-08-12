import { expect, test } from "@playwright/test";

import {
  candidateApplicationOutcomes,
  employerApplicationOutcomes,
  recordApplicationOutcome,
  registerAndApplyAsCandidateWithCredentials,
  signInAsRpcClient,
  voidApplicationOutcome,
} from "./helpers/application-outcome-fixture";
import { publishEligibleEmployerVacancy } from "./helpers/candidate-application-status-fixture";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";
const hasServiceRoleKey =
  (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length > 0;

test.describe("application outcome events journey (D-M5-22)", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("employer records, voids, and replaces interview/hire outcomes via the real RPC contract; candidate and employer reads stay within their own boundaries", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();

    const vacancy = await publishEligibleEmployerVacancy(page, stamp);

    const candidateContext = await page.context().browser()?.newContext();
    if (candidateContext === undefined) {
      throw new Error("could not open a candidate browser context");
    }
    const candidatePage = await candidateContext.newPage();
    const { candidateEmail, candidatePassword, applicationUrl } =
      await registerAndApplyAsCandidateWithCredentials(
        candidatePage,
        stamp,
        vacancy.vacancyId,
      );
    await candidateContext.close();

    const applicationId = applicationUrl.match(
      /\/candidate\/applications\/([0-9a-f-]{36})$/,
    )?.[1];
    if (applicationId === undefined) {
      throw new Error("could not parse application id from candidate URL");
    }

    const employerClient = await signInAsRpcClient(
      vacancy.employerEmail,
      vacancy.employerPassword,
    );

    // Two interview_completed events on the same application both count —
    // founder contract 2 allows multiple rounds.
    const firstInterview = await recordApplicationOutcome(
      employerClient,
      applicationId,
      "interview_completed",
      new Date(Date.now() - 60_000).toISOString(),
    );
    expect(firstInterview.result).toBe("ok");

    const secondInterview = await recordApplicationOutcome(
      employerClient,
      applicationId,
      "interview_completed",
      new Date().toISOString(),
    );
    expect(secondInterview.result).toBe("ok");
    expect(secondInterview.outcome_event_id).not.toBe(
      firstInterview.outcome_event_id,
    );

    // Employer-authorized read sees both, with full recorded_at/voided_at
    // metadata.
    const employerReadAfterInterviews = await employerApplicationOutcomes(
      employerClient,
      applicationId,
    );
    expect(employerReadAfterInterviews).toHaveLength(2);
    expect(
      employerReadAfterInterviews.every(
        (row) => row.outcome_type === "interview_completed",
      ),
    ).toBe(true);

    // Candidate-safe read returns the same active facts — outcome_type and
    // occurred_at only, never outcome_event_id/recorded_at/actor/void
    // metadata (D-M5-6).
    const candidateClient = await signInAsRpcClient(
      candidateEmail,
      candidatePassword,
    );
    const candidateReadAfterInterviews = await candidateApplicationOutcomes(
      candidateClient,
      applicationId,
    );
    expect(candidateReadAfterInterviews).toHaveLength(2);
    for (const row of candidateReadAfterInterviews) {
      expect(Object.keys(row).sort()).toEqual(["occurred_at", "outcome_type"]);
    }

    // hired: first attempt succeeds.
    const firstHired = await recordApplicationOutcome(
      employerClient,
      applicationId,
      "hired",
      new Date().toISOString(),
    );
    expect(firstHired.result).toBe("ok");
    const firstHiredId = firstHired.outcome_event_id as string;

    // A second concurrent active hired attempt fails safely — founder
    // contract 3 (at most one active hired event).
    const secondHiredAttempt = await recordApplicationOutcome(
      employerClient,
      applicationId,
      "hired",
      new Date().toISOString(),
    );
    expect(secondHiredAttempt.result).toBe("already_hired");

    // Void the mistaken hired event, then record a genuine replacement.
    const voidResult = await voidApplicationOutcome(
      employerClient,
      firstHiredId,
    );
    expect(voidResult.result).toBe("ok");

    // Voiding twice is a safe no-op report, never a silent double-void.
    const repeatVoid = await voidApplicationOutcome(
      employerClient,
      firstHiredId,
    );
    expect(repeatVoid.result).toBe("already_voided");

    const replacementHired = await recordApplicationOutcome(
      employerClient,
      applicationId,
      "hired",
      new Date().toISOString(),
    );
    expect(replacementHired.result).toBe("ok");
    expect(replacementHired.outcome_event_id).not.toBe(firstHiredId);

    // Employer read now shows 4 events total (2 interviews + voided hired +
    // replacement hired) and exactly one active hired.
    const employerReadFinal = await employerApplicationOutcomes(
      employerClient,
      applicationId,
    );
    expect(employerReadFinal).toHaveLength(4);
    const activeHired = employerReadFinal.filter(
      (row) => row.outcome_type === "hired" && row.voided_at === null,
    );
    expect(activeHired).toHaveLength(1);
    expect(activeHired[0]?.outcome_event_id).toBe(
      replacementHired.outcome_event_id,
    );
    const voidedHired = employerReadFinal.filter(
      (row) => row.outcome_type === "hired" && row.voided_at !== null,
    );
    expect(voidedHired).toHaveLength(1);
    expect(voidedHired[0]?.outcome_event_id).toBe(firstHiredId);

    // Candidate-safe read reflects only active facts: 2 interviews + 1
    // hired (the voided one excluded), still with the narrow projection.
    const candidateReadFinal = await candidateApplicationOutcomes(
      candidateClient,
      applicationId,
    );
    expect(candidateReadFinal).toHaveLength(3);
    expect(
      candidateReadFinal.filter((row) => row.outcome_type === "hired"),
    ).toHaveLength(1);

    // applications.status was never touched by any outcome RPC — recording
    // hired is not the same as the employer's separate accept/reject
    // transition workflow. Verified through the existing employer
    // application-detail UI, which is the authoritative status projection.
    await page.goto(`/employer/applications/${applicationId}`);
    await expect(page.getByText("Current status: Submitted")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("an unrelated employer cannot record, void, or read another employer's application outcomes", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now() + 1;

    const vacancy = await publishEligibleEmployerVacancy(page, stamp);

    const candidateContext = await page.context().browser()?.newContext();
    if (candidateContext === undefined) {
      throw new Error("could not open a candidate browser context");
    }
    const candidatePage = await candidateContext.newPage();
    const { applicationUrl } = await registerAndApplyAsCandidateWithCredentials(
      candidatePage,
      stamp,
      vacancy.vacancyId,
    );
    await candidateContext.close();

    const applicationId = applicationUrl.match(
      /\/candidate\/applications\/([0-9a-f-]{36})$/,
    )?.[1];
    if (applicationId === undefined) {
      throw new Error("could not parse application id from candidate URL");
    }

    const ownerClient = await signInAsRpcClient(
      vacancy.employerEmail,
      vacancy.employerPassword,
    );
    const owned = await recordApplicationOutcome(
      ownerClient,
      applicationId,
      "interview_completed",
      new Date().toISOString(),
    );
    expect(owned.result).toBe("ok");
    const ownedEventId = owned.outcome_event_id as string;

    const otherContext = await page.context().browser()?.newContext();
    if (otherContext === undefined) {
      throw new Error("could not open a second employer browser context");
    }
    const otherPage = await otherContext.newPage();
    const otherVacancy = await publishEligibleEmployerVacancy(
      otherPage,
      stamp + 1000,
    );
    await otherContext.close();
    const otherClient = await signInAsRpcClient(
      otherVacancy.employerEmail,
      otherVacancy.employerPassword,
    );

    const deniedRecord = await recordApplicationOutcome(
      otherClient,
      applicationId,
      "interview_completed",
      new Date().toISOString(),
    );
    expect(deniedRecord.result).toBe("unavailable");

    const deniedVoid = await voidApplicationOutcome(otherClient, ownedEventId);
    expect(deniedVoid.result).toBe("unavailable");

    const deniedRead = await employerApplicationOutcomes(
      otherClient,
      applicationId,
    );
    expect(deniedRead).toHaveLength(0);

    // The true owner still sees their own event untouched.
    const ownerRead = await employerApplicationOutcomes(
      ownerClient,
      applicationId,
    );
    expect(ownerRead).toHaveLength(1);
    expect(ownerRead[0]?.outcome_event_id).toBe(ownedEventId);
  });

  test("once a candidate's account is deleted, no new outcome event can be recorded or voided, but historical events remain visible to the employer", async ({
    page,
  }) => {
    test.skip(
      !hasServiceRoleKey,
      "Set SUPABASE_SERVICE_ROLE_KEY (local Supabase service_role key) to run the account-deletion gate assertion",
    );
    test.setTimeout(150_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now() + 2;

    const vacancy = await publishEligibleEmployerVacancy(page, stamp);

    const candidateContext = await page.context().browser()?.newContext();
    if (candidateContext === undefined) {
      throw new Error("could not open a candidate browser context");
    }
    const candidatePage = await candidateContext.newPage();
    const { applicationUrl } = await registerAndApplyAsCandidateWithCredentials(
      candidatePage,
      stamp,
      vacancy.vacancyId,
    );

    const applicationId = applicationUrl.match(
      /\/candidate\/applications\/([0-9a-f-]{36})$/,
    )?.[1];
    if (applicationId === undefined) {
      throw new Error("could not parse application id from candidate URL");
    }

    const employerClient = await signInAsRpcClient(
      vacancy.employerEmail,
      vacancy.employerPassword,
    );
    const beforeDeletion = await recordApplicationOutcome(
      employerClient,
      applicationId,
      "interview_completed",
      new Date().toISOString(),
    );
    expect(beforeDeletion.result).toBe("ok");
    const historicalEventId = beforeDeletion.outcome_event_id as string;

    // Candidate self-deletes their whole Klinnova account through the existing
    // Slice 8 self-service UI flow — no new service-role path, matching
    // `account-deletion-journey.spec.ts`'s established local proof pattern.
    await candidatePage
      .getByLabel("Candidate")
      .getByRole("link", { name: "Account" })
      .click();
    await expect(candidatePage).toHaveURL(/\/candidate\/account$/);
    await candidatePage
      .getByRole("link", { name: "Delete my Klinnova account" })
      .click();
    await expect(candidatePage).toHaveURL(/\/candidate\/account\/delete$/);
    await candidatePage
      .getByRole("checkbox", {
        name: "I understand that this deletes my whole Klinnova account.",
      })
      .check();
    await candidatePage
      .getByRole("button", { name: "Delete my account" })
      .click();
    await expect(candidatePage.getByRole("status")).toContainText(
      "Your Klinnova account has been deleted.",
      { timeout: 15_000 },
    );
    await candidateContext.close();

    // No new outcome event may be recorded for this now-deleted candidate's
    // preserved application (founder contract 8).
    const afterDeletionRecord = await recordApplicationOutcome(
      employerClient,
      applicationId,
      "interview_completed",
      new Date().toISOString(),
    );
    expect(afterDeletionRecord.result).toBe("unavailable");

    // Voiding an existing pre-deletion event is blocked too — the same
    // D-087 precedent already applied to
    // `transition_current_employer_application_status`: employer mutation
    // access to a deleted candidate's application stops entirely.
    const afterDeletionVoid = await voidApplicationOutcome(
      employerClient,
      historicalEventId,
    );
    expect(afterDeletionVoid.result).toBe("unavailable");

    // The pre-existing historical fact is preserved and still readable by
    // the employer.
    const employerReadAfterDeletion = await employerApplicationOutcomes(
      employerClient,
      applicationId,
    );
    expect(employerReadAfterDeletion).toHaveLength(1);
    expect(employerReadAfterDeletion[0]?.outcome_event_id).toBe(
      historicalEventId,
    );
    expect(employerReadAfterDeletion[0]?.voided_at).toBeNull();
  });
});
