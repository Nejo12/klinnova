import { expect, test } from "@playwright/test";

import {
  countOwnedApplicationsForVacancy,
  createLocalUserClient,
  loadOwnedApplicationIdsForVacancy,
  signInLocalUser,
  submitDuplicateApplicationRpc,
  withLocalPostgres,
} from "./helpers/local-application-proof";
import {
  extractConfirmNavigationTarget,
  waitForMailpitMessage,
} from "./helpers/mailpit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

const WORK_AUTHORISATION_NOTICE =
  "Matches are shown using the work-authorisation declaration you provided during onboarding. Klinnova has not verified documents.";

const APPLICATION_SUBMIT_DISCLOSURE =
  "By submitting, the profile information shown here will be stored with your application and made available to a future employer review workflow.";

const MORNING_KITCHEN_ID = "22222222-2222-4222-8222-222222222201";
const MORNING_KITCHEN_TITLE = "Demo vacancy — Morning kitchen support";
const WITHDRAWN_VACANCY_ID = "22222222-2222-4222-8222-222222222210";
const UUID_IN_TEXT =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

async function registerAndConfirm(
  page: import("@playwright/test").Page,
  stamp: number,
  label: string,
) {
  const email = `slice3.critical.${label}.${stamp}@example.test`;
  const password = `TestPass-${stamp}!`;
  const displayName = `Slice3 Critical ${label} ${stamp}`;

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

  return { email, password, displayName };
}

