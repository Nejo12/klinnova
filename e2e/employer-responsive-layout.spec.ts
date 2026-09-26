import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { registerAndConfirm } from "./helpers/auth";
import { seedVacancyMatchingArrays } from "./helpers/employer-application-fixture";
import {
  getLocalUserIdByEmail,
  provisionLocalVerificationOperator,
} from "./helpers/local-operator-proof";

// Task I — Responsive (360 / 390 / 430 / 768 / 1280 / 1440). Scripted
// layout evidence (not a narrative claim) for the required widths across
// the representative employer surfaces: home, vacancies list, applications
// list, application detail (status actions + terminal-transition confirm
// dialog), and the vacancy create form. Mirrors the setup pattern already
// used by employer-applicant-review-journey.spec.ts (publish a vacancy,
// have a candidate apply) and the viewport-loop pattern already used by
// employer-navigation-ia.spec.ts — this file duplicates rather than
// imports either, so neither existing spec is touched.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

const REQUIRED_WIDTHS = [360, 390, 430, 768, 1280, 1440];
const NARROW_WIDTHS = new Set([360, 390, 430]);

// Under 120 chars (the title field's maxLength) but long enough to force a
// wrap at 360/390/430 — the explicit "long German titles wrap, never
// truncate" requirement.
const LONG_GERMAN_TITLE =
  "Pflegehelfer*in für ambulante Seniorenbetreuung mit Schwerpunkt Demenzbegleitung und flexiblen Wochenenddiensten";

const SCREENSHOT_DIR = path.join(
  __dirname,
  "..",
  ".playwright-mcp",
  "task-i-e2e",
);

function screenshotPath(name: string): string {
  return path.join(SCREENSHOT_DIR, `${name}.png`);
}

async function assertNoHorizontalScroll(
  page: Page,
  label: string,
): Promise<void> {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    overflow.scrollWidth,
    `${label}: document.scrollWidth (${overflow.scrollWidth}) exceeds innerWidth (${overflow.innerWidth})`,
  ).toBeLessThanOrEqual(overflow.innerWidth);
}

type PublishedVacancy = {
  vacancyId: string;
  employerEmail: string;
};

/**
 * Registers a private employer, creates a fully-readied draft with a long
 * German title, verifies it (via a separate operator context), and
 * publishes it. Adapted from
 * employer-applicant-review-journey.spec.ts's `publishEligibleEmployerVacancy`
 * (duplicated locally rather than imported, to avoid touching that file).
 */
