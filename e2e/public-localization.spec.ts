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
    page.getByRole("heading", { name: "Berlin first" }),
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
    page.getByRole("heading", { name: "Zuerst in Berlin" }),
  ).toBeVisible();

  const widths = await page.locator("html").evaluate((root) => ({
    clientWidth: root.clientWidth,
    scrollWidth: root.scrollWidth,
  }));
  expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth + 1);
});

test("public homepage anchors reach the explainer and FAQ sections by keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const nav = page.getByRole("navigation", { name: "Site" });
  await nav.getByRole("link", { name: "How it works" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect(
    page.getByRole("region", { name: "Made for how Berlin works" }),
  ).toBeInViewport();

  await nav.getByRole("link", { name: "FAQ" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#faq$/);

  const question = page.getByText("How are employers verified?");
  await question.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText(/not an endorsement of the employer/),
  ).toBeVisible();
});

test("German homepage keeps nav, FAQ and actions inside a 390px viewport", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("klinnova-locale", "de");
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "Menü" }).click();
  await page.getByRole("link", { name: "Häufige Fragen" }).click();
  await expect(page).toHaveURL(/#faq$/);
  await expect(
    page.getByRole("region", { name: "Häufige Fragen" }),
  ).toBeInViewport();

  await page.getByText("Wie fange ich an?").click();
  await expect(
    page.getByRole("link", { name: "Konto für Bewerbende erstellen" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Arbeitgeberkonto erstellen" }).last(),
  ).toBeVisible();

  const widths = await page.locator("html").evaluate((root) => ({
    clientWidth: root.clientWidth,
    scrollWidth: root.scrollWidth,
  }));
  expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth + 1);
});
