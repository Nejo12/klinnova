# P1 Homepage Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current engineering/demo-shell homepage (`ShellHeader` + `CandidateShell` + `EmployerShell`) with a dedicated, product-led public homepage that shows how Klinnova works (candidate matching mechanism, application status workflow, employer verification/review flow) using only real, currently-supported product concepts.

**Architecture:** `src/app/page.tsx` becomes a thin async Server Component (mirroring `src/app/jobs/page.tsx`) that fetches the real public vacancy list via the existing `loadPublicVacancies` and renders a new presentational `Homepage` component (`src/components/homepage/homepage.tsx`). `Homepage` composes seven focused section components (hero, value pillars, candidate journey, open-jobs preview, employer band, final CTA) plus the existing `PublicFooter`. `ShellHeader` is refactored in place (not replaced) to add real public navigation and a mobile disclosure menu. The obsolete `CandidateShell`/`EmployerShell`/`StepProgress` prototype components are deleted once nothing references them.

**Tech Stack:** Next.js App Router (Server Components), React, TypeScript (strict, no `any`), SCSS Modules using the existing `src/styles/tokens.css` custom properties (no new tokens), Vitest + Testing Library for unit/component tests, Playwright for the homepage smoke test.

**Spec:** The "Klinnova — P1 Homepage Presentation Implementation" brief (provided in the task conversation, not a repo file) plus the approved design reference decoded from `/Users/olaniyiaborisade/Downloads/Klinnova Homepage Direction (1).html` into `/private/tmp/claude-501/-Users-olaniyiaborisade-Codes-stint/f9882706-9e82-4e52-8285-93c4b4a193d9/scratchpad/design.html` for inspection. This plan is the executable translation of that brief; where the design mockup shows content the product does not actually support, this plan documents the substitution — see "Design deviations" below.

## Global Constraints

