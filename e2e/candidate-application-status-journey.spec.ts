import { expect, test, type Page } from "@playwright/test";

import {
  publishEligibleEmployerVacancy,
  registerAndApplyAsCandidate,
  transitionApplicationStatusAsEmployer,
} from "./helpers/candidate-application-status-fixture";
import { registerAndConfirm } from "./helpers/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

async function openEmployerApplicationDetail(employerPage: Page) {
  await employerPage.goto("/employer/applications");
  // Task A's applications list intentionally shows a row in more than one
  // group when it's both unseen and open (needsReview/open are orthogonal
  // axes, not exclusive buckets) — a freshly-submitted application is
  // both, so this identical "Review" link (same href) legitimately
  // appears twice; .first() is the correct scoping.
  await employerPage
    .getByRole("link", { name: /^Review\b/ })
    .first()
    .click();
  await expect(employerPage).toHaveURL(
    /\/employer\/applications\/[0-9a-f-]{36}$/,
    { timeout: 15_000 },
  );
}

async function expectReviewCurrentStatus(page: Page, status: string) {
  const reviewSection = page.getByRole("region", { name: "Review" });
  await expect(reviewSection.getByText("Current status")).toBeVisible();
  await expect(reviewSection.getByText(status, { exact: true })).toBeVisible();
}

