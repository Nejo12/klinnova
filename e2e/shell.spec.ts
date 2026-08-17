import { expect, test } from "@playwright/test";

test("homepage smoke: brand, hero, candidate/employer CTAs, jobs nav, legal footer", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("banner").getByText("Klinnova")).toBeVisible();

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Jobs that match your situation. In Berlin.",
    }),
  ).toBeVisible();

  const candidateCta = page.getByRole("link", { name: "I'm a candidate" });
  await expect(candidateCta).toBeVisible();
  await expect(candidateCta).toHaveAttribute("href", "/register");

  const employerCta = page.getByRole("link", { name: "I'm an employer" });
  await expect(employerCta).toBeVisible();
  await expect(employerCta).toHaveAttribute("href", "/employer/register");

  const nav = page.getByRole("navigation", { name: "Site" });
  const jobsLink = nav.getByRole("link", { name: "Jobs" });
  await expect(jobsLink).toHaveAttribute("href", "/jobs");
  await expect(nav.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login",
  );
  await expect(
    nav.getByRole("link", { name: "Create account" }),
  ).toHaveAttribute("href", "/register");

  await jobsLink.click();
  await expect(page).toHaveURL(/\/jobs$/);

  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "Privacy" })).toHaveAttribute(
    "href",
    "/privacy",
  );
  await expect(footer.getByRole("link", { name: "Terms" })).toHaveAttribute(
    "href",
    "/terms",
  );
  await expect(footer.getByRole("link", { name: "Impressum" })).toHaveAttribute(
    "href",
    "/impressum",
  );
});