async function publishEligibleEmployerVacancy(
  page: Page,
  stamp: number,
): Promise<PublishedVacancy> {
  const employerDisplayName = `I Resp Emp ${stamp}`;
  const employerEmail = `i.resp.employer.${stamp}@example.test`;
  const employerPassword = `TestPass-${stamp}!`;

  await registerAndConfirm(page, {
    email: employerEmail,
    password: employerPassword,
    displayName: employerDisplayName,
    registerPath: "/employer/register",
    expectedPath: /\/employer\/onboarding$/,
  });

  await page.getByRole("radio", { name: /Private person/i }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Display name").fill(employerDisplayName);
  await page.getByLabel("Berlin locality").fill("Mitte");
  await page
    .getByRole("checkbox", { name: /allowed to work in Germany/i })
    .check();
  await page.getByRole("button", { name: "Complete onboarding" }).click();
  await expect(page).toHaveURL(/\/employer$/, { timeout: 15_000 });

  await page.goto("/employer/vacancies/new");
  await page.getByLabel("Title").fill(LONG_GERMAN_TITLE);
  await page.getByLabel("Job category").selectOption("hospitality");
  await page.getByLabel("Berlin public locality").fill("Mitte");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/employer\/vacancies\/.+\/edit$/, {
    timeout: 15_000,
  });
  const vacancyId = page
    .url()
    .match(/\/employer\/vacancies\/([^/]+)\/edit/)?.[1];
  if (vacancyId === undefined) {
    throw new Error("could not parse vacancy id from edit URL");
  }

  await page.getByLabel("Description").fill("Morning host support, 3 hours.");
  await page.getByLabel("Workplace type").selectOption("shop");
  await page.getByLabel("Work frequency").selectOption("recurring");
  await page.getByRole("checkbox", { name: "CV required" }).check();
  await page
    .getByRole("checkbox", { name: "Interview can be in English" })
    .check();
  await page.getByLabel("Amount in EUR").fill("16.00");
  await page.getByLabel("Period").selectOption("hourly");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft changes saved.")).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("button", { name: "Add language" }).click();
  await page.getByLabel(/Language 1/i).selectOption("en");
  await page.getByLabel(/Minimum proficiency 1/i).selectOption("basic");
  await page.getByRole("button", { name: "Save languages" }).click();
  await expect(page.getByText("Language requirements saved.")).toBeVisible({
    timeout: 15_000,
  });

  await seedVacancyMatchingArrays(vacancyId, ["part_time"], ["morning"]);

  // Readiness only renders while `publicationState === "draft"`.
  // At this point every vacancy detail is complete but Employer verification
  // is still the sole blocker. Across all required widths, assert the compact
  // #258 state instead of the retired wall of Complete/Missing rows.
  for (const width of REQUIRED_WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/employer/vacancies/${vacancyId}`);
    await assertNoHorizontalScroll(page, `vacancy-detail-readiness@${width}`);
    const readiness = page.getByLabel("Publication readiness");
    await expect(
      readiness.getByRole("heading", { name: "Publication readiness" }),
    ).toBeVisible();
    await expect(
      readiness.getByText("Vacancy details complete", { exact: true }),
    ).toBeVisible();
    await expect(
      readiness.getByText(/\d+ \/ \d+ complete/, { exact: true }),
    ).toBeVisible();
    await expect(
      readiness.getByText(
        "Verification required before publishing. Your draft stays saved.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      readiness.getByRole("link", { name: "Go to verification" }),
    ).toHaveAttribute("href", "/employer/verification");
    await expect(
      readiness.getByText("Ready to publish", { exact: true }),
    ).toHaveCount(0);
    await page.screenshot({
      path: screenshotPath(`vacancy-detail-readiness-${width}`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto("/employer/verification");
  await page
    .getByRole("checkbox", {
      name: /I confirm that the information in my employer profile/i,
    })
    .check();
  await page.getByRole("button", { name: "Request verification" }).click();
  await expect(
    page.getByRole("status", { name: "Pending review" }),
  ).toBeVisible({ timeout: 15_000 });

  const employerId = await getLocalUserIdByEmail(employerEmail);

  const operatorContext = await page.context().browser()?.newContext();
  if (operatorContext === undefined) {
    throw new Error("could not open an operator browser context");
  }
  const operatorPage = await operatorContext.newPage();
  await registerAndConfirm(operatorPage, {
    email: `i.resp.operator.${stamp}@example.test`,
    password: `TestPass-${stamp}!`,
    displayName: `I Resp Op ${stamp}`,
  });
  const operatorId = await getLocalUserIdByEmail(
    `i.resp.operator.${stamp}@example.test`,
  );
  await provisionLocalVerificationOperator(operatorId);

  await operatorPage.goto("/internal/verification");
  await operatorPage
    .getByRole("link", {
      name: new RegExp(`Review.*${employerDisplayName}`, "i"),
    })
    .click();
  await expect(operatorPage).toHaveURL(
    new RegExp(`/internal/verification/${employerId}$`),
  );
  await operatorPage
    .getByRole("checkbox", {
      name: /I confirm this employer should be verified/i,
    })
    .check();
  await operatorPage.getByRole("button", { name: "Approve" }).click();
  await expect(operatorPage).toHaveURL(/\/internal\/verification$/, {
    timeout: 15_000,
  });
  await operatorContext.close();

  await page.goto(`/employer/vacancies/${vacancyId}`);
  await page
    .getByRole("checkbox", {
      name: /Publishing may make this vacancy publicly visible/i,
    })
    .check();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published", { exact: true })).toBeVisible({
    timeout: 15_000,
  });

  return { vacancyId, employerEmail };
}

/**
 * Registers and onboards a candidate eligible for the vacancy above, then
 * submits an application. Adapted from the same journey spec's
 * `registerAndApplyAsCandidate`.
 */
async function registerAndApplyAsCandidate(
  page: Page,
  stamp: number,
  vacancyId: string,
): Promise<string> {
  const candidateDisplayName = `I Resp Candidate ${stamp}`;
  const candidateEmail = `i.resp.candidate.${stamp}@example.test`;
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

  await page.getByRole("button", { name: "Complete profile" }).click();
  await expect(page).toHaveURL(/\/candidate\/matches$/, { timeout: 15_000 });

  await page.goto(`/candidate/jobs/${vacancyId}`);
  await page.getByRole("button", { name: "Apply with profile" }).click();
  await expect(page).toHaveURL(/\/candidate\/applications\/([0-9a-f-]{36})$/, {
    timeout: 15_000,
  });

  const applicationId = page
    .url()
    .match(/\/candidate\/applications\/([0-9a-f-]{36})/)?.[1];
  if (applicationId === undefined) {
    throw new Error("could not parse application id from candidate URL");
  }
  return applicationId;
}

test.describe("employer responsive layout (Task I)", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("no horizontal scroll, wrap-not-truncate, stacked status actions, and bottom-sheet dialog across all 6 required widths", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    const stamp = Date.now();
    const vacancy = await publishEligibleEmployerVacancy(page, stamp);

    const candidateContext = await page.context().browser()?.newContext();
    if (candidateContext === undefined) {
      throw new Error("could not open a candidate browser context");
    }
    const candidatePage = await candidateContext.newPage();
    const applicationId = await registerAndApplyAsCandidate(
      candidatePage,
      stamp,
      vacancy.vacancyId,
    );
    await candidateContext.close();

    // `page` is still authenticated as the employer.
    for (const width of REQUIRED_WIDTHS) {
      const narrow = NARROW_WIDTHS.has(width);
      await page.setViewportSize({ width, height: 900 });

      // --- Employer home ---
      await page.goto("/employer");
      await assertNoHorizontalScroll(page, `home@${width}`);
      await page.screenshot({
        path: screenshotPath(`home-${width}`),
        fullPage: true,
      });

      // --- Vacancies list: no horizontal scroll, long title wraps ---
      await page.goto("/employer/vacancies");
      await assertNoHorizontalScroll(page, `vacancies@${width}`);
      const createDraft = page.getByRole("link", { name: "Create draft" });
      const createBox = await createDraft.boundingBox();
      expect(createBox).not.toBeNull();
      expect(createBox!.x + createBox!.width).toBeLessThanOrEqual(width + 1);
      expect(createBox!.height).toBeGreaterThanOrEqual(44);
      if (width < 768) {
        const intro = createDraft.locator("xpath=../..");
        const introCopy = intro.locator("div").first();
        const copyBox = await introCopy.boundingBox();
        expect(createBox!.y).toBeGreaterThanOrEqual(
          copyBox!.y + copyBox!.height,
        );
        expect(createBox!.width).toBeGreaterThanOrEqual(copyBox!.width - 1);
      }
      await page.evaluate(() => localStorage.setItem("klinnova-locale", "de"));
      await page.reload();
      await assertNoHorizontalScroll(page, `vacancies-de@${width}`);
      const germanCreate = page.getByRole("link", {
        name: "Entwurf erstellen",
      });
      const germanBox = await germanCreate.boundingBox();
      expect(germanBox).not.toBeNull();
      expect(germanBox!.x + germanBox!.width).toBeLessThanOrEqual(width + 1);
      expect(germanBox!.height).toBeGreaterThanOrEqual(44);
      await page.evaluate(() => localStorage.setItem("klinnova-locale", "en"));
      await page.reload();
      const titleHeading = page.getByRole("heading", {
        name: LONG_GERMAN_TITLE,
        level: 3,
      });
      await expect(titleHeading).toBeVisible();
      const titleLayout = await titleHeading.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          textOverflow: cs.textOverflow,
          whiteSpace: cs.whiteSpace,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          renderedHeight: el.getBoundingClientRect().height,
        };
      });
      expect(
        titleLayout.textOverflow,
        `vacancies@${width}: title text-overflow must not be ellipsis`,
      ).not.toBe("ellipsis");
      expect(
        titleLayout.whiteSpace,
        `vacancies@${width}: title white-space must not be nowrap`,
      ).not.toBe("nowrap");
      // A wrapped multi-line heading never needs to scroll to show its
      // own text: scrollWidth (content) must fit within clientWidth (box).
      expect(
        titleLayout.scrollWidth,
        `vacancies@${width}: title content wider than its own box (would truncate/clip)`,
      ).toBeLessThanOrEqual(titleLayout.clientWidth + 1);
      await page.screenshot({
        path: screenshotPath(`vacancies-${width}`),
        fullPage: true,
      });

      if (narrow) {
        // Card treatment: the vacancy's <li> gets a background + border at
        // narrow widths (Task I's "stacked card" treatment).
        const listItem = page.locator("li", { has: titleHeading });
        const cardLayout = await listItem.first().evaluate((el) => {
          const cs = getComputedStyle(el);
          return {
            backgroundColor: cs.backgroundColor,
            borderTopWidth: cs.borderTopWidth,
            borderRadius: cs.borderRadius,
          };
        });
        expect(
          cardLayout.borderRadius,
          `vacancies@${width}: listItem should have a card border-radius at narrow widths`,
        ).not.toBe("0px");
        // Confirms the card background is actually applied, not just its
        // corners rounded (a fully transparent box would still pass the
        // border-radius assertion above).
        expect(
          cardLayout.backgroundColor,
          `vacancies@${width}: listItem should have a non-transparent card background at narrow widths`,
        ).not.toBe("rgba(0, 0, 0, 0)");
        // Confirms the card border is actually applied, not just declared
        // with a zero width.
        expect(
          cardLayout.borderTopWidth,
          `vacancies@${width}: listItem should have a visible card border at narrow widths`,
        ).not.toBe("0px");
      }

      // --- Published vacancy detail: no horizontal scroll (readiness
      // checklist itself is checked separately, above, while the vacancy
      // was still a draft — it doesn't render once published). ---
      await page.goto(`/employer/vacancies/${vacancy.vacancyId}`);
      await assertNoHorizontalScroll(page, `vacancy-detail-published@${width}`);

      // --- Applications list: three group headings, no horizontal scroll ---
      await page.goto("/employer/applications");
      await assertNoHorizontalScroll(page, `applications@${width}`);
      await expect(
        page.getByRole("heading", { name: /Needs review/i }),
      ).toBeVisible();
      await expect(page.getByRole("heading", { name: /^Open/i })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /Decided/i }),
      ).toBeVisible();
      await page.screenshot({
        path: screenshotPath(`applications-${width}`),
        fullPage: true,
      });

      // --- Application detail: status actions + terminal confirm dialog ---
      await page.goto(`/employer/applications/${applicationId}`);
      await assertNoHorizontalScroll(page, `application-detail@${width}`);

      const rejectOpener = page.getByRole("button", {
        name: "Reject application",
      });
      await expect(rejectOpener).toBeVisible();

      if (narrow) {
        const rejectBox = await rejectOpener.boundingBox();
        const viewport = page.viewportSize();
        expect(viewport).not.toBeNull();
        expect(
          rejectBox!.width,
          `application-detail@${width}: terminal action button should be full-width stacked`,
        ).toBeGreaterThan(viewport!.width * 0.7);
        expect(
          rejectBox!.height,
          `application-detail@${width}: terminal action button must meet touch-target-min (44px)`,
        ).toBeGreaterThanOrEqual(43);
      }

      await rejectOpener.click();
      const dialog = page.getByRole("alertdialog");
      await expect(dialog).toBeVisible();
      const dialogBox = await dialog.boundingBox();
      const viewport = page.viewportSize();
      expect(dialogBox).not.toBeNull();
      expect(viewport).not.toBeNull();

      if (narrow) {
        // Bottom sheet: panel's bottom edge sits at the viewport bottom and
        // spans (nearly) the full width.
        expect(
          dialogBox!.y + dialogBox!.height,
          `application-detail@${width}: dialog panel should reach the viewport bottom (bottom sheet)`,
        ).toBeGreaterThan(viewport!.height - 5);
        expect(
          dialogBox!.width,
          `application-detail@${width}: dialog panel should span full viewport width (bottom sheet)`,
        ).toBeGreaterThan(viewport!.width - 5);

        const cancelBox = await dialog
          .getByRole("button", { name: "Cancel" })
          .boundingBox();
        const confirmBox = await dialog
          .getByRole("button", { name: "Reject application" })
          .boundingBox();
        expect(cancelBox).not.toBeNull();
        expect(confirmBox).not.toBeNull();
        expect(
          cancelBox!.width,
          `application-detail@${width}: dialog Cancel button should be full-width stacked`,
        ).toBeGreaterThan(viewport!.width * 0.7);
        expect(
          confirmBox!.width,
          `application-detail@${width}: dialog confirm button should be full-width stacked`,
        ).toBeGreaterThan(viewport!.width * 0.7);
        expect(
          cancelBox!.height,
          `application-detail@${width}: dialog Cancel button must meet touch-target-min`,
        ).toBeGreaterThanOrEqual(43);
        expect(
          confirmBox!.height,
          `application-detail@${width}: dialog confirm button must meet touch-target-min`,
        ).toBeGreaterThanOrEqual(43);
        // Order preserved: Cancel above Reject application (ordinary-first
        // visual order retained top-to-bottom in the stacked layout).
        expect(
          cancelBox!.y,
          `application-detail@${width}: Cancel should render above the confirm button when stacked`,
        ).toBeLessThan(confirmBox!.y);
      } else {
        // Desktop/tablet: centered modal, not flush to any edge.
        expect(
          dialogBox!.y,
          `application-detail@${width}: dialog panel should be vertically centered, not a bottom sheet`,
        ).toBeGreaterThan(20);
        expect(
          dialogBox!.y + dialogBox!.height,
          `application-detail@${width}: dialog panel should not touch the viewport bottom`,
        ).toBeLessThan(viewport!.height - 5);
      }

      await page.screenshot({
        path: screenshotPath(`application-detail-dialog-${width}`),
      });
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await expect(dialog).toBeHidden();

      // --- Vacancy create form: sticky nav + German-requirement radios ---
      await page.goto("/employer/vacancies/new");
      await assertNoHorizontalScroll(page, `vacancy-form@${width}`);
      await expect(page.getByRole("link", { name: "Basics" })).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Role details" }),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: "Salary" })).toBeVisible();
      await page.screenshot({
        path: screenshotPath(`vacancy-form-${width}`),
        fullPage: true,
      });
    }
  });
});
