import { expect, test } from "@playwright/test";

import {
  extractConfirmNavigationTarget,
  waitForMailpitMessage,
} from "./helpers/mailpit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

const WORK_AUTHORISATION_NOTICE =
  "Matches are shown using the work-authorisation declaration you provided during onboarding. Stint has not verified documents.";

const APPLICATION_SUBMIT_DISCLOSURE =
  "By submitting, the profile information shown here will be stored with your application and made available to a future employer review workflow.";

const MORNING_KITCHEN_ID = "22222222-2222-4222-8222-222222222201";
const MORNING_KITCHEN_TITLE = "Demo vacancy — Morning kitchen support";

async function registerAndConfirm(
  page: import("@playwright/test").Page,
  stamp: number,
) {
  const email = `job.detail.${stamp}@example.test`;
  const password = `TestPass-${stamp}!`;
  const displayName = `Job Detail ${stamp}`;

  await page.goto("/register");
  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status")).toContainText(/Check your email/i, {
    timeout: 15_000,
  });

  const message = await waitForMailpitMessage(email);
  await page.goto(extractConfirmNavigationTarget(message));
  await expect(page).toHaveURL(/\/candidate$/, { timeout: 15_000 });

  return { displayName };
}

async function completeMatchingEssentials(
  page: import("@playwright/test").Page,
) {
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
  await expect(page).toHaveURL(/group=work_authorisation/, { timeout: 15_000 });

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
}

async function openMorningKitchenDetail(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Confirm essentials" }).click();
  await expect(page).toHaveURL(/\/candidate\/matches$/, { timeout: 15_000 });

  await page
    .getByRole("link", {
      name: `View job: ${MORNING_KITCHEN_TITLE}`,
    })
    .click();

  await expect(page).toHaveURL(
    new RegExp(`/candidate/jobs/${MORNING_KITCHEN_ID}$`),
  );
}

test.describe("Slice 3 candidate job detail journey", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("completed candidate opens Demo morning kitchen detail from matches", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    await registerAndConfirm(page, stamp);
    await completeMatchingEssentials(page);
    await openMorningKitchenDetail(page);

    await expect(
      page.getByRole("heading", { level: 1, name: MORNING_KITCHEN_TITLE }),
    ).toBeVisible();
    await expect(page.getByText("Demo vacancy").first()).toBeVisible();
    await expect(page.getByText("Demo Berlin Work Co").first()).toBeVisible();
    await expect(page.getByText("Berlin").first()).toBeVisible();
    await expect(page.getByText(/Why this matches/i)).toBeVisible();
    await expect(
      page.getByText(WORK_AUTHORISATION_NOTICE).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Application preview" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit application" }),
    ).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /apply|save|contact/i }),
    ).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(
      new RegExp(`/candidate/jobs/${MORNING_KITCHEN_ID}$`),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: MORNING_KITCHEN_TITLE }),
    ).toBeVisible();
    await expect(page.getByText("Demo Berlin Work Co").first()).toBeVisible();

    await page.getByRole("link", { name: "Back to matches" }).click();
    await expect(page).toHaveURL(/\/candidate\/matches$/);
  });

  test("completed candidate previews and submits an application", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now() + 10;
    const { displayName } = await registerAndConfirm(page, stamp);
    await completeMatchingEssentials(page);
    await openMorningKitchenDetail(page);

    await expect(
      page.getByRole("heading", { level: 2, name: "Application preview" }),
    ).toBeVisible();
    await expect(page.getByText(displayName)).toBeVisible();
    await expect(page.getByText(MORNING_KITCHEN_TITLE).first()).toBeVisible();
    await expect(page.getByText("Demo Berlin Work Co").first()).toBeVisible();
    await expect(page.getByText("Hospitality").first()).toBeVisible();
    await expect(
      page.getByText("No additional language requirements"),
    ).toBeVisible();
    await expect(page.getByText(APPLICATION_SUBMIT_DISCLOSURE)).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(page.getByText(/@example\.test/i)).toHaveCount(0);
    await expect(page.getByText(/exact address|curriculum|cv\b/i)).toHaveCount(
      0,
    );

    const submitButton = page.getByRole("button", {
      name: "Submit application",
    });
    await submitButton.click();

    await expect(page.getByText("Application submitted.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText("Your application was recorded successfully."),
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText(
      "Application submitted.",
    );
    await expect(
      page.getByRole("button", { name: "Submit application" }),
    ).toHaveCount(0);
    await expect(page).toHaveURL(
      new RegExp(`/candidate/jobs/${MORNING_KITCHEN_ID}$`),
    );
    await expect(page.getByText(/application_id|33333333/i)).toHaveCount(0);
    await expect(
      page.getByText(/employer will|response time|interview guaranteed/i),
    ).toHaveCount(0);

    // Temporary PR 3.3 boundary: reload returns to preview; persistent Applied is PR 3.4.
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Submit application" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page.getByText("Application already submitted.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText("This vacancy already has your application."),
    ).toBeVisible();
    await expect(page).not.toHaveURL(/\/candidate\/applications\//);
  });

  test("unauthenticated direct detail URL redirects to login", async ({
    page,
    context,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    await context.clearCookies();
    await page.goto(`/candidate/jobs/${MORNING_KITCHEN_ID}`);
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(page.getByText(MORNING_KITCHEN_TITLE)).toHaveCount(0);
    await expect(page.getByText("Demo Berlin Work Co")).toHaveCount(0);
  });

  test("incomplete candidate direct detail URL redirects to onboarding", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now() + 1;
    await registerAndConfirm(page, stamp);

    await page.goto(`/candidate/jobs/${MORNING_KITCHEN_ID}`);
    await expect(page).toHaveURL(/\/candidate\/onboarding/, {
      timeout: 15_000,
    });
    await expect(page.getByText(MORNING_KITCHEN_TITLE)).toHaveCount(0);
    await expect(page.getByText("Demo Berlin Work Co")).toHaveCount(0);
  });

  test("malformed and unavailable vacancies show safe unavailable state", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now() + 2;
    await registerAndConfirm(page, stamp);
    await completeMatchingEssentials(page);
    await page.getByRole("button", { name: "Confirm essentials" }).click();
    await expect(page).toHaveURL(/\/candidate\/matches$/, { timeout: 15_000 });

    await page.goto("/candidate/jobs/not-a-uuid");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "This job is not available",
      }),
    ).toBeVisible();
    await expect(page.getByText("Demo Berlin Work Co")).toHaveCount(0);

    await page.goto("/candidate/jobs/99999999-9999-4999-8999-999999999999");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "This job is not available",
      }),
    ).toBeVisible();
    await expect(page.getByText(MORNING_KITCHEN_TITLE)).toHaveCount(0);
  });
});