- Base SHA: `9411217cb906bc6d4e8c76882f8af7bd6f8acc48`. Branch: `feat/p1-homepage-presentation`, created from that base.
- Strict TypeScript, no `any`, one component per file, absolute `@/` imports, SCSS Modules (never Tailwind), no barrel files.
- No new CSS custom properties — every color/spacing/type value must come from `src/styles/tokens.css` (already matches the design's oxblood/clay/olive/paper/ink palette almost 1:1) or `src/styles/breakpoints.scss` (`$breakpoint-sm=30rem/480px`, `$breakpoint-md=48rem/768px`, `$breakpoint-lg=64rem/1024px`, `$breakpoint-xl=80rem/1280px`).
- Application status vocabulary is exactly `submitted | reviewing | shortlisted | accepted | rejected`, rendered only via `applicationStatusLabel` from `@/lib/applications/status` — never hand-write status text, never use "Hired" or "New" as a status label (accepted ≠ hired; canonical label for `submitted` is "Submitted", not "New").
- Match-reason vocabulary is exactly the 7 `MatchReasonCode`s in `@/lib/matching/types` (`category_match, employment_type_match, shift_match, german_requirement_met, additional_languages_met, availability_match, berlin_job`), rendered only via `presentMatchReason(s)` from `@/lib/matching/present-reasons`. There is no "work permission / work authorisation" match reason anywhere in the codebase — never claim it as a checked/matched criterion in any homepage copy.
- Public vacancy fields are exactly what `PublicVacancy` in `@/lib/public-jobs/domain` exposes (`title, description, jobCategory, publicLocality, workplaceType, workFrequency, cvRequired, interviewEnglishOk, source, employerDisplayName, companyName, website, expiresAt`) plus per-vacancy `languages`. There is no salary field and no employment-type/shift field on the public contract — never show a `€/h` figure or a "Part time, mornings" style chip on public-facing vacancy previews.
- No fabricated traction, applicant counts, conversion rates, employer logos, testimonials, or ratings anywhere on the page, including in illustrative content.
- Illustrative/sample content (anything not sourced from a real query) must carry a visible "Illustrative example" caption and must never be a clickable/interactive affordance that implies a real action (no fake "Apply" button on sample data).
- Do not modify legal page substance (`/privacy`, `/terms`, `/impressum`) or the `PublicFooter` links themselves — only its layout/spacing may change.
- STOP BEFORE MERGE. Do not merge this branch under any circumstance in this plan.

---

## Design deviations (from the approved mockup, decided during research — report these verbatim in the final Founder report)

1. **Dropped salary (`14.50 €/h`) from every illustrative/real vacancy chip.** `PublicVacancy` has no public salary field (salary exists only on the private employer-side `vacancy-draft-form`/`salary.ts`, never surfaced through `list_effective_public_vacancies`). Showing it publicly would imply a capability that doesn't exist and would require a schema/API change, which is out of scope and a STOP condition.
2. **Dropped "Part time, mornings"-style employment-type/shift chips from public vacancy previews.** Those are real *matching* inputs (`evaluateEmployment`, `evaluateShift`), but they are not part of the public vacancy contract (`PublicVacancy` has no `employmentType`/`shift` field). The hero and "Open in Berlin right now" cards instead use exactly the fields `PublicJobCard` already renders for real listings: category, locality, workplace type, work frequency, languages.
3. **Dropped "Your work permission covers this role" from the hero "why this fits" checklist**, replaced with `berlin_job` ("Based in Berlin"). Work authorisation is a real onboarding declaration (`work-authorisation-group-form.tsx`, `WorkAuthorisationNotice`) but it is not one of the 7 `MatchReasonCode`s and not one of the 6 `MissingRequirementCode`s — there is no product mechanism that renders it as a checked "reason a vacancy matches." The three illustrative bullets shown are produced by passing synthetic-but-real `MatchReason` objects through the actual `presentMatchReason` function, so the copy can never drift from what the real matching UI says.
4. **Replaced "25 minutes from Wedding" (commute estimate) with the vacancy's district alone** (`publicLocality`). Travel time is not computed anywhere in the codebase; the design's own dev note flagged this exact swap as acceptable.
5. **Removed the hero card's "Apply" button**, replaced with plain text ("Sign in to check your fit and apply"). The hero vacancy is illustrative/sample, not a real listing — a clickable "Apply" affordance on fake data would misrepresent it as real marketplace activity.
6. **Changed the employer applications panel's "New 12 / Shortlisted 5 / Hired 1" summary row to nothing** (removed entirely) — even captioned "illustrative," specific applicant counts read as fabricated traction/metrics, which the brief explicitly prohibits. The workflow chip strip (a process diagram, not a metric) and the per-row status pills are kept, using real `applicationStatusLabel` text and dropping "Hired" (accepted ≠ hired).
7. **Dropped the "Your data stays yours" hero trust bullet.** `/privacy` is an explicit legal placeholder ("Controller ... has not yet been finalised," `noindex`) — asserting a data-handling promise on the homepage while the privacy policy itself is unfinished is a needless legal risk. Kept "Verified employers only" and "Built for Berlin," both directly backed by real product mechanics (publish-readiness gate requires `verification`; Berlin-only positioning).
8. **"Open in Berlin right now" uses real, live data** (`loadPublicVacancies`, the same RPC `/jobs` uses) instead of the mockup's static sample cards — this is strictly more truthful than the approved design and reuses `PublicJobCard` verbatim (including its existing seed/employer demo-labeling), so no new component or copy risk is introduced. If zero vacancies are published, a short honest empty message is shown instead of empty/fake cards.

If any of these deviations are unacceptable to the Founder, they must be called out explicitly in the final report per the brief's stop-condition instructions — this plan does not silently invent a workaround beyond what's documented above.

---

## File Structure

**New files:**
- `src/components/homepage/homepage-messages.ts` — shared illustrative-content caption constant.
- `src/components/homepage/homepage.tsx` / `.module.scss` / `.test.tsx` — top-level composition (header, main, footer).
- `src/components/homepage/public-hero.tsx` / `.module.scss` / `.test.tsx` — hero: headline, CTAs, trust bullets, illustrative match-preview card.
- `src/components/homepage/value-pillars.tsx` / `.module.scss` / `.test.tsx` — "Made for how Berlin works" 4-card grid.
- `src/components/homepage/candidate-journey.tsx` / `.module.scss` / `.test.tsx` — 4-step candidate path + illustrative status timeline card.
- `src/components/homepage/open-jobs-preview.tsx` / `.module.scss` / `.test.tsx` — real-data "Open in Berlin right now" section.
- `src/components/homepage/employer-band.tsx` / `.module.scss` / `.test.tsx` — dark employer section with workflow strip + illustrative applicant list.
- `src/components/homepage/final-cta.tsx` / `.module.scss` / `.test.tsx` — "Working now, in Berlin first" closing band.

**Modified files:**
- `src/components/shell-header.tsx` / `.module.scss` / `.test.tsx` — add Jobs/For candidates/For employers nav, Sign in/Create account actions, mobile disclosure menu.
- `src/app/page.tsx` — becomes an async Server Component fetching real vacancies and rendering `Homepage`.
- `e2e/shell.spec.ts` — rewritten smoke test for the new homepage.

**Deleted files (dead code once the new homepage no longer references them):**
- `src/components/candidate-shell.tsx`, `.module.scss`, `.test.tsx`
- `src/components/employer-shell.tsx`, `.module.scss`, `.test.tsx`
- `src/components/step-progress.tsx`, `.module.scss`, `.test.tsx`
- `src/app/page.module.scss` (superseded by `homepage.module.scss`; nothing else imports it)

---

### Task 1: Branch setup + ShellHeader public navigation

**Files:**
- Modify: `src/components/shell-header.tsx`
- Modify: `src/components/shell-header.module.scss`
- Modify: `src/components/shell-header.test.tsx`

**Interfaces:**
- Produces: `ShellHeader` (no props) — unchanged public API, still exported from `@/components/shell-header`. Anchors it links to (`#for-candidates`, `#for-employers`) are `id`s that Task 4 (`CandidateJourney`) and Task 6 (`EmployerBand`) must set on their outermost `<section>`.

- [ ] **Step 1: Create the branch**

```bash
git status --short
git checkout -b feat/p1-homepage-presentation 9411217cb906bc6d4e8c76882f8af7bd6f8acc48
git rev-parse HEAD
```

Expected: HEAD now equals `9411217cb906bc6d4e8c76882f8af7bd6f8acc48`, branch is `feat/p1-homepage-presentation`. The pre-existing uncommitted `next-env.d.ts` modification is a Next.js auto-generated file; leave it untouched (do not stage or revert it as part of this work).

- [ ] **Step 2: Write the failing test for the new nav/auth links**

Replace `src/components/shell-header.test.tsx` with:

```tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ShellHeader } from "@/components/shell-header";

describe("ShellHeader", () => {
  it("exposes a banner with brand", () => {
    render(<ShellHeader />);

    const header = screen.getByRole("banner");
    expect(within(header).getByText("Klinnova")).toBeInTheDocument();
  });

  it("exposes Jobs, For candidates, and For employers in the Site nav", () => {
    render(<ShellHeader />);

    const nav = screen.getByRole("navigation", { name: "Site" });
    expect(within(nav).getByRole("link", { name: "Jobs" })).toHaveAttribute(
      "href",
      "/jobs",
    );
    expect(
      within(nav).getByRole("link", { name: "For candidates" }),
    ).toHaveAttribute("href", "#for-candidates");
    expect(
      within(nav).getByRole("link", { name: "For employers" }),
    ).toHaveAttribute("href", "#for-employers");
  });

  it("exposes Sign in and Create account actions to real routes", () => {
    render(<ShellHeader />);

    const nav = screen.getByRole("navigation", { name: "Site" });
    expect(within(nav).getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(
      within(nav).getByRole("link", { name: "Create account" }),
    ).toHaveAttribute("href", "/register");
  });

  it("toggles the mobile menu button's expanded state", () => {
    render(<ShellHeader />);

    const toggle = screen.getByRole("button", { name: "Menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/shell-header.test.tsx`
Expected: FAIL — `For candidates`/`For employers`/`Sign in`/`Create account`/menu button not found (current `ShellHeader` only renders the "Jobs" link).

- [ ] **Step 3: Rewrite `shell-header.tsx`**

```tsx
"use client";

import { useId, useState } from "react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

import styles from "./shell-header.module.scss";

export function ShellHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navId = useId();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/" aria-label="Klinnova home">
          <BrandMark as="span" />
        </Link>

        <button
          type="button"
          className={styles.menuToggle}
          aria-expanded={menuOpen}
          aria-controls={navId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          Menu
        </button>

        <nav
          id={navId}
          className={
            menuOpen ? `${styles.nav} ${styles.navOpen}` : styles.nav
          }
          aria-label="Site"
        >
          <div className={styles.navLinks}>
            <Link className={styles.navLink} href="/jobs">
              Jobs
            </Link>
            <a className={styles.navLink} href="#for-candidates">
              For candidates
            </a>
            <a className={styles.navLink} href="#for-employers">
              For employers
            </a>
          </div>
          <div className={styles.authActions}>
            <Link className={styles.signInLink} href="/login">
              Sign in
            </Link>
            <Link className={styles.createAccountLink} href="/register">
              Create account
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Rewrite `shell-header.module.scss`**

```scss
@use "../styles/breakpoints" as *;

.header {
  border-bottom: var(--border-width-default) solid var(--color-border-default);
  background-color: var(--color-bg-surface);
}

.inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  max-width: var(--layout-content-max);
  margin-inline: auto;
  padding: var(--space-4) var(--layout-gutter-mobile);
}

.brand {
  display: inline-flex;
  text-decoration: none;
}

.menuToggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--touch-target-min);
  padding: var(--space-2) var(--space-4);
  border: var(--border-width-default) solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-surface);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.menuToggle:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus-ring);
  outline-offset: var(--focus-ring-offset);
}

.nav {
  display: none;
  flex-direction: column;
  gap: var(--space-4);
  width: 100%;
  order: 3;
}

.navOpen {
  display: flex;
}

.navLinks {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.navLink {
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

.navLink:hover {
  color: var(--color-action-primary-hover);
}

.navLink:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus-ring);
  outline-offset: var(--focus-ring-offset);
}

.authActions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-3);
  border-top: var(--border-width-default) solid var(--color-border-default);
}

.signInLink {
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

.signInLink:focus-visible,
.createAccountLink:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus-ring);
  outline-offset: var(--focus-ring-offset);
}

.createAccountLink {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--touch-target-min);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  background-color: var(--color-action-primary);
  color: var(--color-action-primary-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

.createAccountLink:hover {
  background-color: var(--color-action-primary-hover);
  color: var(--color-action-primary-text);
}

@media (min-width: $breakpoint-md) {
  .inner {
    padding-inline: var(--layout-gutter-tablet);
  }

  .menuToggle {
    display: none;
  }

  .nav {
    display: flex !important;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-6);
    width: auto;
    flex: 1;
    order: 0;
    margin-left: var(--space-6);
  }

  .navLinks {
    flex-direction: row;
    gap: var(--space-5);
  }

  .authActions {
    flex-direction: row;
    gap: var(--space-4);
    padding-top: 0;
    border-top: none;
  }
}

