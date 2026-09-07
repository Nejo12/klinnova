import { expect, test } from "@playwright/test";

test("public homepage renders the complete English section set", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Jobs that match your situation. In Berlin.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Made for how Berlin works" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "You never wonder where it went" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Open in Berlin right now" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Reach people who can start" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Working now, in Berlin first" }),
  ).toBeVisible();
});

test("public homepage renders German without horizontal overflow on mobile", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("klinnova-locale", "de");
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Jobs, die zu deiner Situation passen. In Berlin.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Gemacht für den Berliner Arbeitsalltag",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Du weißt immer, wie es weitergeht",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Jetzt offene Stellen in Berlin" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Erreiche Menschen, die anfangen können",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Jetzt arbeiten — zuerst in Berlin" }),
  ).toBeVisible();

  const widths = await page.locator("html").evaluate((root) => ({
    clientWidth: root.clientWidth,
    scrollWidth: root.scrollWidth,
  }));
  expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth + 1);
});
