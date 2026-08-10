import { expect, test } from "@playwright/test";

import {
  publishEligibleEmployerVacancy,
  registerAndApplyAsCandidate,
} from "./helpers/candidate-application-status-fixture";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";
const hasServiceRoleKey =
  (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length > 0;

/**
 * M5.1 Unit E — the real UI on top of Unit D's outcome-events RPCs. This is
 * deliberately a separate spec from `e2e/application-outcome-events-
 * journey.spec.ts` (Unit D's own RPC-contract E2E, using a raw authenticated
 * Supabase client) rather than an edit to it — that spec stays focused on
 * proving the RPC contract itself; this one proves the UI built on top of
 * it, via real clicks and form submissions only.
 */
test.describe("employer application outcome UI journey (M5.1 Unit E)", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("employer records, voids, and replaces outcomes through the real form; candidate sees only the active facts", async ({
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
    const { applicationUrl } = await registerAndApplyAsCandidate(
      candidatePage,
      stamp,
      vacancy.vacancyId,
    );

    // Employer detail page starts with an empty outcome history and the
    // application status still "Submitted" — no outcome has been recorded.
    const applicationPath = new URL(applicationUrl).pathname;
    const employerApplicationPath = applicationPath.replace(
      "/candidate/applications/",
      "/employer/applications/",
    );
    await page.goto(employerApplicationPath);
    await expect(
      page.getByText("No interview or hire events recorded yet."),
    ).toBeVisible();
    await expect(page.getByText("Current status: Submitted")).toBeVisible();

    // Record the first interview_completed via the real form.
    await page
      .getByLabel("Outcome", { exact: true })
      .selectOption("interview_completed");
    await page.getByRole("button", { name: "Record outcome" }).click();
    await expect(page.getByText("Interview completed recorded.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page
        .getByRole("heading", { level: 2, name: "Interview and hire history" })
        .locator("..")
        .getByText("Interview completed", { exact: true }),
    ).toHaveCount(1);

    // A second interview_completed is allowed (founder contract 2:
    // multiplicity) and does not collapse into the first row.
    await page
      .getByLabel("Outcome", { exact: true })
      .selectOption("interview_completed");
    await page.getByRole("button", { name: "Record outcome" }).click();
    await expect(page.getByText("Interview completed recorded.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page
        .getByRole("heading", { level: 2, name: "Interview and hire history" })
        .locator("..")
        .getByText("Interview completed", { exact: true }),
    ).toHaveCount(2);

    // Record hired.
    await page.getByLabel("Outcome", { exact: true }).selectOption("hired");
    await page.getByRole("button", { name: "Record outcome" }).click();
    await expect(page.getByText("Hired recorded.")).toBeVisible({
      timeout: 15_000,
    });

    // A second active hired attempt fails safely through the real form —
    // never a silent success, never a generic error.
    await page.getByLabel("Outcome", { exact: true }).selectOption("hired");
    await page.getByRole("button", { name: "Record outcome" }).click();
    await expect(
      page.getByText(
        "This application already has an active hired record. Void it first if it was recorded in error.",
      ),
    ).toBeVisible({ timeout: 15_000 });

    // Void the hired event through its own inline control. Void buttons
    // render for every *active* event regardless of outcome type (2
    // interview_completed + 1 hired at this point) — so the hired row's
    // list item, not "any Void button," is the correct target.
    const historySection = page
      .getByRole("heading", {
        level: 2,
        name: "Interview and hire history",
      })
      .locator("..");
    const activeHiredRow = page
      .getByRole("listitem")
      .filter({ hasText: "Hired" })
      .filter({ hasNotText: "Voided" });
    await expect(activeHiredRow).toHaveCount(1);
    await activeHiredRow.getByRole("button", { name: "Void" }).click();
    await expect(historySection.getByText(/Hired.*Voided/)).toBeVisible({
      timeout: 15_000,
    });
    // The two interview_completed rows are still active and still each
    // carry their own void control — voiding hired must not touch them.
    await expect(
      historySection.getByRole("button", { name: "Void" }),
    ).toHaveCount(2);

    // Record a genuine replacement hired event.
    await page.getByLabel("Outcome", { exact: true }).selectOption("hired");
    await page.getByRole("button", { name: "Record outcome" }).click();
    await expect(page.getByText("Hired recorded.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page
        .getByRole("listitem")
        .filter({ hasText: "Hired" })
        .filter({ hasNotText: "Voided" }),
    ).toHaveCount(1);

    // applications.status was never touched by any of the above — recording
    // hired is not the same as the employer's separate accept/reject
    // workflow, and setting status=accepted is never implied by hired.
    await expect(page.getByText("Current status: Submitted")).toBeVisible();

    // Candidate sees only the active facts, in a section separate from the
    // status timeline, with no "Interview set"/scheduling language and no
    // event id/actor/void metadata anywhere in the DOM.
    await candidatePage.goto(applicationPath);
    const candidateOutcomeHeading = candidatePage.getByRole("heading", {
      level: 2,
      name: "Interview and hire updates",
    });
    await expect(candidateOutcomeHeading).toBeVisible();
    const candidateOutcomeSection = candidateOutcomeHeading.locator("..");
    await expect(
      candidateOutcomeSection.getByText("Interview completed", {
        exact: true,
      }),
    ).toHaveCount(2);
    await expect(
      candidateOutcomeSection.getByText("Hired", { exact: true }),
    ).toHaveCount(1);
    await expect(
      candidatePage.getByText(/interview set|scheduled|invitation/i),
    ).toHaveCount(0);
    await expect(candidatePage.getByText(/voided/i)).toHaveCount(0);
    await expect(
      candidatePage.getByRole("button", { name: "Void" }),
    ).toHaveCount(0);

    await candidateContext.close();
  });

  test("an unrelated employer sees no outcome UI for an application they don't own", async ({
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
    const { applicationUrl } = await registerAndApplyAsCandidate(
      candidatePage,
      stamp,
      vacancy.vacancyId,
    );
    await candidateContext.close();
    const applicationPath = new URL(applicationUrl).pathname.replace(
      "/candidate/applications/",
      "/employer/applications/",
    );

    const otherContext = await page.context().browser()?.newContext();
    if (otherContext === undefined) {
      throw new Error("could not open a second employer browser context");
    }
    const otherPage = await otherContext.newPage();
    await publishEligibleEmployerVacancy(otherPage, stamp + 1000);

    await otherPage.goto(applicationPath);
    await expect(
      otherPage.getByRole("heading", {
        level: 1,
        name: "Application unavailable",
      }),
    ).toBeVisible();
    await expect(otherPage.getByLabel("Outcome", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      otherPage.getByRole("button", { name: "Record outcome" }),
    ).toHaveCount(0);
    await otherContext.close();
  });

  test("once a candidate's account is deleted, no new outcome can be recorded through the form, but historical events remain visible", async ({
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
    const { applicationUrl } = await registerAndApplyAsCandidate(
      candidatePage,
      stamp,
      vacancy.vacancyId,
    );
    const applicationPath = new URL(applicationUrl).pathname.replace(
      "/candidate/applications/",
      "/employer/applications/",
    );

    await page.goto(applicationPath);
    await page
      .getByLabel("Outcome", { exact: true })
      .selectOption("interview_completed");
    await page.getByRole("button", { name: "Record outcome" }).click();
    await expect(page.getByText("Interview completed recorded.")).toBeVisible({
      timeout: 15_000,
    });

    // Candidate self-deletes their whole Stint account through the existing
    // Slice 8 self-service UI flow — no new service-role path.
    await candidatePage
      .getByLabel("Candidate")
      .getByRole("link", { name: "Account" })
      .click();
    await expect(candidatePage).toHaveURL(/\/candidate\/account$/);
    await candidatePage
      .getByRole("link", { name: "Delete my Stint account" })
      .click();
    await expect(candidatePage).toHaveURL(/\/candidate\/account\/delete$/);
    await candidatePage
      .getByRole("checkbox", {
        name: "I understand that this deletes my whole Stint account.",
      })
      .check();
    await candidatePage
      .getByRole("button", { name: "Delete my account" })
      .click();
    await expect(candidatePage.getByRole("status")).toContainText(
      "Your Stint account has been deleted.",
      { timeout: 15_000 },
    );
    await candidateContext.close();

    // A further record attempt through the real form fails safely with the
    // one bounded unavailable message — never a more specific discriminant.
    await page.reload();
    await page.getByLabel("Outcome", { exact: true }).selectOption("hired");
    await page.getByRole("button", { name: "Record outcome" }).click();
    await expect(
      page.getByText("This application is not available."),
    ).toBeVisible({ timeout: 15_000 });

    // The pre-deletion historical event is still visible in the employer's
    // own history list.
    await page.reload();
    await expect(
      page
        .getByRole("heading", { level: 2, name: "Interview and hire history" })
        .locator("..")
        .getByText("Interview completed", { exact: true }),
    ).toHaveCount(1);
  });
});
