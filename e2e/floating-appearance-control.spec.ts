import { expect, test } from "@playwright/test";

test("floating interface preferences keep language and appearance independent", async ({
  page,
}) => {
  await page.goto("/");

  const trigger = page.locator("[data-overlay-trigger]");
  await expect(trigger).toHaveAccessibleName("Interface preferences");
  await expect(trigger).toBeVisible();
  await expect(
    trigger.locator("[data-interface-preferences-icon]"),
  ).toBeVisible();
  await trigger.click();

  const panel = page.locator('[role="dialog"]');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("button", { name: /English/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(panel.getByRole("button", { name: /Deutsch/ })).toBeVisible();
  await expect(panel.getByRole("button", { name: /System/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(panel.getByRole("button", { name: /Light/ })).toBeVisible();
  await expect(panel.getByRole("button", { name: /Dark/ })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-preference",
    "system",
  );

  await panel.getByRole("button", { name: /Deutsch/ }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-preference",
    "system",
  );
  await expect(trigger).toHaveAccessibleName("Oberflächeneinstellungen");

  await panel.getByRole("button", { name: /Dunkel/ }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-preference",
    "dark",
  );

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.press("Space");
  await page
    .getByRole("dialog", { name: "Oberflächeneinstellungen" })
    .getByRole("button", { name: /English/ })
    .click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-preference",
    "dark",
  );
});

test("floating interface preferences preserve motion, clearance, and mobile safety", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Interface preferences" });
  const initialBox = await trigger.boundingBox();
  expect(initialBox).not.toBeNull();
  expect(initialBox?.width).toBe(48);
  expect(initialBox?.height).toBe(48);
  expect(390 - (initialBox?.x ?? 0) - (initialBox?.width ?? 0)).toBeCloseTo(
    16,
    0,
  );
  expect(844 - (initialBox?.y ?? 0) - (initialBox?.height ?? 0)).toBeCloseTo(
    16,
    0,
  );

  await page.locator("html").evaluate((root) => {
    root.style.setProperty("--interface-preferences-bottom-clearance", "72px");
  });
  const liftedBox = await trigger.boundingBox();
  expect(844 - (liftedBox?.y ?? 0) - (liftedBox?.height ?? 0)).toBeCloseTo(
    88,
    0,
  );

  await trigger.click();
  const panel = page.getByRole("dialog", { name: "Interface preferences" });
  await expect(panel).toHaveCSS("animation-duration", "0.16s");
  const viewportWidth = await page.locator("html").evaluate((root) => ({
    clientWidth: root.clientWidth,
    scrollWidth: root.scrollWidth,
  }));
  expect(viewportWidth.scrollWidth).toBeLessThanOrEqual(
    viewportWidth.clientWidth + 1,
  );

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await trigger.click();
  await expect(
    page.getByRole("dialog", { name: "Interface preferences" }),
  ).toHaveCSS("animation-name", /fade-in/);
});