@media (min-width: $breakpoint-lg) {
  .inner {
    padding-inline: var(--layout-gutter-desktop);
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/shell-header.test.tsx`
Expected: PASS (all 4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/shell-header.tsx src/components/shell-header.module.scss src/components/shell-header.test.tsx
git commit -m "feat: add public nav, auth actions, and mobile menu to ShellHeader"
```

---

### Task 2: PublicHero (headline, CTAs, illustrative match-preview card)

**Files:**
- Create: `src/components/homepage/homepage-messages.ts`
- Create: `src/components/homepage/public-hero.tsx`
- Create: `src/components/homepage/public-hero.module.scss`
- Test: `src/components/homepage/public-hero.test.tsx`

**Interfaces:**
- Consumes: `presentMatchReasons` from `@/lib/matching/present-reasons`; `MatchReason` type from `@/lib/matching/types`; `jobCategoryLabel`, `workplaceTypeLabel`, `workFrequencyLabel`, `languageLabel`, `languageProficiencyLabel` from `@/lib/public-jobs/labels`.
- Produces: `PublicHero` (no props), default-exported nothing (named export only, per repo convention). `ILLUSTRATIVE_CAPTION` from `homepage-messages.ts`, reused by Tasks 4 and 6.

- [ ] **Step 1: Write `homepage-messages.ts`**

```ts
export const ILLUSTRATIVE_CAPTION =
  "Illustrative example — sample data, not real Klinnova activity.";
```

- [ ] **Step 2: Write the failing test**

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicHero } from "@/components/homepage/public-hero";

describe("PublicHero", () => {
  it("renders the h1, both primary CTAs, and no unsupported claims", () => {
    render(<PublicHero />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Jobs that match your situation. In Berlin.",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "I’m a candidate" }),
    ).toHaveAttribute("href", "/register");
    expect(
      screen.getByRole("link", { name: "I’m an employer" }),
    ).toHaveAttribute("href", "/employer/register");

    expect(screen.queryByText(/€\/h/)).not.toBeInTheDocument();
    expect(screen.queryByText(/work permission/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Apply" })).not.toBeInTheDocument();
  });

  it("renders the illustrative match card using real match-reason copy", () => {
    render(<PublicHero />);

    expect(screen.getByText("Illustrative example — sample data, not real Klinnova activity.")).toBeInTheDocument();
    const card = screen.getByRole("group", { name: /Reinigungskraft/ });
    expect(
      within(card).getByText("Your German level meets the requirement"),
    ).toBeInTheDocument();
    expect(
      within(card).getByText("Start date fits your availability"),
    ).toBeInTheDocument();
    expect(within(card).getByText("Based in Berlin")).toBeInTheDocument();
    expect(within(card).getByText("Cleaning")).toBeInTheDocument();
    expect(within(card).getByText("Mitte")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/homepage/public-hero.test.tsx`
Expected: FAIL — module `@/components/homepage/public-hero` does not exist.

- [ ] **Step 4: Write `public-hero.tsx`**

```tsx
import Link from "next/link";

import { presentMatchReasons } from "@/lib/matching/present-reasons";
import type { MatchReason } from "@/lib/matching/types";
import {
  jobCategoryLabel,
  languageLabel,
  languageProficiencyLabel,
  workFrequencyLabel,
  workplaceTypeLabel,
} from "@/lib/public-jobs/labels";

import { ILLUSTRATIVE_CAPTION } from "./homepage-messages";
import styles from "./public-hero.module.scss";

/**
 * Synthetic but real MatchReason values, run through the production
 * presentMatchReason function so the illustrative copy can never drift
 * from what the authenticated matches UI actually says.
 */
const HERO_MATCH_REASONS: MatchReason[] = [
  { code: "german_requirement_met", germanRequirement: "basic" },
  { code: "availability_match", kind: "flexible_start" },
  { code: "berlin_job", city: "Berlin" },
];

export function PublicHero() {
  const reasons = presentMatchReasons(HERO_MATCH_REASONS);

  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Berlin · working now</p>
        <h1 className={styles.heading} id="hero-heading">
          Jobs that match your situation.{" "}
          <span className={styles.accent}>In Berlin.</span>
        </h1>
        <p className={styles.lead}>
          Language level, availability and location — checked against what
          each vacancy needs.
        </p>
        <div className={styles.ctas}>
          <Link className={styles.primaryCta} href="/register">
            I’m a candidate
          </Link>
          <Link className={styles.secondaryCta} href="/employer/register">
            I’m an employer
          </Link>
        </div>
        <ul className={styles.trustList}>
          <li className={styles.trustItem}>Verified employers only</li>
          <li className={styles.trustItem}>Built for Berlin</li>
        </ul>
      </div>

      <div
        className={styles.previewCard}
        role="group"
        aria-labelledby="hero-preview-title"
      >
        <div className={styles.previewHeader}>
          <div>
            <h3 className={styles.previewTitle} id="hero-preview-title">
              Reinigungskraft
            </h3>
            <p className={styles.previewCompany}>Hauswerk Berlin · Mitte</p>
          </div>
          <span className={styles.verifiedBadge}>Verified employer</span>
        </div>

        <ul className={styles.previewChips}>
          <li className={styles.previewChip}>{jobCategoryLabel("cleaning")}</li>
          <li className={styles.previewChip}>
            {workplaceTypeLabel("private_home")}
          </li>
          <li className={styles.previewChip}>
            {workFrequencyLabel("recurring")}
          </li>
          <li className={styles.previewChip}>
            {languageLabel("de")} — {languageProficiencyLabel("basic")}
          </li>
        </ul>

        <div className={styles.previewReasons}>
          <p className={styles.previewReasonsHeading}>Why this fits you</p>
          <ul className={styles.reasonsList}>
            {reasons.map((reason) => (
              <li key={reason.key} className={styles.reasonItem}>
                {reason.text}
              </li>
            ))}
          </ul>
        </div>

        <p className={styles.previewNote}>
          Sign in to check your fit and apply.
        </p>
        <p className={styles.illustrativeCaption}>{ILLUSTRATIVE_CAPTION}</p>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Write `public-hero.module.scss`**

```scss
@use "../../styles/breakpoints" as *;

.hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  max-width: var(--layout-content-max);
  margin-inline: auto;
  padding: var(--space-10) var(--layout-gutter-mobile);
}

.copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.eyebrow {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide);
  text-transform: uppercase;
  color: var(--color-accent-warm-strong);
}

.heading {
  margin: 0;
  font-size: var(--font-size-4xl);
  line-height: var(--line-height-4xl);
  font-weight: var(--type-display-weight);
  letter-spacing: var(--type-display-tracking);
  color: var(--color-text-primary);
}

.accent {
  color: var(--color-action-primary);
}

.lead {
  margin: 0;
  max-width: 40ch;
  font-size: var(--font-size-lg);
  line-height: var(--line-height-lg);
  color: var(--color-text-secondary);
}

.ctas {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.primaryCta,
.secondaryCta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--touch-target-min);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

.primaryCta {
  border: var(--border-width-default) solid transparent;
  background-color: var(--color-action-primary);
  color: var(--color-action-primary-text);
}

.primaryCta:hover {
  background-color: var(--color-action-primary-hover);
  color: var(--color-action-primary-text);
}

.secondaryCta {
  border: var(--border-width-default) solid var(--color-border-strong);
  background-color: var(--color-bg-surface);
  color: var(--color-text-primary);
}

.secondaryCta:hover {
  background-color: var(--color-bg-subtle);
}

.trustList {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-5);
  margin: var(--space-2) 0 0;
  padding: 0;
  list-style: none;
}

.trustItem {
  position: relative;
  padding-left: var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.trustItem::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.45em;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-action-primary);
}

.previewCard {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-6);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background-color: var(--color-bg-surface);
  box-shadow: var(--shadow-md);
}

.previewHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.previewTitle {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.previewCompany {
  margin: var(--space-1) 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.verifiedBadge {
  flex-shrink: 0;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  background-color: var(--color-support-subtle);
  color: var(--color-support-strong);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.previewChips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.previewChip {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.previewReasons {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-page);
  border: var(--border-width-default) solid var(--color-border-default);
}

.previewReasonsHeading {
  margin: 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide);
  text-transform: uppercase;
  color: var(--color-accent-warm-strong);
}

.reasonsList {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.reasonItem {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.reasonItem::before {
  content: "✓ ";
  color: var(--color-status-success);
  font-weight: var(--font-weight-semibold);
}

.previewNote {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-action-primary);
}

.illustrativeCaption {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

@media (min-width: $breakpoint-lg) {
  .hero {
    flex-direction: row;
    align-items: center;
    gap: var(--space-10);
    padding-block: var(--space-16);
  }

  .copy,
  .previewCard {
    flex: 1;
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/components/homepage/public-hero.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/homepage/homepage-messages.ts src/components/homepage/public-hero.tsx src/components/homepage/public-hero.module.scss src/components/homepage/public-hero.test.tsx
git commit -m "feat: add homepage PublicHero with product-truth-safe match preview"
```

---

### Task 3: ValuePillars (4-card benefit grid)

**Files:**
- Create: `src/components/homepage/value-pillars.tsx`
- Create: `src/components/homepage/value-pillars.module.scss`
- Test: `src/components/homepage/value-pillars.test.tsx`

**Interfaces:**
- Produces: `ValuePillars` (no props).

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ValuePillars } from "@/components/homepage/value-pillars";

describe("ValuePillars", () => {
  it("renders the section heading and four Klinnova-specific benefit cards", () => {
    render(<ValuePillars />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Made for how Berlin works",
      }),
    ).toBeInTheDocument();

    const cardHeadings = [
      "Jobs that fit your situation",
      "Know before you apply",
      "Your status stays visible",
      "Verified before publishing",
    ];
    for (const name of cardHeadings) {
      expect(screen.getByRole("heading", { level: 3, name })).toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/homepage/value-pillars.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write `value-pillars.tsx`**

```tsx
import styles from "./value-pillars.module.scss";

type Pillar = {
  heading: string;
  body: string;
};

const PILLARS: Pillar[] = [
  {
    heading: "Jobs that fit your situation",
    body: "Category, language, hours and availability — matched to your profile.",
  },
  {
    heading: "Know before you apply",
    body: "Requirements stated on the vacancy, not hidden in the text.",
  },
  {
    heading: "Your status stays visible",
    body: "In the app, and by email.",
  },
  {
    heading: "Verified before publishing",
    body: "Every employer is checked first.",
  },
];

export function ValuePillars() {
  return (
    <section className={styles.section} aria-labelledby="value-pillars-heading">
      <h2 className={styles.heading} id="value-pillars-heading">
        Made for how Berlin works
      </h2>
      <ul className={styles.grid}>
        {PILLARS.map((pillar) => (
          <li key={pillar.heading} className={styles.card}>
            <h3 className={styles.cardHeading}>{pillar.heading}</h3>
            <p className={styles.cardBody}>{pillar.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Write `value-pillars.module.scss`**

```scss
@use "../../styles/breakpoints" as *;

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  max-width: var(--layout-content-max);
  margin-inline: auto;
  padding: var(--space-10) var(--layout-gutter-mobile);
}

.heading {
  margin: 0;
  font-size: var(--type-heading-size);
  line-height: var(--type-heading-line-height);
  font-weight: var(--type-heading-weight);
  color: var(--color-text-primary);
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-5);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background-color: var(--color-bg-surface);
}

.cardHeading {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.cardBody {
  margin: 0;
  font-size: var(--font-size-sm);
  line-height: var(--line-height-sm);
  color: var(--color-text-secondary);
}

@media (min-width: $breakpoint-sm) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: $breakpoint-lg) {
  .section {
    padding-inline: var(--layout-gutter-desktop);
  }

  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/homepage/value-pillars.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/homepage/value-pillars.tsx src/components/homepage/value-pillars.module.scss src/components/homepage/value-pillars.test.tsx
git commit -m "feat: add homepage ValuePillars section"
```

---

### Task 4: CandidateJourney (4-step path + illustrative status timeline)

**Files:**
- Create: `src/components/homepage/candidate-journey.tsx`
- Create: `src/components/homepage/candidate-journey.module.scss`
- Test: `src/components/homepage/candidate-journey.test.tsx`

**Interfaces:**
- Consumes: `applicationStatusLabel` from `@/lib/applications/status`; `ILLUSTRATIVE_CAPTION` from `./homepage-messages`.
- Produces: `CandidateJourney` (no props). Section `id="for-candidates"`, matching `ShellHeader`'s `#for-candidates` anchor from Task 1.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CandidateJourney } from "@/components/homepage/candidate-journey";

describe("CandidateJourney", () => {
  it("has id=for-candidates and the section heading", () => {
    render(<CandidateJourney />);

    const region = screen.getByRole("region", {
      name: "You never wonder where it went",
    });
    expect(region).toHaveAttribute("id", "for-candidates");
  });

  it("lists the four real steps in order", () => {
    render(<CandidateJourney />);

    const steps = screen.getAllByRole("listitem", { name: /^Step \d/ });
    expect(steps).toHaveLength(4);
    expect(steps[0]).toHaveTextContent("Your situation, set once");
    expect(steps[3]).toHaveTextContent(
      "Status you can see, updates by email",
    );
  });

  it("renders an illustrative status timeline using canonical status labels", () => {
    render(<CandidateJourney />);

    const timeline = screen.getByRole("group", {
      name: /Küchenhilfe/,
    });
    expect(within(timeline).getByText("Shortlisted")).toBeInTheDocument();
    expect(within(timeline).getByText("Submitted")).toBeInTheDocument();
    expect(within(timeline).getByText("In review")).toBeInTheDocument();
    expect(screen.queryByText("Reviewing")).not.toBeInTheDocument();
    expect(screen.queryByText("New")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Illustrative example — sample data, not real Klinnova activity.",
      ),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/homepage/candidate-journey.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write `candidate-journey.tsx`**

```tsx
import { applicationStatusLabel } from "@/lib/applications/status";

import { ILLUSTRATIVE_CAPTION } from "./homepage-messages";
import styles from "./candidate-journey.module.scss";

const STEPS = [
  "Your situation, set once",
  "Vacancies that match it",
  "Apply, a CV only when a role needs one",
  "Status you can see, updates by email",
];

export function CandidateJourney() {
  return (
    <section
      className={styles.section}
      id="for-candidates"
      aria-labelledby="candidate-journey-heading"
    >
      <div className={styles.copy}>
        <p className={styles.eyebrow}>From profile to decision</p>
        <h2 className={styles.heading} id="candidate-journey-heading">
          You never wonder where it went
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li
              key={step}
              className={styles.step}
              aria-label={`Step ${index + 1}`}
            >
              <span className={styles.stepNumber}>{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div
        className={styles.timelineCard}
        role="group"
        aria-labelledby="candidate-timeline-title"
      >
        <div className={styles.timelineHeader}>
          <h3 className={styles.timelineTitle} id="candidate-timeline-title">
            Küchenhilfe · Restaurant Mira
          </h3>
          <span className={styles.statusBadge}>
            {applicationStatusLabel("shortlisted")}
          </span>
        </div>
        <ol className={styles.timelineList}>
          <li className={styles.timelineItemDone}>
            <span className={styles.timelineDot} aria-hidden="true" />
            <div>
              <p className={styles.timelineStatus}>
                {applicationStatusLabel("submitted")}
              </p>
              <p className={styles.timelineTime}>4 August</p>
            </div>
          </li>
          <li className={styles.timelineItemDone}>
            <span className={styles.timelineDot} aria-hidden="true" />
            <div>
              <p className={styles.timelineStatus}>
                {applicationStatusLabel("reviewing")}
              </p>
              <p className={styles.timelineTime}>6 August</p>
            </div>
          </li>
          <li className={styles.timelineItemPending}>
            <span className={styles.timelineDotPending} aria-hidden="true" />
            <div>
              <p className={styles.timelineStatusPending}>Decision</p>
              <p className={styles.timelineTime}>Waiting on the employer</p>
            </div>
          </li>
        </ol>
        <p className={styles.illustrativeCaption}>{ILLUSTRATIVE_CAPTION}</p>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Write `candidate-journey.module.scss`**

```scss
@use "../../styles/breakpoints" as *;

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  max-width: var(--layout-content-max);
  margin-inline: auto;
  padding: var(--space-10) var(--layout-gutter-mobile);
}

.copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.eyebrow {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide);
  text-transform: uppercase;
  color: var(--color-accent-warm-strong);
}

.heading {
  margin: 0;
  font-size: var(--type-heading-size);
  line-height: var(--type-heading-line-height);
  font-weight: var(--type-heading-weight);
  color: var(--color-text-primary);
}

.steps {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: var(--space-2) 0 0;
  padding: 0;
  list-style: none;
}

.step {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
}

.stepNumber {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background-color: var(--color-accent-warm-subtle);
  color: var(--color-accent-warm-strong);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.step:last-child {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.step:last-child .stepNumber {
  background-color: var(--color-action-primary);
  color: var(--color-action-primary-text);
}

.timelineCard {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-6);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background-color: var(--color-bg-surface);
}

.timelineHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.timelineTitle {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.statusBadge {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  background-color: var(--color-accent-warm-subtle);
  color: var(--color-accent-warm-strong);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.timelineList {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.timelineItemDone,
.timelineItemPending {
  display: flex;
  gap: var(--space-3);
  padding-bottom: var(--space-4);
}

.timelineDot {
  flex-shrink: 0;
  width: 0.625rem;
  height: 0.625rem;
  margin-top: 0.3rem;
  border-radius: 50%;
  background-color: var(--color-action-primary);
}

.timelineDotPending {
  flex-shrink: 0;
  width: 0.625rem;
  height: 0.625rem;
  margin-top: 0.3rem;
  border-radius: 50%;
  background-color: var(--color-bg-surface);
  border: var(--border-width-strong) solid var(--color-border-strong);
}

.timelineStatus {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.timelineStatusPending {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-muted);
}

.timelineTime {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.illustrativeCaption {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

@media (min-width: $breakpoint-lg) {
  .section {
    flex-direction: row;
    align-items: center;
    padding-inline: var(--layout-gutter-desktop);
  }

  .copy,
  .timelineCard {
    flex: 1;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/homepage/candidate-journey.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/homepage/candidate-journey.tsx src/components/homepage/candidate-journey.module.scss src/components/homepage/candidate-journey.test.tsx
git commit -m "feat: add homepage CandidateJourney section"
```

---

### Task 5: OpenJobsPreview (real live data)

**Files:**
- Create: `src/components/homepage/open-jobs-preview.tsx`
- Create: `src/components/homepage/open-jobs-preview.module.scss`
- Test: `src/components/homepage/open-jobs-preview.test.tsx`

**Interfaces:**
- Consumes: `PublicJobCard` from `@/components/public-jobs/public-job-card`; `LoadPublicVacanciesResult`, `PublicVacancyListItem` types from `@/lib/public-jobs/load-public-vacancies`.
- Produces: `OpenJobsPreview({ result }: { result: LoadPublicVacanciesResult })`. `result` is threaded through from `Homepage` (Task 8), which gets it from `src/app/page.tsx` (Task 9).

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OpenJobsPreview } from "@/components/homepage/open-jobs-preview";
import type {
  LoadPublicVacanciesResult,
  PublicVacancyListItem,
} from "@/lib/public-jobs/load-public-vacancies";

function makeItem(id: string, title: string): PublicVacancyListItem {
  return {
    vacancy: {
      vacancyId: id,
      title,
      description: null,
      jobCategory: "cleaning",
      publicLocality: "Neukölln",
      workplaceType: "shop",
      workFrequency: "recurring",
      cvRequired: null,
      interviewEnglishOk: null,
      source: "employer",
      employerDisplayName: "Restaurant Mira",
      companyName: null,
      website: null,
      expiresAt: "2026-09-01T00:00:00Z",
    },
    languages: [],
  };
}

describe("OpenJobsPreview", () => {
  it("renders up to three real vacancy cards and a link to /jobs", () => {
    const result: LoadPublicVacanciesResult = {
      ok: true,
      vacancies: [
        makeItem("11111111-1111-4111-8111-111111111111", "Küchenhilfe"),
        makeItem("22222222-2222-4222-8222-222222222222", "Lagermitarbeiter"),
        makeItem("33333333-3333-4333-8333-333333333333", "Reinigungskraft"),
        makeItem("44444444-4444-4444-8444-444444444444", "Servicekraft"),
      ],
    };
    render(<OpenJobsPreview result={result} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Open in Berlin right now" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Küchenhilfe" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Lagermitarbeiter" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Reinigungskraft" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Servicekraft" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See all jobs" })).toHaveAttribute(
      "href",
      "/jobs",
    );
  });

  it("shows an honest empty message with no fake cards when there are zero vacancies", () => {
    render(<OpenJobsPreview result={{ ok: true, vacancies: [] }} />);

    expect(
      screen.getByText("No vacancies are open right now — check back soon."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See all jobs" })).toBeInTheDocument();
  });

  it("degrades gracefully on load failure without fabricating content", () => {
    render(<OpenJobsPreview result={{ ok: false }} />);

    expect(screen.getByText("Jobs are temporarily unavailable.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See all jobs" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/homepage/open-jobs-preview.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write `open-jobs-preview.tsx`**

```tsx
import Link from "next/link";

import { PublicJobCard } from "@/components/public-jobs/public-job-card";
import type { LoadPublicVacanciesResult } from "@/lib/public-jobs/load-public-vacancies";

import styles from "./open-jobs-preview.module.scss";

const PREVIEW_COUNT = 3;

type OpenJobsPreviewProps = {
  result: LoadPublicVacanciesResult;
};

export function OpenJobsPreview({ result }: OpenJobsPreviewProps) {
  const items = result.ok ? result.vacancies.slice(0, PREVIEW_COUNT) : [];

  return (
    <section className={styles.section} aria-labelledby="open-jobs-heading">
      <div className={styles.header}>
        <h2 className={styles.heading} id="open-jobs-heading">
          Open in Berlin right now
        </h2>
        <Link className={styles.seeAllLink} href="/jobs">
          See all jobs
        </Link>
      </div>

      {result.ok && items.length > 0 ? (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.vacancy.vacancyId}>
              <PublicJobCard item={item} />
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.fallback}>
          {result.ok
            ? "No vacancies are open right now — check back soon."
            : "Jobs are temporarily unavailable."}
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Write `open-jobs-preview.module.scss`**

```scss
@use "../../styles/breakpoints" as *;

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: var(--layout-content-max);
  margin-inline: auto;
  padding: var(--space-10) var(--layout-gutter-mobile);
}

.header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

.heading {
  margin: 0;
  font-size: var(--type-heading-size);
  line-height: var(--type-heading-line-height);
  font-weight: var(--type-heading-weight);
  color: var(--color-text-primary);
}

.seeAllLink {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-action-primary);
  text-decoration: none;
}

.seeAllLink:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.list {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.fallback {
  margin: 0;
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
}

@media (min-width: $breakpoint-md) {
  .list {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: $breakpoint-lg) {
  .section {
    padding-inline: var(--layout-gutter-desktop);
  }

  .list {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/homepage/open-jobs-preview.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/homepage/open-jobs-preview.tsx src/components/homepage/open-jobs-preview.module.scss src/components/homepage/open-jobs-preview.test.tsx
git commit -m "feat: add homepage OpenJobsPreview backed by real public vacancies"
```

---

### Task 6: EmployerBand (dark section, workflow strip, illustrative applicants)

**Files:**
- Create: `src/components/homepage/employer-band.tsx`
- Create: `src/components/homepage/employer-band.module.scss`
- Test: `src/components/homepage/employer-band.test.tsx`

**Interfaces:**
- Consumes: `applicationStatusLabel` from `@/lib/applications/status`; `ILLUSTRATIVE_CAPTION` from `./homepage-messages`.
- Produces: `EmployerBand` (no props). Section `id="for-employers"`, matching `ShellHeader`'s `#for-employers` anchor from Task 1.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmployerBand } from "@/components/homepage/employer-band";

describe("EmployerBand", () => {
  it("has id=for-employers, heading, and a real CTA", () => {
    render(<EmployerBand />);

    const region = screen.getByRole("region", {
      name: "Reach people who can start",
    });
    expect(region).toHaveAttribute("id", "for-employers");

    expect(
      screen.getByRole("link", { name: "Create an employer account" }),
    ).toHaveAttribute("href", "/employer/register");
  });

  it("shows the real workflow strip with canonical status labels, no Hired or New", () => {
    render(<EmployerBand />);

    const strip = screen.getByRole("list", { name: "Application workflow" });
    expect(within(strip).getByText("Submitted")).toBeInTheDocument();
    expect(within(strip).getByText("In review")).toBeInTheDocument();
    expect(within(strip).getByText("Shortlisted")).toBeInTheDocument();
    expect(within(strip).getByText("Accepted")).toBeInTheDocument();
    expect(within(strip).getByText("Rejected")).toBeInTheDocument();
    expect(screen.queryByText("Hired")).not.toBeInTheDocument();
    expect(screen.queryByText(/^New$/)).not.toBeInTheDocument();
  });

  it("does not show fabricated applicant counts or conversion metrics", () => {
    render(<EmployerBand />);

    expect(screen.queryByText(/\b\d+\s*(applicants|new|shortlisted)\b/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Illustrative example — sample data, not real Klinnova activity.",
      ),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/homepage/employer-band.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write `employer-band.tsx`**

```tsx
import Link from "next/link";

import { applicationStatusLabel } from "@/lib/applications/status";

import { ILLUSTRATIVE_CAPTION } from "./homepage-messages";
import styles from "./employer-band.module.scss";

const WORKFLOW_STEPS = [
  applicationStatusLabel("submitted"),
  applicationStatusLabel("reviewing"),
  applicationStatusLabel("shortlisted"),
  applicationStatusLabel("accepted"),
  applicationStatusLabel("rejected"),
];

type SampleApplicant = {
  initials: string;
  name: string;
  role: string;
  status: "submitted" | "reviewing" | "shortlisted";
};

const SAMPLE_APPLICANTS: SampleApplicant[] = [
  { initials: "AK", name: "Amina K.", role: "Cleaner", status: "submitted" },
  {
    initials: "DM",
    name: "David M.",
    role: "Kitchen helper",
    status: "shortlisted",
  },
  {
    initials: "SL",
    name: "Sara L.",
    role: "Housekeeping",
    status: "submitted",
  },
  {
    initials: "MP",
    name: "Marco P.",
    role: "Logistics",
    status: "reviewing",
  },
];

export function EmployerBand() {
  return (
    <section
      className={styles.section}
      id="for-employers"
      aria-labelledby="employer-band-heading"
    >
      <div className={styles.copy}>
        <p className={styles.eyebrow}>For employers</p>
        <h2 className={styles.heading} id="employer-band-heading">
          Reach people who can start
        </h2>
        <ul className={styles.benefits}>
          <li>Post what the role actually needs</li>
          <li>Every application in one place</li>
          <li>Shortlist and decide faster</li>
        </ul>
        <Link className={styles.cta} href="/employer/register">
          Create an employer account
        </Link>
      </div>

      <div className={styles.panel}>
        <ol className={styles.workflowStrip} aria-label="Application workflow">
          {WORKFLOW_STEPS.map((label, index) => (
            <li key={label} className={styles.workflowStep}>
              {index > 0 ? (
                <span className={styles.workflowArrow} aria-hidden="true">
                  →
                </span>
              ) : null}
              <span className={styles.workflowChip}>{label}</span>
            </li>
          ))}
        </ol>

        <p className={styles.panelTitle}>Applications</p>
        <ul className={styles.applicantList}>
          {SAMPLE_APPLICANTS.map((applicant) => (
            <li key={applicant.name} className={styles.applicantRow}>
              <span className={styles.applicantAvatar} aria-hidden="true">
                {applicant.initials}
              </span>
              <span className={styles.applicantName}>{applicant.name}</span>
              <span className={styles.applicantRole}>{applicant.role}</span>
              <span className={styles.applicantStatus}>
                {applicationStatusLabel(applicant.status)}
              </span>
            </li>
          ))}
        </ul>
        <p className={styles.illustrativeCaption}>{ILLUSTRATIVE_CAPTION}</p>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Write `employer-band.module.scss`**

```scss
@use "../../styles/breakpoints" as *;

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  padding: var(--space-10) var(--layout-gutter-mobile);
  background-color: var(--color-bg-inverse);
}

.copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: var(--layout-content-max);
  margin-inline: auto;
  width: 100%;
}

.eyebrow {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide);
  text-transform: uppercase;
  color: var(--color-clay-500, var(--color-accent-warm));
}

.heading {
  margin: 0;
  font-size: var(--type-heading-size);
  line-height: var(--type-heading-line-height);
  font-weight: var(--type-heading-weight);
  color: var(--color-text-inverse);
}

.benefits {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--font-size-md);
  color: var(--color-text-inverse);
}

.benefits li {
  padding-left: var(--space-5);
  position: relative;
}

.benefits li::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: var(--color-accent-warm);
}

.cta {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--touch-target-min);
  margin-top: var(--space-2);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-surface);
  color: var(--color-bg-inverse);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

.cta:hover {
  background-color: var(--color-bg-subtle);
  color: var(--color-bg-inverse);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: var(--layout-content-max);
  margin-inline: auto;
  width: 100%;
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background-color: var(--color-bg-surface);
}

.workflowStrip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
  margin: 0 0 var(--space-2);
  padding: 0 0 var(--space-3);
  border-bottom: var(--border-width-default) solid var(--color-border-default);
  list-style: none;
}

.workflowStep {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.workflowArrow {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.workflowChip {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.panelTitle {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.applicantList {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.applicantRow {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-top: var(--border-width-default) solid var(--color-border-default);
  font-size: var(--font-size-sm);
}

.applicantAvatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.875rem;
  height: 1.875rem;
  border-radius: 50%;
  background-color: var(--color-bg-subtle);
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.applicantName {
  flex: 1;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.applicantRole {
  flex: 1;
  color: var(--color-text-secondary);
}

.applicantStatus {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.illustrativeCaption {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

@media (min-width: $breakpoint-lg) {
  .section {
    flex-direction: row;
    padding-inline: var(--layout-gutter-desktop);
    align-items: center;
  }

  .copy,
  .panel {
    flex: 1;
    margin-inline: 0;
  }

  .copy {
    max-width: none;
  }

  .panel {
    max-width: none;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/homepage/employer-band.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/homepage/employer-band.tsx src/components/homepage/employer-band.module.scss src/components/homepage/employer-band.test.tsx
git commit -m "feat: add homepage EmployerBand section without fabricated metrics"
```

---

### Task 7: FinalCta (closing rollout band)

**Files:**
- Create: `src/components/homepage/final-cta.tsx`
- Create: `src/components/homepage/final-cta.module.scss`
- Test: `src/components/homepage/final-cta.test.tsx`

**Interfaces:**
- Produces: `FinalCta` (no props).

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FinalCta } from "@/components/homepage/final-cta";

describe("FinalCta", () => {
  it("uses the approved rollout wording and real CTA destinations", () => {
    render(<FinalCta />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Working now, in Berlin first",
      }),
    ).toBeInTheDocument();

    expect(screen.queryByText(/join early access/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/hundreds of jobs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/guaranteed/i)).not.toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Create your account" }),
    ).toHaveAttribute("href", "/register");
    expect(
      screen.getByRole("link", { name: "Browse jobs first" }),
    ).toHaveAttribute("href", "/jobs");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/homepage/final-cta.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write `final-cta.tsx`**

```tsx
import Link from "next/link";

import styles from "./final-cta.module.scss";

export function FinalCta() {
  return (
    <section className={styles.section} aria-labelledby="final-cta-heading">
      <div className={styles.copy}>
        <h2 className={styles.heading} id="final-cta-heading">
          Working now, in Berlin first
        </h2>
        <p className={styles.body}>
          Klinnova is live with an initial group of Berlin employers and
          candidates.
        </p>
      </div>
      <div className={styles.ctas}>
        <Link className={styles.primaryCta} href="/register">
          Create your account
        </Link>
        <Link className={styles.secondaryCta} href="/jobs">
          Browse jobs first
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Write `final-cta.module.scss`**

```scss
@use "../../styles/breakpoints" as *;

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: var(--layout-content-max);
  margin-inline: auto;
  padding: var(--space-10) var(--layout-gutter-mobile);
}

.copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.heading {
  margin: 0;
  font-size: var(--type-heading-size);
  line-height: var(--type-heading-line-height);
  font-weight: var(--type-heading-weight);
  color: var(--color-text-primary);
}

.body {
  margin: 0;
  max-width: 60ch;
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
}

.ctas {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.primaryCta,
.secondaryCta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--touch-target-min);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

.primaryCta {
  border: var(--border-width-default) solid transparent;
  background-color: var(--color-action-primary);
  color: var(--color-action-primary-text);
}

.primaryCta:hover {
  background-color: var(--color-action-primary-hover);
  color: var(--color-action-primary-text);
}

.secondaryCta {
  border: var(--border-width-default) solid var(--color-border-strong);
  background-color: var(--color-bg-surface);
  color: var(--color-text-primary);
}

.secondaryCta:hover {
  background-color: var(--color-bg-subtle);
}

@media (min-width: $breakpoint-md) {
  .section {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-6);
    padding-inline: var(--layout-gutter-tablet);
  }

  .ctas {
    flex-direction: row;
    flex-shrink: 0;
  }
}

@media (min-width: $breakpoint-lg) {
  .section {
    padding-inline: var(--layout-gutter-desktop);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/homepage/final-cta.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/homepage/final-cta.tsx src/components/homepage/final-cta.module.scss src/components/homepage/final-cta.test.tsx
git commit -m "feat: add homepage FinalCta section with approved rollout wording"
```

---

### Task 8: Homepage composition

**Files:**
- Create: `src/components/homepage/homepage.tsx`
- Create: `src/components/homepage/homepage.module.scss`
- Test: `src/components/homepage/homepage.test.tsx`

**Interfaces:**
- Consumes: `ShellHeader` (Task 1), `PublicHero` (Task 2), `ValuePillars` (Task 3), `CandidateJourney` (Task 4), `OpenJobsPreview` (Task 5), `EmployerBand` (Task 6), `FinalCta` (Task 7), `PublicFooter` from `@/components/public-shared/public-footer`, `LoadPublicVacanciesResult` type from `@/lib/public-jobs/load-public-vacancies`.
- Produces: `Homepage({ jobsResult }: { jobsResult: LoadPublicVacanciesResult })`, consumed by `src/app/page.tsx` in Task 9.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Homepage } from "@/components/homepage/homepage";

describe("Homepage", () => {
  it("renders sections in a single-h1 heading order with the old prototype copy gone", () => {
    render(<Homepage jobsResult={{ ok: true, vacancies: [] }} />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { level: 1 }),
    ).toHaveLength(1);

    const headingNames = screen
      .getAllByRole("heading", { level: 2 })
      .map((el) => el.textContent);
    expect(headingNames).toEqual([
      "Made for how Berlin works",
      "You never wonder where it went",
      "Open in Berlin right now",
      "Reach people who can start",
      "Working now, in Berlin first",
    ]);

    expect(
      screen.queryByText(/Candidate experience/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Employer and admin/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/How progress will feel/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/View employer and admin/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Workspace layout/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Desktop structure from the large breakpoint/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        /Candidate registration is available\. Essential onboarding follows/,
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Matching arrives in a later step/),
    ).not.toBeInTheDocument();
  });

  it("keeps the legal footer links present", () => {
    render(<Homepage jobsResult={{ ok: true, vacancies: [] }} />);

    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(within(footer).getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(
      within(footer).getByRole("link", { name: "Impressum" }),
    ).toHaveAttribute("href", "/impressum");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/homepage/homepage.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write `homepage.tsx`**

```tsx
import { CandidateJourney } from "@/components/homepage/candidate-journey";
import { EmployerBand } from "@/components/homepage/employer-band";
import { FinalCta } from "@/components/homepage/final-cta";
import { OpenJobsPreview } from "@/components/homepage/open-jobs-preview";
import { PublicHero } from "@/components/homepage/public-hero";
import { ValuePillars } from "@/components/homepage/value-pillars";
import { PublicFooter } from "@/components/public-shared/public-footer";
import { ShellHeader } from "@/components/shell-header";
import type { LoadPublicVacanciesResult } from "@/lib/public-jobs/load-public-vacancies";

import styles from "./homepage.module.scss";

type HomepageProps = {
  jobsResult: LoadPublicVacanciesResult;
};

export function Homepage({ jobsResult }: HomepageProps) {
  return (
    <>
      <ShellHeader />
      <main className={styles.main}>
        <PublicHero />
        <ValuePillars />
        <CandidateJourney />
        <OpenJobsPreview result={jobsResult} />
        <EmployerBand />
        <FinalCta />
      </main>
      <footer className={styles.footer}>
        <PublicFooter />
      </footer>
    </>
  );
}
```

- [ ] **Step 4: Write `homepage.module.scss`**

```scss
.main {
  display: block;
}

.footer {
  border-top: var(--border-width-default) solid var(--color-border-default);
  background-color: var(--color-bg-surface);
  padding: var(--space-4) 0;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/homepage/homepage.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/homepage/homepage.tsx src/components/homepage/homepage.module.scss src/components/homepage/homepage.test.tsx
git commit -m "feat: compose homepage sections into Homepage component"
```

---

### Task 9: Wire `src/app/page.tsx` to real data; remove the old page shell

**Files:**
- Modify: `src/app/page.tsx`
- Delete: `src/app/page.module.scss`

**Interfaces:**
- Consumes: `Homepage` (Task 8), `loadPublicVacancies` from `@/lib/public-jobs/load-public-vacancies`, `createServerSupabaseClient` from `@/lib/supabase/server` (all pre-existing, already used identically by `src/app/jobs/page.tsx`).

- [ ] **Step 1: Rewrite `src/app/page.tsx`**

```tsx
import { Homepage } from "@/components/homepage/homepage";
import { loadPublicVacancies } from "@/lib/public-jobs/load-public-vacancies";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const jobsResult = await loadPublicVacancies(supabase);

  return <Homepage jobsResult={jobsResult} />;
}
```

- [ ] **Step 2: Delete the now-unused page stylesheet**

```bash
git rm src/app/page.module.scss
```

- [ ] **Step 3: Verify the app builds and typechecks**

Run: `npx tsc --noEmit`
Expected: no new errors. (If `page.module.scss` removal leaves a dangling import anywhere, `tsc`/`next build` will surface it — there should be none, since only the old `page.tsx` imported it.)

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire homepage route to real public vacancy data"
```

---

### Task 10: Remove obsolete prototype components

**Files:**
- Delete: `src/components/candidate-shell.tsx`, `src/components/candidate-shell.module.scss`, `src/components/candidate-shell.test.tsx`
- Delete: `src/components/employer-shell.tsx`, `src/components/employer-shell.module.scss`, `src/components/employer-shell.test.tsx`
- Delete: `src/components/step-progress.tsx`, `src/components/step-progress.module.scss`, `src/components/step-progress.test.tsx`

**Interfaces:** None — verified in research that `CandidateShell`, `EmployerShell`, and `StepProgress` are referenced only by each other, their own tests, and the old `src/app/page.tsx` (already rewritten in Task 9). Safe to delete outright.

- [ ] **Step 1: Confirm nothing else references them**

```bash
grep -rln "CandidateShell\|EmployerShell\|StepProgress" src --include="*.tsx" --include="*.ts"
```

Expected: no output (empty).

- [ ] **Step 2: Delete the files**

```bash
git rm src/components/candidate-shell.tsx src/components/candidate-shell.module.scss src/components/candidate-shell.test.tsx
git rm src/components/employer-shell.tsx src/components/employer-shell.module.scss src/components/employer-shell.test.tsx
git rm src/components/step-progress.tsx src/components/step-progress.module.scss src/components/step-progress.test.tsx
```

- [ ] **Step 3: Run the full unit test suite**

Run: `npx vitest run`
Expected: PASS, with the deleted suites simply absent (no failures from missing imports elsewhere).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove obsolete CandidateShell/EmployerShell/StepProgress prototype components"
```

---

### Task 11: Rewrite the homepage Playwright smoke test; final validation

**Files:**
- Modify: `e2e/shell.spec.ts`

**Interfaces:** None — this is an end-to-end assertion over the composed page from Tasks 1–10.

- [ ] **Step 1: Rewrite `e2e/shell.spec.ts`**

```ts
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

  const candidateCta = page.getByRole("link", { name: "I’m a candidate" });
  await expect(candidateCta).toBeVisible();
  await expect(candidateCta).toHaveAttribute("href", "/register");

  const employerCta = page.getByRole("link", { name: "I’m an employer" });
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
  await expect(
    footer.getByRole("link", { name: "Impressum" }),
  ).toHaveAttribute("href", "/impressum");
});
```

- [ ] **Step 2: Run focused checks locally**

```bash
npm run lint
npm run typecheck
npx vitest run
```

Expected: all three green. Fix any issue before proceeding — do not skip.

- [ ] **Step 3: Run the rewritten Playwright spec**

```bash
npx playwright test e2e/shell.spec.ts
```

Expected: PASS. (Requires the local dev/test server Playwright is configured to launch — follow `playwright.config.ts`'s existing `webServer` setup, no changes needed there.)

- [ ] **Step 4: Manual/responsive + accessibility validation**

Start the dev server and visually check `/` at each required viewport, per the brief's Responsive Requirements section:

```bash
npm run dev
```

Using the browser (or Playwright's `browser_resize` if using an automated check), confirm at 360px, 390px, 430px, a tablet width (e.g. 768px), 1280px, and 1440px:
- no horizontal scroll/overflow on `<body>`,
- both hero CTAs and the mobile "Menu" toggle remain visible and tappable,
- the illustrative cards (hero match preview, candidate timeline, employer applicants) remain legible, not truncated,
- nothing is hidden solely because of viewport size (all content present in the DOM at every width — only CSS reflow differs, per how the components were built).

Also confirm: heading order is h1 → h2 (no skipped levels, verified already by the `Homepage` unit test), all interactive elements are reachable and operable via `Tab`/`Enter` (native `<a>`/`<button>` elements only — no custom click-only `<div>`s were introduced), focus rings are visible (inherited from `:focus-visible` in `globals.scss` plus each new stylesheet's explicit focus rules), and `@media (prefers-reduced-motion: reduce)` continues to disable the entrance animations already defined globally (no new animations were added by this plan, so no new reduced-motion handling is required).

- [ ] **Step 5: Commit**

```bash
git add e2e/shell.spec.ts
git commit -m "test: rewrite homepage Playwright smoke test for the new public page"
```

- [ ] **Step 6: Report — STOP BEFORE MERGE**

Do not open a PR or merge. Prepare the Founder-facing report using the "FINAL REPORT" structure from the brief: branch name, base SHA (`9411217cb906bc6d4e8c76882f8af7bd6f8acc48`), head SHA (`git rev-parse HEAD` after Task 11's commit), full file diff list (`git diff --stat 9411217cb906bc6d4e8c76882f8af7bd6f8acc48..HEAD`), the "Design deviations" section from the top of this plan verbatim as the design-reconciliation answer, a product-truth reconciliation confirming every displayed concept traces to a real code path (this plan's "Global Constraints" and per-task "Interfaces" sections are the evidence trail), the responsive/accessibility findings from Step 4, the exact test commands and their results from Steps 2–3, and end with: **STOPPED BEFORE MERGE — AWAITING FOUNDER APPROVAL. Do not merge.**
