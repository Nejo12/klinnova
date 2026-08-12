# Stint

**One step closer.**

Stint is a multilingual employment platform designed to help people be seen for what they can contribute, especially when language, local experience, or conventional hiring systems make that difficult.

The initial product focuses on Berlin and on people who are legally allowed to work in Germany but may speak little or no German. It connects them with verified, accessible opportunities in sectors such as cleaning, hospitality, logistics, warehousing, food production, moving, retail, and other operational roles.

## Core belief

> Everyone deserves to be seen for what they can contribute.

## Mission

Help people move forward through meaningful work.

## Vision

A world where opportunity is determined by potential, not circumstance.

## Brand promise

Every interaction should move someone one step closer.

## Product thesis

Stint is not another generic job board. It is a trusted employment-access platform built around:

- verified language requirements
- fresh and legitimate vacancies
- simple, low-friction candidate onboarding
- reusable candidate profiles
- transparent job information
- employer verification
- application support without unnecessary bureaucracy
- visible progress through the hiring journey

## Current phase — M5 Berlin private beta

M0–M4 implementation is complete through merged PR #73. Slice 8 is complete and M4 — Trust and beta readiness — is closed.

**M5 is active.** It is an operational/product-validation phase, not another broad implementation milestone.

M5.1 beta-readiness execution is recovered and tracked durably in `docs/53-m5.1-beta-readiness-closure.md`. Units A through G2 are complete; **Unit H — legal/support readiness finalization — is the exact current next unit and has not started**. Unit I has baseline investigation evidence but is not formally closed. **Cohort A readiness is currently BLOCKED.**

Overall M5 targets:

- 20 participating employers
- 100 verified vacancies
- 200 candidates
- 10 completed interviews
- 3 confirmed hires

Staged cohorts:

| Cohort         | Employers | Legitimate vacancies | Candidates | Outcome gate                                |
| -------------- | --------: | -------------------: | ---------: | ------------------------------------------- |
| A — Proof      |       3–5 |                10–20 |      20–30 | first completed interview                   |
| B — Validation |      8–10 |                30–50 |     60–100 | repeated interviews + first confirmed hire  |
| C — Full M5    |        20 |                  100 |        200 | 10 completed interviews + 3 confirmed hires |

Founder-approved beta boundary:

- the merged M4 product is the minimum Cohort A boundary;
- speculative feature expansion is frozen unless evidence shows a beta need;
- completed interviews and confirmed hires are measured separately from application workflow status;
- application status `accepted` never automatically counts as a confirmed hire;
- optional CV upload and save/unsave jobs are deferred for initial M5;
- minimal privacy-conscious Sentry error monitoring is required before Cohort A external traffic; Preview implementation/verification is complete through G1/G2, while Production Sentry remains intentionally unwired pending the separate legal/privacy/activation decision;
- PostHog/session replay remain deferred.

See:

- [M5 beta transition and measurement](docs/49-m5-beta-transition-and-measurement.md)
- [M5 outcome contract proposal](docs/50-m5-outcome-contract-proposal.md)
- [M5 operating plan](docs/51-m5-operating-plan.md)
- [M5.1 beta-readiness closure](docs/53-m5.1-beta-readiness-closure.md)
- [Founder dashboard](docs/14-founder-dashboard.md)

M5.0 itself did not authorize product/schema outcome implementation. Subsequent separately authorized M5.1 Units D/E implemented the outcome contract; current execution state is recorded in `docs/53-m5.1-beta-readiness-closure.md` while the M5.0 documents retain their historical meaning.

## MVP objective

Validate that candidates with limited German can:

1. create a useful profile quickly
2. receive relevant job matches
3. understand whether they can actually do a job
4. apply without a German CV being mandatory
5. track their progress from application toward interview/hire outcomes

At the same time, validate that employers can:

