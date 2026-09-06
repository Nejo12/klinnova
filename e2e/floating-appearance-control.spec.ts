import { expect, test } from "@playwright/test";

test("floating appearance control selects and persists explicit preferences", async ({
  page,
}) => {
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Appearance: System" });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(page.getByRole("menuitemradio")).toHaveCount(3);
  await expect(
    page.getByRole("menuitemradio", { name: "System" }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-preference",
    "system",
  );

  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAccessibleName("Appearance: Dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-preference",
    "dark",
  );

  await page.reload();
  await expect(
    page.getByRole("button", { name: "Appearance: Dark" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Appearance: Dark" }).press("Space");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-preference",
    "light",
  );

  const lightTrigger = page.getByRole("button", { name: "Appearance: Light" });
  await lightTrigger.press("Space");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(lightTrigger).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-preference",
    "light",
  );
});

test("floating appearance control keeps its responsive clearance and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const trigger = page.getByRole("button", { name: /^Appearance:/ });
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
  await expect(trigger).toHaveCSS("transition-duration", "0s");

  await page.locator("html").evaluate((root) => {
    root.style.setProperty("--appearance-control-bottom-clearance", "72px");
  });
  const liftedBox = await trigger.boundingBox();
  expect(844 - (liftedBox?.y ?? 0) - (liftedBox?.height ?? 0)).toBeCloseTo(
    88,
    0,
  );

  await trigger.click();
  const viewportWidth = await page.locator("html").evaluate((root) => ({
    clientWidth: root.clientWidth,
    scrollWidth: root.scrollWidth,
  }));
  expect(viewportWidth.scrollWidth).toBeLessThanOrEqual(
    viewportWidth.clientWidth + 1,
  );
});
