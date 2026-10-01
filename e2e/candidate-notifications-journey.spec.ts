import { expect, test } from "@playwright/test";
import {
  publishEligibleEmployerVacancy,
  registerAndApplyAsCandidate,
  transitionApplicationStatusAsEmployer,
} from "./helpers/candidate-application-status-fixture";

test.describe("Candidate Notifications v2", () => {
  test.skip(
    process.env.E2E_AUTH_JOURNEY !== "1",
    "Requires local Supabase + Mailpit",
  );
  test("status updates are discoverable on desktop/mobile, open the owned detail, and retain read history", async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toMatch(
      /127\.0\.0\.1|localhost/,
    );
    const stamp = Date.now();
    const vacancy = await publishEligibleEmployerVacancy(page, stamp);
    const context = await browser.newContext();
    try {
      const candidate = await context.newPage();
      const application = await registerAndApplyAsCandidate(
        candidate,
        stamp,
        vacancy.vacancyId,
      );
      const id = application.applicationUrl.split("/").at(-1);
      await candidate.goto("/candidate/notifications");
      await expect(candidate.getByText("You’re all caught up")).toBeVisible();
      await page.goto(`/employer/applications/${id}`);
      await transitionApplicationStatusAsEmployer(page, "reviewing");
      await candidate.reload();
      await expect(candidate.getByText("You’re all caught up")).toBeVisible();
      await transitionApplicationStatusAsEmployer(page, "shortlisted");
      await candidate.goto("/candidate/profile");
      await expect(
        candidate.getByRole("link", { name: "Notifications 1 Unread" }),
      ).toBeVisible();
      await expect(
        candidate
          .getByRole("navigation", { name: "Candidate" })
          .getByRole("link"),
      ).toHaveCount(4);
      await candidate
        .getByRole("link", { name: "Notifications 1 Unread" })
        .click();
      await expect(
        candidate.getByText("Application shortlisted", { exact: true }),
      ).toBeVisible();
      await transitionApplicationStatusAsEmployer(page, "accepted");
      await candidate.reload();
      await expect(
        candidate.getByText(/Accepted is not the same as hired/),
      ).toBeVisible();
      for (const width of [1280, 390, 320]) {
        await candidate.setViewportSize({ width, height: 844 });
        await expect(
          candidate.getByRole("link", { name: "Notifications 2 Unread" }),
        ).toBeVisible();
        expect(
          await candidate.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
        ).toBe(false);
      }
      await candidate
        .getByRole("button", { name: /Application accepted:/ })
        .click();
      await expect(candidate).toHaveURL(
        new RegExp(`/candidate/applications/${id}$`),
      );
      await candidate.goto("/candidate/notifications");
      await expect(
        candidate.getByRole("button", { name: /Application accepted:.*Read/ }),
      ).toBeVisible();
      await candidate.getByRole("button", { name: "Mark all as read" }).click();
      await expect(
        candidate.getByRole("button", { name: "Mark all as read" }),
      ).toBeDisabled();
      await expect(
        candidate.getByText("Application shortlisted", { exact: true }),
      ).toBeVisible();
      await candidate.evaluate(() =>
        localStorage.setItem("klinnova-locale", "de"),
      );
      await candidate.reload();
      await expect(
        candidate.getByRole("heading", {
          name: "Benachrichtigungen",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        candidate.getByText(/Angenommen bedeutet noch nicht eingestellt/),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