1. publish a clear vacancy
2. specify realistic language requirements
3. receive suitable applicants
4. review candidates efficiently
5. communicate/update next steps clearly
6. produce trustworthy interview/hire outcome evidence for the beta

## Delivered core product

### Candidate

- email/password authentication
- six-step essential onboarding with durable progress
- language/German-comfort/work-authorisation/location/availability/preferences
- deterministic explainable matching
- public and authenticated job discovery
- job detail
- profile-based application
- reload-safe confirmation
- application inventory and status history
- candidate-safe interview/hire outcome visibility
- account export
- account deletion request/confirmation/cancellation

### Employer

- private and organisation employer onboarding
- employer/company profiles
- type-specific manual verification workflow
- structured vacancy draft/create/edit
- publish/pause/resume/fill/withdraw/expiry/renew lifecycle
- public vacancy visibility through effective-public rules
- applicant list/detail
- application status transitions
- employer interview/hire outcome record/void flow
- moderation/suspension-aware business operations
- account export and whole-account deletion flow

### Administration / trust

- verification operator flow
- employer suspension
- vacancy moderation/restoration
- audit events
- legal-page placeholders
- deterministic pilot funnel proof including outcome metrics
- account privacy/export/deletion controls
- privacy-conscious Sentry repository integration with hosted Preview verification

## Deliberately deferred for initial M5

These remain product possibilities or longer-term MVP intent, but do not block Cohort A under the approved beta freeze:

- optional CV upload
- save/unsave jobs
- real-time chat
- public reviews/ratings
- AI/vector matching
- native apps
- payroll/payments
- subscriptions/billing
- full ATS functionality
- video interviews
- multi-city rollout
- unrestricted scraping
- sophisticated analytics dashboards
- PostHog/session replay

See [Not now](NOT_NOW.md) and [MVP scope](docs/04-mvp.md).

## Brand system

- **Core emotion:** Seen
- **Product experience:** Progress
- **Human outcome:** Dignity
- **Tagline:** One step closer.
- **Primary visual motif:** the step path
- **Visual tone:** calm, editorial, restrained, human
- **Primary palette:** oxblood, warm neutrals, clay, and olive
- **AI principle:** invisible labour; describe outcomes, not the technology

## Documentation

Core source-of-truth documents:

- [Vision](docs/01-vision.md)
- [Product principles](docs/02-principles.md)
- [Users](docs/03-users.md)
- [MVP scope](docs/04-mvp.md)
- [Feature specification](docs/05-features.md)
- [Design system](docs/06-design-system.md)
- [Architecture](docs/07-architecture.md)
- [Non-functional requirements](docs/08-non-functional.md)
- [Roadmap](docs/09-roadmap.md)
- [Decision log](docs/10-decisions.md)
- [Anti-goals](docs/11-anti-goals.md)
- [Terminology](docs/12-terminology.md)
- [Implementation plan](docs/13-implementation-plan.md)
- [Founder dashboard](docs/14-founder-dashboard.md)
- [Slice 8 / M4 closure proof](docs/48-slice-8-exit-proof.md)
- [M5 beta transition and measurement](docs/49-m5-beta-transition-and-measurement.md)
- [M5 outcome contract proposal](docs/50-m5-outcome-contract-proposal.md)
- [M5 operating plan](docs/51-m5-operating-plan.md)
- [Preview environment runbook](docs/52-preview-environment-runbook.md)
- [M5.1 beta-readiness closure](docs/53-m5.1-beta-readiness-closure.md)
- [Not now](NOT_NOW.md)
- [Agent instructions](AGENTS.md)

Historical slice-specific discovery/build-plan/proposal/closure files remain in `docs/` and should be used when auditing an accepted implementation contract.

## Engineering baseline at M4 closure

- migrations: **16**
- pgTAP: **1441/1441** across 33 files
- Vitest: **983 passed / 3 skipped**
- broad M5-relevant E2E closure sweep: **38/38**
- generated database types: no drift
- build: PASS
- Slice 8 local exit proof: PASS

