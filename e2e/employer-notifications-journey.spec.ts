import { expect, test } from "@playwright/test";

import {
  publishEligibleEmployerVacancy,
  registerAndApplyAsCandidate,
} from "./helpers/candidate-application-status-fixture";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const runAuthJourney = process.env.E2E_AUTH_JOURNEY === "1";

test.describe("Employer Notifications v1", () => {
  test.skip(
    !runAuthJourney,
    "Set E2E_AUTH_JOURNEY=1 with local Supabase URL/key to run this journey",
  );

  test("a new application appears unread, opens its detail, and stays read on mobile", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/);

    const stamp = Date.now();
    const vacancy = await publishEligibleEmployerVacancy(page, stamp);
    const vacancyTitle = `Morning host role ${stamp}`;

    const candidateContext = await page.context().browser()?.newContext();
    if (candidateContext === undefined) {
      throw new Error("could not open a candidate browser context");
    }
    const candidatePage = await candidateContext.newPage();
    const application = await registerAndApplyAsCandidate(
      candidatePage,
      stamp,
      vacancy.vacancyId,
    );
    const applicationId = application.applicationUrl.match(
      /\/candidate\/applications\/([0-9a-f-]{36})$/,
    )?.[1];
    if (applicationId === undefined) {
      throw new Error("could not parse submitted application id");
    }
    await candidateContext.close();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/employer/notifications");

    await expect(
      page.getByRole("heading", { level: 1, name: "Notifications" }),
    ).toBeVisible();
    await expect(page.getByText(vacancyTitle, { exact: true })).toBeVisible();
    await expect(page.getByText("Unread", { exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false);

    await page
      .getByRole("button", { name: `Open application for ${vacancyTitle}` })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/employer/applications/${applicationId}$`),
      { timeout: 15_000 },
    );

    await page.goto("/employer/notifications");
    await expect(page.getByText("Read", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Mark all as read" }),
    ).toBeDisabled();
  });
});
