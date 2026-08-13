import { defineConfig, devices } from "@playwright/test";

import baseConfig from "./playwright.config";

/**
 * Unit I / I-05 — narrow, dedicated WebKit/mobile-Safari-equivalent smoke.
 *
 * Deliberately a *separate* config file rather than a second project added
 * to playwright.config.ts's own `projects` array. Playwright runs every
 * matching test across ALL configured projects unless a run explicitly
 * selects one with `--project`; none of the existing `test:e2e:*` scripts
 * pass `--project`, so adding a second project directly to the main config
 * would have silently made every existing Chromium-only script also run
 * under the new project for any spec it matched. A separate config file
 * that only ever runs via its own `--config` flag has zero ability to
 * affect any existing script — the safest boundary available, not just the
 * smallest edit.
 *
 * Reuses the main config's shared runtime (webServer, baseURL, etc.) so
 * there is one source of truth for how the app is built/served; only
 * `testMatch` and `projects` are overridden.
 *
 * Why WebKit specifically (not "WebKit is the only iOS engine" — other
 * engines can exist on modern iOS): docs/08-non-functional.md explicitly
 * requires Safari support, candidate flows are explicitly mobile-first,
 * and current automated coverage is Chromium-only. This closes exactly
 * that documented gap for the two specs proving the recent Unit I
 * defects (I-01/I-02/I-03) — not a claim of full physical-Safari parity;
 * see docs/53's Unit I section for the separate manual real-Safari proof.
 */
export default defineConfig({
  ...baseConfig,
  testMatch: [
    "**/candidate-navigation-ia.spec.ts",
    "**/employer-navigation-ia.spec.ts",
  ],
  projects: [
    {
      name: "webkit-mobile",
      use: { ...devices["iPhone 17"] },
    },
  ],
});