M5 should not optimize for increasing test counts. New tests should follow real behavior/risk changes.

## Local development

### Prerequisites

- Node.js 20 or newer (see `package.json` `engines`)
- pnpm 8 or newer
- Docker or another compatible container runtime for local Supabase

A separately installed global Supabase CLI is not required. `pnpm install` installs the repository-pinned CLI.

### Setup

```bash
pnpm install
cp .env.example .env.local
pnpm supabase:start
pnpm supabase:status
```

Copy the local browser-safe values into `.env.local`:

- `API URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `Publishable` / legacy `anon` browser-safe key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Then reset/test the local database and start the app:

```bash
pnpm supabase:db:reset
pnpm supabase:test:db
pnpm db:types:check
pnpm dev
```

Open `http://localhost:3000`.

When finished:

```bash
pnpm supabase:stop
```

### Important environment/security boundaries

- Browser and ordinary SSR session paths use the publishable key + user cookies and RLS.
- `SUPABASE_SERVICE_ROLE_KEY` is used only by the isolated server-only account-deletion privileged processor introduced in Slice 8; it must never be exposed through `NEXT_PUBLIC_*`, client components, ordinary loaders, or general SSR session code.
- Local destructive deletion integration tests are guarded to localhost/local Supabase.
- Routine development must not link or mutate a hosted Supabase project through the local CLI.
- Never paste credentials into issues, PRs, docs, or chat.

### Hosted environments

Production remains the current hosted environment.

Preview is now provisioned: a persistent, isolated Supabase project (`stint-preview`), separate from Production in every respect, with a verified Resend-backed confirmation-email path and Vercel Preview-scoped environment variables. Provisioned and accepted **2026-08-11** (M5.1 Unit F2). `docs/52-preview-environment-runbook.md` is the full provisioning record and acceptance evidence.

Minimal Sentry is implemented in the repository (G1) and verified in hosted Preview (G2), including client/server capture, source maps and privacy inspection. Production Sentry remains intentionally unwired pending the separate legal/privacy/activation decision; see `docs/53-m5.1-beta-readiness-closure.md`.

Hosted Demo vacancy fixtures are owner-run only and never applied by migrations/CI/build/deploy. Retained Production Demo fixtures must be removed or explicitly re-authorized by **2026-09-02**.

### Tests and CI

Core checks:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
pnpm supabase:db:reset
pnpm supabase:test:db
pnpm db:types:check
pnpm proof:migrations
pnpm proof:pilot-funnel
```

GitHub Actions runs application and local database/schema/RLS checks on pull requests and pushes to `main`.

CI scaffold public values satisfy build-time validation only; they do not connect CI to the hosted Production project.

## Deployment / M5 readiness

Vercel remains the deployment platform.

Before intentional Cohort A external traffic:

1. ~~restore isolated Preview Supabase/environment configuration~~ — **done 2026-08-11**, see `docs/52-preview-environment-runbook.md`;
2. ~~implement and verify minimal privacy-conscious Sentry in Preview~~ — **done through M5.1 G1/G2**; Production Sentry remains intentionally unwired pending separate legal/privacy/activation approval;
3. complete **Unit H** external-facing legal/support readiness: qualified German review/finalization of Impressum/business identity, Privacy notice, beta Terms, support/contact channel, and any required Sentry disclosure;
4. complete/formally close **Unit I** device/browser/accessibility/readiness proof and evidence-backed remediation/disposition;
5. keep Production Demo fixtures out of M5 metrics and clean/re-authorize them by **2026-09-02**;
6. complete Cohort A employer/candidate acquisition and founder-assisted support preparation.

**Current Cohort A readiness: BLOCKED.** See `docs/53-m5.1-beta-readiness-closure.md`.

No PostHog/session replay or broad observability/analytics platform is authorized for Cohort A.

## Guiding question

> Does this help someone take one meaningful step toward work — and does the beta evidence show that it matters?
