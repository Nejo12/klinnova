# Klinnova

**One step closer.**

Klinnova is a multilingual employment platform designed to help people be seen for what they can contribute, especially when language, local experience, or conventional hiring systems make that difficult.

The initial product focuses on Berlin and on people who are legally allowed to work in Germany but may speak little or no German. It connects candidates with verified, accessible opportunities in sectors such as cleaning, hospitality, logistics, warehousing, food production, moving, retail, and other operational roles.

Production: https://klinnova.com

## Core belief

> Everyone deserves to be seen for what they can contribute.

## Mission

Help people move forward through meaningful work.

## Vision

A world where opportunity is determined by potential, not circumstance.

## Brand promise

Every interaction should move someone one step closer.

## Product thesis

Klinnova is not another generic job board. It is a trusted employment-access platform built around:

- verified language requirements;
- fresh and legitimate vacancies;
- simple, low-friction candidate onboarding;
- reusable candidate profiles;
- transparent job information;
- employer verification;
- application support without unnecessary bureaucracy;
- visible progress through the hiring journey.

## Current phase

Klinnova is in **M5 — Berlin private beta**.

The K6 Production/public-domain cutover is complete and `https://klinnova.com` is the canonical Production origin. Operational readiness and Cohort A external market entry remain **on hold until explicit Founder resumption**. Production Sentry remains **OFF/unwired** unless separately authorized.

Because execution state changes more frequently than this README should, use the durable sources below rather than treating historical implementation documents as the current operating status:

- [Founder dashboard](docs/14-founder-dashboard.md)
- [M5.1 beta-readiness closure](docs/53-m5.1-beta-readiness-closure.md)
- [K6 Production-cutover durable closure](docs/56-k6-production-cutover-durable-closure.md)
- [Decision log](docs/10-decisions.md)

Historical planning, discovery, implementation and closure documents intentionally retain the terminology and state that applied when they were written.

## M5 targets

| Metric                  | Target |
| ----------------------- | -----: |
| Participating employers |     20 |
| Verified vacancies      |    100 |
| Candidates              |    200 |
| Completed interviews    |     10 |
| Confirmed hires         |      3 |

### Staged cohorts

| Cohort         | Employers | Legitimate vacancies | Candidates | Outcome gate                                |
| -------------- | --------: | -------------------: | ---------: | ------------------------------------------- |
| A — Proof      |       3–5 |                10–20 |      20–30 | first completed interview                   |
| B — Validation |      8–10 |                30–50 |     60–100 | repeated interviews + first confirmed hire  |
| C — Full M5    |        20 |                  100 |        200 | 10 completed interviews + 3 confirmed hires |

## Delivered core product

### Candidate

- email/password authentication;
- six-step essential onboarding with durable progress;
- language, German-comfort, work-authorisation, location, availability and preferences;
- deterministic explainable matching;
- public and authenticated job discovery;
- job detail and profile-based application;
- reload-safe confirmation;
- application inventory and status history;
- candidate-safe interview/hire outcome visibility;
- account export and deletion controls.

### Employer

- private and organisation employer onboarding;
- employer/company profiles;
- type-specific manual verification workflow;
- structured vacancy draft/create/edit;
- publish/pause/resume/fill/withdraw/expiry/renew lifecycle;
- public vacancy visibility through effective-public rules;
- applicant list/detail and application status transitions;
- employer interview/hire outcome record/void flow;
- moderation/suspension-aware business operations;
- account export and whole-account deletion flow.

### Administration / trust

- verification operator flow;
- employer suspension;
- vacancy moderation/restoration;
- audit events;
- legal surfaces;
- deterministic pilot-funnel proof including outcome metrics;
- account privacy/export/deletion controls;
- privacy-conscious Sentry repository integration with hosted Preview verification.

## Deliberately deferred for initial M5

- optional CV upload;
- save/unsave jobs;
- real-time chat;
- public reviews/ratings;
- AI/vector matching;
- native apps;
- payroll/payments;
- subscriptions/billing;
- full ATS functionality;
- video interviews;
- multi-city rollout;
- unrestricted scraping;
- sophisticated analytics dashboards;
- PostHog/session replay.

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
- [M5 beta transition and measurement](docs/49-m5-beta-transition-and-measurement.md)
- [M5 operating plan](docs/51-m5-operating-plan.md)
- [Preview environment runbook](docs/52-preview-environment-runbook.md)
- [M5.1 beta-readiness closure](docs/53-m5.1-beta-readiness-closure.md)
- [K6 Production-cutover durable closure](docs/56-k6-production-cutover-durable-closure.md)
- [Not now](NOT_NOW.md)
- [Agent instructions](AGENTS.md)

Historical slice-specific discovery/build-plan/proposal/closure files remain in `docs/` and should be used when auditing an accepted implementation contract.

## Agent development

Repository agent governance starts in [AGENTS.md](AGENTS.md). Codex project setup, reusable Klinnova skills, and the Founder-controlled workflow are documented in [docs/agent/README.md](docs/agent/README.md).

## Local development

### Prerequisites

- Node.js 20 or newer;
- pnpm 8 or newer;
- Docker or another compatible container runtime for local Supabase.

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
- `SUPABASE_SERVICE_ROLE_KEY` is used only by isolated server-only privileged paths and must never be exposed through `NEXT_PUBLIC_*`, client components, ordinary loaders, or general SSR session code.
- Local destructive integration tests are guarded to localhost/local Supabase.
- Routine development must not link or mutate a hosted Supabase project through the local CLI.
- Never paste credentials into issues, PRs, docs, or chat.

### Hosted environments

Production is canonical at `https://klinnova.com`.

Preview remains isolated from Production and is available through Vercel-generated Preview deployments. Historical/internal infrastructure identifiers may still contain the former project name; those identifiers are not automatically renamed because doing so could affect operational infrastructure or historical evidence.

Production Sentry remains intentionally OFF/unwired unless separately authorized by the Founder.

## Tests and CI

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

## Guiding question

> Does this help someone take one meaningful step toward work — and does the beta evidence show that it matters?
