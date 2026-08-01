# Slice 0 Build Plan

> Historical build plan for Slice 0. Acceptance criteria below are preserved as originally written.
>
> **Completion note (2026-08-01):** Slice 0 is complete. PR 0.1–0.4 are merged; CI is green; Vercel Preview and Production were confirmed. Active delivery tracking moved to `docs/14-founder-dashboard.md`. Slice 1 planning lives in `docs/16-slice-1-build-plan.md` and `docs/17-slice-1-schema-proposal.md`.

> Planning artifact only. No application code lands in this document.
> Execute as **four sequential PRs**. Each PR must leave `main` deployable.

**Goal:** Deliver a deployable, tested application shell with Stint design tokens and reproducible local setup — the Slice 0 outcome in `docs/13-implementation-plan.md`.

**Baseline (at plan authoring):** The repository was documentation-only; Slice 0 introduced the application.

**Active tracking:** `docs/14-founder-dashboard.md`

---

## Source of truth

| Doc | Role |
|-----|------|
| `docs/04-mvp.md` | Product scope boundary (do not expand) |
| `docs/13-implementation-plan.md` | Slice order and exit criteria |
| `docs/14-founder-dashboard.md` | Current focus |
| `docs/06-design-system.md` | Tokens, layout, device strategy |
| `docs/07-architecture.md` | Stack, folders, device strategy |
| `docs/08-non-functional.md` | CI, performance, a11y, device support |
| `docs/10-decisions.md` | Especially D-011 (stack), D-016 (device strategy) |
| `NOT_NOW.md` | Deferred work (do not implement) |
| `AGENTS.md` | Engineering rules |

When documents conflict, stop and report. Do not invent a resolution.

---

## Slice exit criteria

Slice 0 is done only when all of the following are true:

1. `main` deploys successfully (Vercel production or equivalent linked to `main`)
2. lint, type-check, unit tests, and production build run in CI
3. local setup is documented and reproducible from a clean machine

---

## Global constraints

- Responsive web only (D-016): candidate surfaces mobile-first; employer/admin desktop-first with functional mobile fallback; no native apps
- Strict TypeScript; no `any`
- Absolute imports; lowercase directories; one React component per file; minimal barrels
- Server Components by default; Client Components only when interactivity requires them
- SCSS Modules and CSS custom properties; no Tailwind
- No product features from Slice 1+ (auth, onboarding, matching, vacancies, applications, admin moderation)
- No items from `NOT_NOW.md`
- No domain schema migrations until a schema proposal is reviewed (see PR 0.3)
- Prefer the smallest change that meets the PR acceptance criteria

---

## Why four PRs (not three or five)

| Option | Trade-off |
|--------|-----------|
| **3 PRs** | Faster merge count, but design tokens + tooling + backend scaffolding pile into oversized reviews |
| **4 PRs (chosen)** | Each PR is independently reviewable and deployable; risk isolated to one concern |
| **5 PRs** | Splitting tests from CI/deploy adds ceremony without reducing risk at this stage |

Recommended sequence:

```text
PR 0.1 App shell + tooling
  -> PR 0.2 Design tokens + responsive shell
    -> PR 0.3 Env validation + Supabase local scaffolding
      -> PR 0.4 Tests, CI, and deployment
```

Do not open PR *N+1* until PR *N* is merged (or explicitly parked with a dashboard note).

---

## Target tree (Slice 0 end state)

Align with `docs/07-architecture.md`. Slice 0 creates the skeleton; feature modules stay empty or absent until later slices.

```text
/
  package.json
  tsconfig.json
  eslint / prettier config
  next.config.*
  .env.example
  README.md (local setup)
  .github/workflows/ci.yml
  supabase/                 # local config only; no domain migrations yet
  src/
    app/                    # App Router shell routes
    components/ui/          # only primitives needed for the shell
    lib/                    # env, supabase clients, shared utils
    styles/                 # tokens + global styles
    types/
```

Exact filenames are chosen at implementation time; keep the layout above.

---

## PR 0.1 — App shell and engineering toolchain

**Intent:** Bootstrapped Next.js App Router app that builds, lints, and type-checks.

**Includes:**

- Next.js App Router + React + strict TypeScript
- ESLint and Prettier configured for the repo
- Absolute imports (`@/` or project convention)
- Minimal home route proving the app renders
- `package.json` scripts: at least `dev`, `build`, `lint`, `typecheck` (or equivalent)
- `.gitignore` and Node/tooling ignores appropriate for Next.js
- README section: prerequisites and how to run locally (will grow in later PRs)

**Explicitly excludes:**

- Full design system / token palette (PR 0.2)
- Supabase, env schema, auth (PR 0.3 / Slice 1)
- Vitest, Playwright, CI, Vercel (PR 0.4)
- Sentry / PostHog (`NOT_NOW.md`)
- Product routes beyond a shell home page

**Acceptance criteria:**

- [ ] Production build succeeds locally
- [ ] Lint and type-check succeed locally
- [ ] Absolute imports work for the home route
- [ ] `main` remains deployable after merge (Vercel project may be wired here or confirmed in PR 0.4; app must be buildable either way)

**Verification:**

- Run lint, type-check, and production build from a clean install
- Smoke-open the home route in local `dev`

---

## PR 0.2 — Design tokens and responsive shell

**Intent:** Encode Stint visual foundation and D-016 device strategy in the running shell.

**Includes:**

