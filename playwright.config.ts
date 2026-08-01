import { defineConfig, devices } from "@playwright/test";

const scaffoldUrl = "https://placeholder.supabase.co";
const scaffoldKey = "stint-ci-scaffold-not-connected";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",
  },
  webServer: {
    // Prefer an explicit production server. CI Auth job builds with local env first.
    command: "pnpm start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer:
      !process.env.CI && process.env.E2E_AUTH_JOURNEY !== "1",
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? scaffoldUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? scaffoldKey,
      NEXT_PUBLIC_SITE_URL:
        process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
