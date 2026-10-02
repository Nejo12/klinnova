import { expect, test, type Page } from "@playwright/test";
import {
  publishEligibleEmployerVacancy,
  registerAndApplyAsCandidate,
  transitionApplicationStatusAsEmployer,
} from "./helpers/candidate-application-status-fixture";

async function checkPreferenceLayouts(
  page: Page,
  role: "Candidate" | "Employer",
) {
  for (const locale of ["en", "de"]) {
    await page.evaluate(
      (locale) => localStorage.setItem("klinnova-locale", locale),
      locale,
    );
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      locale === "en"
        ? `${role} notification preferences`
        : role === "Candidate"
          ? "Benachrichtigungseinstellungen für Bewerbende"
          : "Benachrichtigungseinstellungen für Arbeitgeber",
    );
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(
        page.getByRole("switch", {
          name: locale === "en" ? "Email" : "E-Mail",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByText(locale === "en" ? "Coming later" : "Kommt später"),
      ).toBeVisible();
      await expect(page.getByRole("switch", { name: "Push" })).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      if (role === "Candidate") {
        await expect(
          page
            .getByRole("navigation", {
              name: locale === "en" ? "Candidate" : "Bewerbendenbereich",
              exact: true,
            })
            .getByRole("link"),
        ).toHaveCount(4);
      }
    }
  }
  await page.evaluate(() => localStorage.setItem("klinnova-locale", "en"));
  await page.reload();
}

test.describe("Notification preferences v1", () => {
  test.skip(
    process.env.E2E_AUTH_JOURNEY !== "1",
    "Requires local Supabase + Mailpit",
  );
  test("Email overrides survive reload and never suppress durable notification history", async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toMatch(
      /127\.0\.0\.1|localhost/,
    );
    const stamp = Date.now();
    const vacancy = await publishEligibleEmployerVacancy(page, stamp);
    await page.goto("/employer/account");
    await page
      .getByRole("link", { name: "Notification preferences", exact: true })
      .click();
    await expect(
      page.getByRole("switch", { name: "Email", exact: true }),
    ).toBeChecked();
    await checkPreferenceLayouts(page, "Employer");
    await page.getByRole("switch", { name: "Email", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Saved");
    await page.reload();
    await expect(
      page.getByRole("switch", { name: "Email", exact: true }),
    ).not.toBeChecked();
    const context = await browser.newContext();
    try {
      const candidate = await context.newPage();
      const application = await registerAndApplyAsCandidate(
        candidate,
        stamp,
        vacancy.vacancyId,
      );
      const id = application.applicationUrl.split("/").at(-1);
      await page.goto("/employer/notifications");
      await expect(
        page.getByText(`Morning host role ${stamp}`, { exact: true }),
      ).toBeVisible();
      await candidate.goto("/candidate/account");
      await candidate
        .getByRole("link", { name: "Notification preferences", exact: true })
        .click();
      await expect(
        candidate.getByRole("switch", { name: "Email", exact: true }),
      ).toBeChecked();
      await checkPreferenceLayouts(candidate, "Candidate");
      await candidate
        .getByRole("switch", { name: "Email", exact: true })
        .click();
      await expect(candidate.getByRole("status")).toHaveText("Saved");
      await candidate.reload();
      await expect(
        candidate.getByRole("switch", { name: "Email", exact: true }),
      ).not.toBeChecked();
      await page.goto(`/employer/applications/${id}`);
      await transitionApplicationStatusAsEmployer(page, "shortlisted");
      await candidate.goto("/candidate/notifications");
      await expect(
        candidate.getByText("Application shortlisted", { exact: true }),
      ).toBeVisible();
      await candidate.goto("/candidate/account/notifications");
      await candidate
        .getByRole("switch", { name: "Email", exact: true })
        .click();
      await expect(candidate.getByRole("status")).toHaveText("Saved");
      await candidate.reload();
      await expect(
        candidate.getByRole("switch", { name: "Email", exact: true }),
      ).toBeChecked();
      await candidate.goto("/candidate/notifications");
      await expect(
        candidate.getByText("Application shortlisted", { exact: true }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