- SCSS Modules + CSS custom properties for the v1 palette (oxblood, warm paper/cream, clay, olive, near-black text)
- Typography baseline (product UI sans-serif; readable body on small screens)
- Spacing, focus, and touch-target foundations (≥ 44×44 CSS px)
- Step-motif tokens or a minimal non-decorative step indicator used only to prove the motif (favicon/app icon may be placeholder-quality)
- Shell layout that demonstrates:
  - candidate-oriented surface: mobile-first
  - employer/admin-oriented surface: desktop-first with functional mobile fallback
- Reduced-motion respect at the global level
- No Tailwind

**Explicitly excludes:**

- Full MVP component library (buttons, forms, job cards, drawers, etc.) — only what the shell needs
- Auth, onboarding, job list UI
- Marketing landing redesign beyond a calm branded shell

**Acceptance criteria:**

- [ ] Design tokens live as CSS custom properties consumed by SCSS Modules
- [ ] Shell visually reflects the restrained oxblood / warm-neutral system (not generic SaaS blue/purple)
- [ ] Candidate and employer/admin shell regions follow D-016 breakpoints/layout intent
- [ ] Lint, type-check, and production build still pass

**Verification:**

- Manual resize check: candidate shell usable at common phone widths; employer/admin shell usable on desktop and still operable on a narrow viewport
- Confirm no Tailwind dependency was introduced

---

## PR 0.3 — Environment validation and Supabase local scaffolding

**Intent:** Reproducible backend wiring without product features or unreviewed domain schema.

**Includes:**

- Zod-validated environment module (fail fast on missing/invalid public and server env)
- `.env.example` documenting required variables (no secrets committed)
- Supabase local project scaffolding (`supabase/` config) and typed client helpers for browser/server as needed by the shell
- Documented local setup: install, env copy, Supabase start, app start
- Connection/smoke path that proves config loads (no auth UI, no candidate/employer flows)

**Explicitly excludes:**

- Domain migrations for profiles, jobs, applications, etc. (schema proposal + review before any domain migration lands; expected from Slice 1 onward)
- Auth UI, RLS policies for product tables, Storage buckets for CVs
- Resend / email templates

**Acceptance criteria:**

- [ ] Invalid or missing required env fails clearly at startup or in a dedicated validation entrypoint
- [ ] Local Supabase can be started from documented steps
- [ ] App builds with validated env in CI-safe modes (dummy/public placeholders where appropriate)
- [ ] README local setup is reproducible end-to-end for shell + Supabase
- [ ] No unreviewed domain schema migrations

**Verification:**

- Follow README from a clean clone (or simulate): env example → Supabase local → `dev`
- Confirm secrets are not committed

---

## PR 0.4 — Tests, CI, and deployment

**Intent:** Close Slice 0 exit criteria: CI green and deployable previews/production.

**Includes:**

- Vitest + Testing Library (+ MSW ready for later API mocking)
- Playwright scaffolding for critical journeys (one smoke test against the shell is enough)
- GitHub Actions workflow: lint, type-check, unit tests, production build
- Vercel preview deployments wired for PRs; production deploy from `main`
- README updates for test and CI expectations

**Explicitly excludes:**

- Full E2E coverage of candidate/employer journeys (later slices)
- Sentry and PostHog (or equivalent) scaffolding — parked in `NOT_NOW.md`
- Funnel analytics events
- Performance budgets beyond a documented placeholder note if not yet measurable

**Acceptance criteria:**

- [ ] CI runs lint, type-check, unit tests, and production build on PRs
- [ ] At least one unit test and one Playwright smoke test pass in CI (or documented local Playwright job if CI browser setup is staged — prefer both in CI)
- [ ] Vercel preview works for the PR branch; `main` deploys successfully
- [ ] Slice 0 exit criteria checklist can be marked complete

**Verification:**

- Open a PR and confirm CI + preview
- Merge to `main` and confirm production deploy
- Update `docs/14-founder-dashboard.md` (Slice 0 → Done; activate Slice 1)

---

## Slice close checklist

Before marking Slice 0 done in the founder dashboard:

- [ ] All four PRs merged
- [ ] `main` deploys successfully
- [ ] CI green for lint, type-check, unit tests, build
- [ ] README local setup verified on a clean path
- [ ] D-016 respected in shell layout
- [ ] No Slice 1+ product behavior shipped
- [ ] No `NOT_NOW.md` items shipped
- [ ] Accessibility baseline present (focus styles, reduced motion, semantic shell landmarks)
- [ ] Founder dashboard updated to Slice 1

---

## Out of scope reminders

Do **not** pull these into Slice 0 even if scaffolding makes them easy:

- Registration, roles, onboarding persistence
- Matching, seed vacancies, job detail, applications
- Employer company/vacancy flows, verification UI
- Admin moderation, reports, audit UI
- Account export/deletion
- Native mobile applications
- Sentry and PostHog (or equivalent) scaffolding
- Tailwind, microservices, Redis, vector search, real-time chat

Park temptations in `NOT_NOW.md`.

---

## Execution notes for implementers

1. One PR at a time; keep diffs focused on that PR’s acceptance criteria.
2. Prefer vertical readiness of the foundation (tooling that works) over speculative abstractions.
3. Update docs only when setup or conventions change; do not rewrite MVP scope.
4. After Slice 0 closes, schema proposal for Slice 1 should be reviewed before migrations land.
)