async function completeMatchingEssentials(
  page: import("@playwright/test").Page,
  options?: { category?: "Hospitality" | "Cleaning" },
) {
  const category = options?.category ?? "Hospitality";

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

  await page.getByRole("checkbox", { name: category }).check();
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

async function expectNoUuidInMain(page: import("@playwright/test").Page) {
  const bodyText = await page.locator("main").innerText();
  expect(bodyText).not.toMatch(UUID_IN_TEXT);
}

test.describe("Slice 3 critical exit journey", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("complete apply journey: submit, confirm, Applied, duplicate, single row", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    expect(publishableKey.length).toBeGreaterThan(0);

    const stamp = Date.now();
    const { email, password, displayName } = await registerAndConfirm(
      page,
      stamp,
      "main",
    );
    await completeMatchingEssentials(page);
    await page.getByRole("button", { name: "Confirm essentials" }).click();
    await expect(page).toHaveURL(/\/candidate\/matches$/, { timeout: 15_000 });

    await expect(page.getByText(/Demo vacancy/i).first()).toBeVisible();
    await expect(page.getByText(WORK_AUTHORISATION_NOTICE)).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: `View job: ${MORNING_KITCHEN_TITLE}`,
      }),
    ).toBeVisible();

    await page.goto(`/candidate/jobs/${MORNING_KITCHEN_ID}`);
    await expect(page).toHaveURL(
      new RegExp(`/candidate/jobs/${MORNING_KITCHEN_ID}$`),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: MORNING_KITCHEN_TITLE }),
    ).toBeVisible();
    await expect(page.getByText("Demo Berlin Work Co").first()).toBeVisible();
    await expect(page.getByText("Berlin").first()).toBeVisible();
    await expect(
      page.getByText(WORK_AUTHORISATION_NOTICE).first(),
    ).toBeVisible();
    await expect(page.getByText(APPLICATION_SUBMIT_DISCLOSURE)).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(
      page.getByText(/employer will respond|interview|job guarantee/i),
    ).toHaveCount(0);
    await expectNoUuidInMain(page);

    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page).toHaveURL(/\/candidate\/applications\/[0-9a-f-]{36}$/, {
      timeout: 15_000,
    });
    const confirmationUrl = page.url();
    const applicationId = confirmationUrl.split("/").pop() ?? "";
    expect(applicationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    await expect(
      page.getByRole("heading", { level: 1, name: "Application submitted" }),
    ).toBeVisible();
    await expect(
      page.getByText("Your application was recorded successfully."),
    ).toBeVisible();
    await expect(page.getByText("Submitted").first()).toBeVisible();
    await expect(page.getByText("Demo Berlin Work Co").first()).toBeVisible();
    await expect(page.getByText(MORNING_KITCHEN_TITLE).first()).toBeVisible();
    await expect(page.getByText(displayName)).toBeVisible();
    await expect(page.getByText(/Demo vacancy/i).first()).toBeVisible();
    await expect(page.getByText("Berlin").first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Back to matches" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "View job" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Withdraw|Submit again|Edit/i }),
    ).toHaveCount(0);
    await expect(
      page.getByText(/employer will respond|response time|job guarantee/i),
    ).toHaveCount(0);
    await expectNoUuidInMain(page);

    await page.reload();
    await expect(page).toHaveURL(confirmationUrl);
    await expect(
      page.getByRole("heading", { level: 1, name: "Application submitted" }),
    ).toBeVisible();
    await expect(page.getByText(displayName)).toBeVisible();

    await page.goto(`/candidate/jobs/${MORNING_KITCHEN_ID}`);
    await expect(page.getByText("Applied").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit application" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", {
        name: `View application: ${MORNING_KITCHEN_TITLE}`,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(WORK_AUTHORISATION_NOTICE).first(),
    ).toBeVisible();

    await page.goto("/candidate/matches");
    await expect(page.getByText("Applied").first()).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: `View application: ${MORNING_KITCHEN_TITLE}`,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: `View job: ${MORNING_KITCHEN_TITLE}`,
      }),
    ).toBeVisible();

    const client = createLocalUserClient(supabaseUrl, publishableKey);
    await signInLocalUser(client, email, password);
    const beforeCount = await countOwnedApplicationsForVacancy(
      client,
      MORNING_KITCHEN_ID,
    );
    expect(beforeCount).toBe(1);

    const duplicate = await submitDuplicateApplicationRpc(
      client,
      MORNING_KITCHEN_ID,
    );
    expect(duplicate.result).toBe("already_applied");
    expect(duplicate.application_id).toBe(applicationId);

    const afterCount = await countOwnedApplicationsForVacancy(
      client,
      MORNING_KITCHEN_ID,
    );
    expect(afterCount).toBe(1);
    const ids = await loadOwnedApplicationIdsForVacancy(
      client,
      MORNING_KITCHEN_ID,
    );
    expect(ids).toEqual([applicationId]);

    await page.goto(`/candidate/applications/${duplicate.application_id}`);
    await expect(page).toHaveURL(confirmationUrl);
    await expect(
      page.getByRole("heading", { level: 1, name: "Application submitted" }),
    ).toBeVisible();
  });

  test("historical confirmation stays snapshot-stable after profile and vacancy edits", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    expect(publishableKey.length).toBeGreaterThan(0);

    const stamp = Date.now() + 1;
    const { email, password, displayName } = await registerAndConfirm(
      page,
      stamp,
      "hist",
    );
    await completeMatchingEssentials(page);
    await page.getByRole("button", { name: "Confirm essentials" }).click();
    await expect(page).toHaveURL(/\/candidate\/matches$/, { timeout: 15_000 });

    await page.goto(`/candidate/jobs/${MORNING_KITCHEN_ID}`);
    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page).toHaveURL(/\/candidate\/applications\/[0-9a-f-]{36}$/, {
      timeout: 15_000,
    });
    const confirmationUrl = page.url();

    await expect(page.getByText(displayName)).toBeVisible();
    await expect(page.getByText(MORNING_KITCHEN_TITLE).first()).toBeVisible();
    await expect(page.getByText("Demo Berlin Work Co").first()).toBeVisible();

    const client = createLocalUserClient(supabaseUrl, publishableKey);
    const userId = await signInLocalUser(client, email, password);
    const changedName = `Changed Snapshot ${stamp}`;
    const { error: profileError } = await client
      .from("candidate_profiles")
      .update({ display_name: changedName })
      .eq("id", userId);
    expect(profileError).toBeNull();

    const mutatedTitle = `Mutated Demo Title ${stamp}`;
    const originalTitle = MORNING_KITCHEN_TITLE;
    const originalCompany = "Demo Berlin Work Co";
    const mutatedCompany = `Mutated Demo Co ${stamp}`;

    await withLocalPostgres(async (pg) => {
      await pg.query(`update public.vacancies set title = $1 where id = $2`, [
        mutatedTitle,
        MORNING_KITCHEN_ID,
      ]);
      await pg.query(`update public.companies set name = $1 where id = $2`, [
        mutatedCompany,
        "11111111-1111-4111-8111-111111111111",
      ]);
    });

    try {
      await page.goto(confirmationUrl);
      await expect(
        page.getByRole("heading", { level: 1, name: "Application submitted" }),
      ).toBeVisible();
      await expect(page.getByText(displayName)).toBeVisible();
      await expect(page.getByText(changedName)).toHaveCount(0);
      await expect(page.getByText(originalTitle).first()).toBeVisible();
      await expect(page.getByText(mutatedTitle)).toHaveCount(0);
      await expect(page.getByText(originalCompany).first()).toBeVisible();
      await expect(page.getByText(mutatedCompany)).toHaveCount(0);

      // Clear completion via essential invalidation; owned confirmation remains.
      await page.goto("/candidate/onboarding?group=work_authorisation");
      await page.getByRole("radio", { name: "Not sure" }).check();
      await page.getByRole("button", { name: "Save and continue" }).click();
      await expect(page).toHaveURL(/group=location/, { timeout: 15_000 });

      await page.goto("/candidate/matches");
      await expect(page).toHaveURL(/\/candidate\/onboarding/, {
        timeout: 15_000,
      });

      await page.goto(confirmationUrl);
      await expect(
        page.getByRole("heading", { level: 1, name: "Application submitted" }),
      ).toBeVisible();
      await expect(page.getByText(displayName)).toBeVisible();
      await expect(page.getByText(originalTitle).first()).toBeVisible();
    } finally {
      await withLocalPostgres(async (pg) => {
        await pg.query(`update public.vacancies set title = $1 where id = $2`, [
          originalTitle,
          MORNING_KITCHEN_ID,
        ]);
        await pg.query(`update public.companies set name = $1 where id = $2`, [
          originalCompany,
          "11111111-1111-4111-8111-111111111111",
        ]);
      });
    }
  });

  test("authorization, lifecycle, and matcher denials stay safe", async ({
    page,
    context,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    expect(publishableKey.length).toBeGreaterThan(0);

    const stamp = Date.now() + 2;

    await context.clearCookies();
    await page.goto(
      "/candidate/applications/33333333-3333-4333-8333-333333333301",
    );
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(page.getByText("Application submitted")).toHaveCount(0);

    await page.goto(`/candidate/jobs/${MORNING_KITCHEN_ID}`);
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(page.getByText(MORNING_KITCHEN_TITLE)).toHaveCount(0);

    const owner = await registerAndConfirm(page, stamp, "owner");
    await completeMatchingEssentials(page);
    await page.getByRole("button", { name: "Confirm essentials" }).click();
    await expect(page).toHaveURL(/\/candidate\/matches$/, { timeout: 15_000 });

    await page.goto(`/candidate/jobs/${MORNING_KITCHEN_ID}`);
    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page).toHaveURL(/\/candidate\/applications\/[0-9a-f-]{36}$/, {
      timeout: 15_000,
    });
    const ownerConfirmationUrl = page.url();

    await page.goto("/candidate/applications/not-a-uuid");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Application not available",
      }),
    ).toBeVisible();
    await expect(page.getByText(owner.displayName)).toHaveCount(0);

    await page.goto(`/candidate/jobs/${WITHDRAWN_VACANCY_ID}`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "This job is not available",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit application" }),
    ).toHaveCount(0);

    await context.clearCookies();
    const stranger = await registerAndConfirm(page, stamp + 3, "stranger");
    await completeMatchingEssentials(page);
    await page.getByRole("button", { name: "Confirm essentials" }).click();
    await expect(page).toHaveURL(/\/candidate\/matches$/, { timeout: 15_000 });

    await page.goto(ownerConfirmationUrl);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Application not available",
      }),
    ).toBeVisible();
    await expect(page.getByText(owner.displayName)).toHaveCount(0);
    await expect(page.getByText("Application submitted")).toHaveCount(0);
    await expectNoUuidInMain(page);

    // Incomplete candidate cannot open current-state submission surfaces.
    await context.clearCookies();
    await registerAndConfirm(page, stamp + 4, "incomplete");
    await page.goto(`/candidate/jobs/${MORNING_KITCHEN_ID}`);
    await expect(page).toHaveURL(/\/candidate\/onboarding/, {
      timeout: 15_000,
    });
    await expect(
      page.getByRole("button", { name: "Submit application" }),
    ).toHaveCount(0);

    // Ineligible completed candidate does not see morning kitchen in the
    // eligible-only matches list, but can still open its detail page and
    // sees the vacancy plus its missing requirements instead of a hidden
    // "no longer matches" state (canonical eligibility contract, PR 5.5d).
    await context.clearCookies();
    await registerAndConfirm(page, stamp + 5, "nomatch");
    await completeMatchingEssentials(page, { category: "Cleaning" });
    await page.getByRole("button", { name: "Confirm essentials" }).click();
    await expect(page).toHaveURL(/\/candidate\/matches$/, { timeout: 15_000 });
    await expect(
      page.getByRole("link", {
        name: `View job: ${MORNING_KITCHEN_TITLE}`,
      }),
    ).toHaveCount(0);

    await page.goto(`/candidate/jobs/${MORNING_KITCHEN_ID}`);
    await expect(
      page.getByRole("heading", { level: 1, name: MORNING_KITCHEN_TITLE }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /you don.t currently meet these requirements/i,
      }),
    ).toBeVisible();
    await expect(page.getByText("Preferred job category")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit application" }),
    ).toHaveCount(0);
    await expect(page.getByText(stranger.displayName)).toHaveCount(0);
  });
});