test.describe("candidate application status journey", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("candidate sees inventory, snapshot fields, and a live status timeline as a real employer vacancy application progresses to accepted", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();

    const employerContext = await page.context().browser()?.newContext();
    if (employerContext === undefined) {
      throw new Error("could not open an employer browser context");
    }
    const employerPage = await employerContext.newPage();
    const vacancy = await publishEligibleEmployerVacancy(employerPage, stamp);

    const { candidateDisplayName, applicationUrl } =
      await registerAndApplyAsCandidate(page, stamp, vacancy.vacancyId);

    // Regression proof: this is a *real* employer vacancy (source: employer,
    // demo_label: null in the stored snapshot) — before the demo_label fix
    // this page rendered "Application not available".
    await expect(
      page.getByRole("heading", { level: 1, name: "You're one step closer." }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Application not available" }),
    ).toHaveCount(0);

    // --- Inventory ---
    await page.goto("/candidate/applications");
    await expect(
      page.getByRole("heading", { level: 1, name: "Applications" }),
    ).toBeVisible();
    await expect(
      page
        .getByText("Your active and closed applications in one place.")
        .first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Active" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 3,
        name: `Morning host role ${stamp}`,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(vacancy.employerDisplayName, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Berlin")).toBeVisible();
    await expect(page.locator("time").first()).toBeVisible();

    await page
      .getByRole("link", {
        name: `View application: Morning host role ${stamp}`,
      })
      .click();
    await expect(page).toHaveURL(applicationUrl);

    // --- Timeline: submitted -> reviewing ---
    await openEmployerApplicationDetail(employerPage);
    await transitionApplicationStatusAsEmployer(employerPage, "reviewing");
    await expectReviewCurrentStatus(employerPage, "In review");

    await page.reload();
    const statusValue = page.getByRole("definition").first();
    await expect(statusValue).toHaveText("In review");
    const timelineHeading = page.getByRole("heading", {
      level: 2,
      name: "Status timeline",
    });
    await expect(timelineHeading).toBeVisible();
    const timelineSection = page.locator("section", {
      has: timelineHeading,
    });
    await expect(timelineSection.getByText("Submitted")).toBeVisible();
    await expect(timelineSection.getByText("In review")).toBeVisible();

    // --- reviewing -> shortlisted ---
    await transitionApplicationStatusAsEmployer(employerPage, "shortlisted");
    await expectReviewCurrentStatus(employerPage, "Shortlisted");

    await page.reload();
    await expect(statusValue).toHaveText("Shortlisted");
    await expect(timelineSection.getByText("Shortlisted")).toBeVisible();

    // --- shortlisted -> accepted (terminal, informational only) ---
    await transitionApplicationStatusAsEmployer(employerPage, "accepted");
    await expectReviewCurrentStatus(employerPage, "Accepted");

    await page.reload();
    await expect(statusValue).toHaveText("Accepted");
    await expect(timelineSection.getByText("Accepted")).toBeVisible();
    await page.goto("/candidate/applications");
    await expect(
      page.getByRole("heading", { level: 2, name: "Closed" }),
    ).toBeVisible();
    await expect(page.getByTestId("application-status-value")).toHaveText(
      "Accepted",
    );
    await expect(
      page.getByRole("link", { name: "Find more matches" }),
    ).toHaveAttribute("href", "/candidate/matches");
    await page.goto(applicationUrl);
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /accept|confirm/i }),
    ).toHaveCount(0);

    await expect(page.getByText(candidateDisplayName)).toBeVisible();
    await employerContext.close();
  });

  test("candidate sees 'Not selected' (not the employer's reason or actor identity) while the employer still sees Rejected", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now() + 1;

    const employerContext = await page.context().browser()?.newContext();
    if (employerContext === undefined) {
      throw new Error("could not open an employer browser context");
    }
    const employerPage = await employerContext.newPage();
    const vacancy = await publishEligibleEmployerVacancy(employerPage, stamp);
    await registerAndApplyAsCandidate(page, stamp, vacancy.vacancyId);

    await openEmployerApplicationDetail(employerPage);
    await transitionApplicationStatusAsEmployer(
      employerPage,
      "rejected",
      "Role filled internally.",
    );
    // Employer/internal label is the unchanged canonical label.
    await expectReviewCurrentStatus(employerPage, "Rejected");

    await page.reload();
    // Candidate-facing label is the candidate-only display label.
    await expect(page.getByRole("definition").first()).toHaveText(
      "Not selected",
    );
    await expect(page.getByText("Role filled internally.")).toHaveCount(0);
    await expect(page.getByText(/reason/i)).toHaveCount(0);
    await expect(page.getByText(/actor/i)).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(0);

    await page.goto("/candidate/applications");
    await expect(
      page.getByRole("heading", { level: 2, name: "Closed" }),
    ).toBeVisible();
    await expect(page.getByTestId("application-status-value")).toHaveText(
      "Not selected",
    );
    await expect(page.getByText("Role filled internally.")).toHaveCount(0);
    await expect(page.getByText("Mitte", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Kreuzberg", { exact: true })).toHaveCount(0);

    await employerContext.close();
  });

  test("a second candidate cannot see another candidate's application", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now() + 2;

    const employerContext = await page.context().browser()?.newContext();
    if (employerContext === undefined) {
      throw new Error("could not open an employer browser context");
    }
    const employerPage = await employerContext.newPage();
    const vacancy = await publishEligibleEmployerVacancy(employerPage, stamp);
    await employerContext.close();

    const { applicationUrl } = await registerAndApplyAsCandidate(
      page,
      stamp,
      vacancy.vacancyId,
    );

    const otherContext = await page.context().browser()?.newContext();
    if (otherContext === undefined) {
      throw new Error("could not open a second candidate browser context");
    }
    const otherPage = await otherContext.newPage();
    await registerAndConfirm(otherPage, {
      email: `status.candidate.${stamp + 1000}@example.test`,
      password: `TestPass-${stamp}!`,
      displayName: `Other Candidate ${stamp}`,
    });

    await otherPage.goto("/candidate/applications");
    await expect(
      otherPage.getByText("Status Candidate", { exact: false }),
    ).toHaveCount(0);

    await otherPage.goto(applicationUrl);
    await expect(
      otherPage.getByRole("heading", {
        level: 1,
        name: "Application not available",
      }),
    ).toBeVisible();
    await otherContext.close();
  });

  test("candidate can still view an application after the vacancy is withdrawn", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now() + 3;

    const employerContext = await page.context().browser()?.newContext();
    if (employerContext === undefined) {
      throw new Error("could not open an employer browser context");
    }
    const employerPage = await employerContext.newPage();
    const vacancy = await publishEligibleEmployerVacancy(employerPage, stamp);

    const { applicationUrl } = await registerAndApplyAsCandidate(
      page,
      stamp,
      vacancy.vacancyId,
    );

    await employerPage.goto(`/employer/vacancies/${vacancy.vacancyId}`);
    await employerPage
      .getByRole("checkbox", { name: /Withdrawing this vacancy is final/i })
      .check();
    await employerPage.getByRole("button", { name: "Withdraw" }).click();
    await expect(
      employerPage.getByText("Withdrawn", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await employerContext.close();

    await page.goto(applicationUrl);
    await expect(
      page.getByRole("heading", { level: 1, name: "You're one step closer." }),
    ).toBeVisible();
    await expect(
      page.getByText(`Morning host role ${stamp}`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(vacancy.employerDisplayName, { exact: true }),
    ).toBeVisible();

    await page.goto("/candidate/applications");
    await expect(
      page.getByRole("heading", {
        level: 3,
        name: `Morning host role ${stamp}`,
      }),
    ).toBeVisible();
  });
});
