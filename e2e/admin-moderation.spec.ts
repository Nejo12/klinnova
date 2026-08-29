import { expect, test, type Page, type Response } from "@playwright/test";

import { registerAndConfirm } from "./helpers/auth";
import {
  getLocalUserIdByEmail,
  provisionLocalVerificationOperator,
} from "./helpers/local-operator-proof";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

function waitForVacancyEditPost(page: Page): Promise<Response> {
  return page.waitForResponse(
    (candidate) =>
      candidate.url().includes("/edit") &&
      candidate.request().method() === "POST",
  );
}

async function saveVacancyEditFormAndReload(
  page: Page,
  buttonName: "Save draft" | "Save languages",
): Promise<void> {
  const [response] = await Promise.all([
    waitForVacancyEditPost(page),
    page.getByRole("button", { name: buttonName }).click(),
  ]);
  expect(response.status()).toBe(200);
  await page.reload();
}

async function onboardPrivateEmployer(
  page: Page,
  options: {
    email: string;
    password: string;
    displayName: string;
  },
) {
  await registerAndConfirm(page, {
    email: options.email,
    password: options.password,
    displayName: options.displayName,
    registerPath: "/employer/register",
    expectedPath: /\/employer\/onboarding$/,
  });

  await page.getByRole("radio", { name: /Private person/i }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Display name").fill(options.displayName);
  await page.getByLabel("Berlin locality").fill("Mitte");
  await page
    .getByRole("checkbox", { name: /allowed to work in Germany/i })
    .check();
  await page.getByRole("button", { name: "Complete onboarding" }).click();
  await expect(page).toHaveURL(/\/employer$/, { timeout: 15_000 });
}

async function createAndReadyVacancy(
  page: Page,
  title: string,
): Promise<string> {
  await page.goto("/employer/vacancies/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Job category").selectOption("cleaning");
  await page.getByLabel("Berlin public locality").fill("Mitte");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/employer\/vacancies\/.+\/edit$/, {
    timeout: 15_000,
  });
  const vacancyId = page
    .url()
    .match(/\/employer\/vacancies\/([^/]+)\/edit/)?.[1];
  expect(vacancyId).toBeTruthy();
  if (vacancyId === undefined) {
    throw new Error("vacancy id not found in URL");
  }

  await page.getByLabel("Description").fill("Evening kitchen clean, 2 hours.");
  await page.getByLabel("Workplace type").selectOption("private_home");
  await page.getByLabel("Work frequency").selectOption("recurring");
  await page.getByRole("checkbox", { name: "CV required" }).check();
  await page
    .getByRole("checkbox", { name: "Interview can be in English" })
    .check();
  await page.getByRole("checkbox", { name: "Full time" }).check();
  await page.getByRole("checkbox", { name: "Evening" }).check();
  await page.getByLabel("Amount in EUR").fill("18.00");
  await page.getByLabel("Period").selectOption("hourly");
  await saveVacancyEditFormAndReload(page, "Save draft");

  await page.getByRole("button", { name: "Add language" }).click();
  await page.getByLabel(/Language 1/i).selectOption("en");
  await page.getByLabel(/Minimum proficiency 1/i).selectOption("basic");
  await saveVacancyEditFormAndReload(page, "Save languages");

  return vacancyId;
}

async function requestVerification(page: Page) {
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
}

async function approveEmployerVerification(
  operatorPage: Page,
  employerId: string,
  employerDisplayName: string,
) {
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
}

async function publishVacancy(page: Page, vacancyId: string) {
  await page.goto(`/employer/vacancies/${vacancyId}`);
  const vacancyPath = `/employer/vacancies/${vacancyId}`;
  await page
    .getByRole("checkbox", {
      name: /Publishing may make this vacancy publicly visible/i,
    })
    .check();
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) =>
        new URL(candidate.url()).pathname === vacancyPath &&
        candidate.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Publish" }).click(),
  ]);
  expect(response.status()).toBeLessThan(400);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Status" }).getByRole("status"),
  ).toHaveText("Published", { timeout: 15_000 });
}

async function completeCandidateMatchingEssentials(page: Page) {
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

  await page.getByRole("checkbox", { name: "Cleaning" }).check();
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
}

