import { expect, test } from "@playwright/test";

test("shell smoke: brand, candidate heading, and employer preview link", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("banner").getByText("Stint")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "One step closer." }),
  ).toBeVisible();

  const employerLink = page.getByRole("link", {
    name: "View employer and admin preview",
  });
  await expect(employerLink).toBeVisible();
  await expect(employerLink).toHaveAttribute(
    "href",
    "#employer-admin-experience",
  );

  await employerLink.click();

  const employerRegion = page.getByRole("region", {
    name: "Clear vacancies. Careful review.",
  });
  await expect(employerRegion).toBeVisible();
  await expect(employerRegion).toHaveAttribute(
    "id",
    "employer-admin-experience",
  );
  await expect(page).toHaveURL(/#employer-admin-experience$/);
});