test.describe("admin moderation: employer suspension journey", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("operator suspends an employer, hiding their vacancy and restricting employer surfaces, then unsuspends and restores access", async ({
    page,
    browser,
  }) => {
    test.setTimeout(150_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const employerDisplayName = `Moderation Emp ${stamp}`;
    const employerEmail = `moderation.employer.${stamp}@example.test`;
    const employerPassword = `TestPass-${stamp}!`;
    const title = `Evening clean ${stamp}`;

    // --- Employer: onboard, ready a vacancy, request verification ---
    await onboardPrivateEmployer(page, {
      email: employerEmail,
      password: employerPassword,
      displayName: employerDisplayName,
    });
    const vacancyId = await createAndReadyVacancy(page, title);
    await requestVerification(page);

    const employerId = await getLocalUserIdByEmail(employerEmail);

    // --- Operator: separate session, approves verification ---
    const operatorContext = await browser.newContext();
    const operatorPage = await operatorContext.newPage();
    const operatorEmail = `moderation.operator.${stamp}@example.test`;
    await registerAndConfirm(operatorPage, {
      email: operatorEmail,
      password: `TestPass-${stamp}!`,
      displayName: `Moderation Op ${stamp}`,
    });
    const operatorId = await getLocalUserIdByEmail(operatorEmail);
    await provisionLocalVerificationOperator(operatorId);
    await approveEmployerVerification(
      operatorPage,
      employerId,
      employerDisplayName,
    );

    // --- Employer: publish ---
    await publishVacancy(page, vacancyId);

    // --- Anonymous: vacancy is publicly discoverable ---
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();
    await anonPage.goto("/jobs");
    await expect(
      anonPage.getByRole("heading", { name: title, level: 2 }),
    ).toBeVisible({ timeout: 15_000 });

    // --- Candidate: a completed candidate can view the vacancy directly ---
    const candidateContext = await browser.newContext();
    const candidatePage = await candidateContext.newPage();
    await registerAndConfirm(candidatePage, {
      email: `moderation.candidate.${stamp}@example.test`,
      password: `TestPass-${stamp}!`,
      displayName: `Moderation Cand ${stamp}`,
    });
    await completeCandidateMatchingEssentials(candidatePage);
    await candidatePage.goto(`/candidate/jobs/${vacancyId}`);
    await expect(
      candidatePage.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible({ timeout: 15_000 });

    // --- Operator: find the employer in the moderation list and open detail ---
    await operatorPage.goto("/internal/employers");
    await expect(
      operatorPage.getByRole("heading", { name: "Employers" }),
    ).toBeVisible();
    await operatorPage
      .getByRole("row", { name: new RegExp(employerDisplayName) })
      .getByRole("link", { name: /View/ })
      .click();
    await expect(operatorPage).toHaveURL(
      new RegExp(`/internal/employers/${employerId}$`),
    );
    await expect(
      operatorPage.getByRole("heading", {
        level: 1,
        name: employerDisplayName,
      }),
    ).toBeVisible();
    await expect(
      operatorPage.getByRole("row", { name: new RegExp(title) }),
    ).toBeVisible();

    // --- Operator: suspend with a reason ---
    const suspendReason = "Repeated policy violations reported by candidates.";
    await operatorPage.getByLabel("Suspension reason").fill(suspendReason);
    await operatorPage
      .getByRole("checkbox", {
        name: /I confirm this employer should be suspended/i,
      })
      .check();
    await operatorPage
      .getByRole("button", { name: "Suspend employer" })
      .click();
    await expect(operatorPage.getByText("Suspended").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(operatorPage.getByText(suspendReason).first()).toBeVisible();
    await expect(operatorPage.getByText("Employer suspended")).toBeVisible();

    // No actor identity anywhere on the detail page.
    const suspendedDetailText = await operatorPage.locator("main").innerText();
    expect(suspendedDetailText).not.toContain(operatorId);
    expect(suspendedDetailText.toLowerCase()).not.toContain("actor");

    // --- Employer: neutral restricted state on applications ---
    await page.goto("/employer/applications");
    await expect(
      page.getByRole("heading", { level: 1, name: "Applications" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Applications are unavailable while your employer account is restricted.",
      ),
    ).toBeVisible();

    // --- Employer: vacancy still viewable, mutation controls hidden ---
    await page.goto(`/employer/vacancies/${vacancyId}`);
    await expect(
      page.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "This action is unavailable while your employer account is restricted.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Pause" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Edit vacancy" })).toHaveCount(
      0,
    );

    // --- Anonymous: vacancy no longer discoverable ---
    await anonPage.goto("/jobs");
    await expect(
      anonPage.getByRole("heading", { name: title, level: 2 }),
    ).toHaveCount(0);
    const suspendedDetailResponse = await anonPage.goto(`/jobs/${vacancyId}`);
    expect(suspendedDetailResponse?.status()).toBe(404);

    // --- Candidate: vacancy no longer accessible ---
    await candidatePage.goto(`/candidate/jobs/${vacancyId}`);
    await expect(
      candidatePage.getByRole("heading", {
        level: 1,
        name: "This job is not available",
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      candidatePage.getByRole("button", { name: "Apply with profile" }),
    ).toHaveCount(0);

    // --- Operator: unsuspend ---
    await operatorPage
      .getByRole("checkbox", {
        name: /I confirm this employer's suspension should be lifted/i,
      })
      .check();
    await operatorPage
      .getByRole("button", { name: "Unsuspend employer" })
      .click();
    await expect(operatorPage.getByText("Not suspended")).toBeVisible({
      timeout: 15_000,
    });
    await expect(operatorPage.getByText("Employer unsuspended")).toBeVisible();

    const unsuspendedDetailText = await operatorPage
      .locator("main")
      .innerText();
    expect(unsuspendedDetailText).not.toContain(operatorId);

    // --- Anonymous: visibility returns because the vacancy still qualifies ---
    await anonPage.goto("/jobs");
    await expect(
      anonPage.getByRole("heading", { name: title, level: 2 }),
    ).toBeVisible({ timeout: 15_000 });

    // --- Employer: applications surface returns to normal ---
    await page.goto("/employer/applications");
    await expect(
      page.getByText(
        "Applications are unavailable while your employer account is restricted.",
      ),
    ).toHaveCount(0);
    await expect(
      page.getByText(
        "Review applicants for your vacancies and update their status.",
      ),
    ).toBeVisible();

    await anonContext.close();
    await candidateContext.close();
    await operatorContext.close();
  });
});

test.describe("admin moderation: vacancy moderation journey", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("operator moderates a single vacancy without affecting its sibling, then restores it", async ({
    page,
    browser,
  }) => {
    test.setTimeout(150_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();
    const employerDisplayName = `Vacancy Mod Emp ${stamp}`;
    const employerEmail = `vacancy.moderation.employer.${stamp}@example.test`;
    const employerPassword = `TestPass-${stamp}!`;
    const primaryTitle = `Evening clean ${stamp}`;
    const siblingTitle = `Morning clean ${stamp}`;

    // --- Employer: onboard, ready two vacancies, request verification ---
    await onboardPrivateEmployer(page, {
      email: employerEmail,
      password: employerPassword,
      displayName: employerDisplayName,
    });
    const primaryVacancyId = await createAndReadyVacancy(page, primaryTitle);
    const siblingVacancyId = await createAndReadyVacancy(page, siblingTitle);
    await requestVerification(page);

    const employerId = await getLocalUserIdByEmail(employerEmail);

    // --- Operator: approves verification ---
    const operatorContext = await browser.newContext();
    const operatorPage = await operatorContext.newPage();
    const operatorEmail = `vacancy.moderation.operator.${stamp}@example.test`;
    await registerAndConfirm(operatorPage, {
      email: operatorEmail,
      password: `TestPass-${stamp}!`,
      displayName: `Vacancy Mod Op ${stamp}`,
    });
    const operatorId = await getLocalUserIdByEmail(operatorEmail);
    await provisionLocalVerificationOperator(operatorId);
    await approveEmployerVerification(
      operatorPage,
      employerId,
      employerDisplayName,
    );

    // --- Employer: publish both vacancies ---
    await publishVacancy(page, primaryVacancyId);
    await publishVacancy(page, siblingVacancyId);

    // --- Anonymous: both discoverable ---
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();
    await anonPage.goto("/jobs");
    await expect(
      anonPage.getByRole("heading", { name: primaryTitle, level: 2 }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      anonPage.getByRole("heading", { name: siblingTitle, level: 2 }),
    ).toBeVisible();

    // --- Operator: open the primary vacancy's moderation detail ---
    await operatorPage.goto(`/internal/employers/${employerId}`);
    await operatorPage
      .getByRole("row", { name: new RegExp(primaryTitle) })
      .getByRole("link", { name: /View/ })
      .click();
    await expect(operatorPage).toHaveURL(
      new RegExp(
        `/internal/employers/${employerId}/vacancies/${primaryVacancyId}$`,
      ),
    );
    await expect(
      operatorPage.getByRole("heading", { level: 1, name: primaryTitle }),
    ).toBeVisible();

    // --- Operator: moderate with a reason ---
    const moderateReason = "Misleading pay information reported by candidates.";
    await operatorPage.getByLabel("Moderation reason").fill(moderateReason);
    await operatorPage
      .getByRole("checkbox", {
        name: /I confirm this vacancy should be moderated/i,
      })
      .check();
    await operatorPage
      .getByRole("button", { name: "Moderate vacancy" })
      .click();
    await expect(operatorPage.getByText("Moderated").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(operatorPage.getByText(moderateReason).first()).toBeVisible();
    await expect(operatorPage.getByText("Vacancy moderated")).toBeVisible();

    const moderatedDetailText = await operatorPage.locator("main").innerText();
    expect(moderatedDetailText).not.toContain(operatorId);
    expect(moderatedDetailText.toLowerCase()).not.toContain("actor");

    // --- Anonymous: only the moderated vacancy disappears ---
    await anonPage.goto("/jobs");
    await expect(
      anonPage.getByRole("heading", { name: primaryTitle, level: 2 }),
    ).toHaveCount(0);
    await expect(
      anonPage.getByRole("heading", { name: siblingTitle, level: 2 }),
    ).toBeVisible();
    const moderatedDetailResponse = await anonPage.goto(
      `/jobs/${primaryVacancyId}`,
    );
    expect(moderatedDetailResponse?.status()).toBe(404);
    const siblingDetailResponse = await anonPage.goto(
      `/jobs/${siblingVacancyId}`,
    );
    expect(siblingDetailResponse?.status()).toBe(200);

    // --- Operator: restore ---
    await operatorPage
      .getByRole("checkbox", {
        name: /I confirm this vacancy's moderation hold should be removed/i,
      })
      .check();
    await operatorPage.getByRole("button", { name: "Restore vacancy" }).click();
    await expect(operatorPage.getByText("Not moderated")).toBeVisible({
      timeout: 15_000,
    });
    await expect(operatorPage.getByText("Vacancy restored")).toBeVisible();

    // --- Anonymous: visibility returns because the vacancy still qualifies ---
    await anonPage.goto("/jobs");
    await expect(
      anonPage.getByRole("heading", { name: primaryTitle, level: 2 }),
    ).toBeVisible({ timeout: 15_000 });

    await anonContext.close();
    await operatorContext.close();
  });
});

test.describe("internal employer moderation route authorization", () => {
  test("unauthenticated employers route redirects with safe next", async ({
    page,
  }) => {
    await page.goto("/internal/employers");
    await expect(page).toHaveURL(/\/login\?next=%2Finternal%2Femployers$/, {
      timeout: 15_000,
    });
  });
});

test.describe("internal employer moderation non-operator authorization", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("authenticated non-operator sees a generic unavailable page, not the employer list", async ({
    page,
  }) => {
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);
    const stamp = Date.now();

    await registerAndConfirm(page, {
      email: `admin.moderation.plain.${stamp}@example.test`,
      password: `TestPass-${stamp}!`,
      displayName: `Plain User ${stamp}`,
    });

    await page.goto("/internal/employers");
    await expect(
      page.getByRole("heading", { name: /Not available/i }),
    ).toBeVisible();
  });
});
