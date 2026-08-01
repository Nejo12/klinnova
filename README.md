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
- progress that is visible throughout the journey

## MVP objective

Validate that candidates with limited German can:

1. create a useful profile quickly
2. receive relevant job matches
3. understand whether they can actually do a job
4. apply without a German CV being mandatory
5. track their progress from application to interview

At the same time, validate that employers can:

1. publish a clear vacancy
2. specify realistic language requirements
3. receive suitable applicants
4. review candidates efficiently
5. communicate next steps clearly

## Initial scope

### Candidate

- authentication
- six-step onboarding
- language and German-level selection
- work-authorisation self-declaration
- location and travel-radius preferences
- job-category preferences
- availability and employment-type preferences
- matched job feed
- job detail page
- save job
- simple application
- application tracking
- profile completion guidance

### Employer

- employer account
- company profile
- vacancy creation
- language-requirement configuration
- salary, shift, location, and contract details
- applicant list
- candidate review
- application status updates
- vacancy expiry and closing

### Administration

- employer verification
- vacancy moderation
- user and employer reports
- stale-job removal
- audit trail
- basic analytics

## Out of scope for the first release

- payroll
- worker payments
- freelancer classification
- temporary-employment agency operations
- video interviewing
- native mobile applications
- social networking
- public candidate scraping
- automated employment decisions
- complex AI-branded features
- broad nationwide expansion

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
- [Slice 0 build plan](docs/15-slice-0-build-plan.md) (complete; historical)
- [Slice 1 build plan](docs/16-slice-1-build-plan.md)
- [Slice 1 schema proposal](docs/17-slice-1-schema-proposal.md)
- [Not now](NOT_NOW.md)
- [Agent instructions](AGENTS.md)

## Development status

Delivery follows a solo vertical-slice workflow tracked in `docs/14-founder-dashboard.md`. Slice 0 is complete. Slice 1 is in progress (PR 1.1 schema/RLS merged; PR 1.2 Auth foundation). Product scope remains `docs/04-mvp.md`.

## Local development

### Prerequisites

- Node.js 20 or newer (see `package.json` `engines`)
- [pnpm](https://pnpm.io/) 8 or newer
- Docker or another compatible container runtime (required to run local Supabase)

A separately installed global Supabase CLI is **not** required. `pnpm install` installs the repository-pinned CLI (`supabase` in `devDependencies`). Scripts invoke that local binary via pnpm.

### Setup

1. Install the repository’s supported Node version.
2. Ensure Docker (or a compatible container runtime) is running.
3. Install dependencies (includes the pinned Supabase CLI):

```bash
pnpm install
```

4. Create a local environment file from the committed example (never commit real secrets; never paste keys into chat, issues, or pull requests):

```bash
cp .env.example .env.local
```

5. Start local Supabase:

```bash
pnpm supabase:start
```

6. Inspect local connection values:

```bash
pnpm supabase:status
```

7. Copy into `.env.local`:

- `API URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `Publishable` / browser-safe key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Prefer the CLI `Publishable` key when present. Older CLI output may label the same browser-safe value as `anon key`; paste that value into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the application variable name describes the Next.js public boundary, not the CLI label.

8. Apply migrations (local database reset) and run schema/RLS tests:

```bash
pnpm supabase:db:reset   # local-only; recreates DB from migrations (no product seed)
pnpm supabase:test:db    # pgTAP tests in supabase/tests/database
```

9. (Optional) Regenerate committed database types after schema changes:

```bash
pnpm db:types            # writes src/types/database.ts from local public schema
pnpm db:types:check      # fails if committed types are stale
```

Generated `Insert` / `Update` types describe table shape only. They do **not** encode PostgreSQL column grants or RLS. Application mutations must use narrow validated inputs that omit server-owned fields (`onboarding_completed_at`, `work_authorisation_declared_at`) and must not treat generated types as authorization.

10. Start the Next.js app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Register at `/register`, confirm via Mailpit/Inbucket (`pnpm supabase:status` → Mailpit URL), sign in at `/login`, then continue essentials at `/candidate/onboarding`.

11. When finished, stop local Supabase:

```bash
pnpm supabase:stop
```

### Authentication (PR 1.2) and essential onboarding (PR 1.3)

- Email/password registration with required email confirmation
- Cookie-based SSR sessions; refresh via `src/proxy.ts` (`getClaims()`)
- Protected `/candidate/*` (anonymous → `/login`)
- Idempotent `candidate_profiles` creation after signup/confirm/login (no Auth DB trigger)
- Confirmation callback: `/auth/confirm` (supports `token_hash` + `type`, and PKCE `code`)
- Essential onboarding at `/candidate/onboarding` with durable per-section save (D-025 allow-lists)
- Progress derived from persisted fields; provisional review when essentials look complete (not authoritative completion)
- Persists `work_authorisation_declared` boolean; leaves `work_authorisation_declared_at` and `onboarding_completed_at` null until PR 1.4
- No password-recovery UI yet (before-pilot)
- No service-role key for browser or ordinary SSR sessions

Local Auth + onboarding journeys (requires local Supabase + Mailpit):

```bash
pnpm test:e2e:onboarding
```

Hosted Preview/Production Auth uses the repository owner’s Supabase project, Vercel public env, Site URL `https://stint.company`, and the configured redirect allow-list.

### Local-only notes

- No Supabase account is needed for local development.
- Do not run `supabase login`.
- Do not link a remote Supabase project from the CLI for routine work.
- Candidate schema, Auth foundation, and essential onboarding forms exist; controlled completion is PR 1.4.
- Database seeding is disabled (`supabase/config.toml`); pgTAP tests create transactional fixtures.
- No service-role or secret key is required. Browser/SSR session paths use the publishable key + user cookies and RLS.
- `pnpm supabase:db:reset` is local-only and destructive to the local database containers’ data.
- Anonymous clients have no table privileges on candidate tables, so denied access surfaces as permission errors (`42501`), not empty result sets.
- Sentry and PostHog remain deferred in `NOT_NOW.md`.

### Tests and CI

Unit and component tests use Vitest + React Testing Library (no Docker required):

```bash
pnpm test          # watch mode
pnpm test:run      # single deterministic run
pnpm test:coverage # deterministic run with coverage (text + html)
```

Database schema/RLS tests (Docker + local Supabase required):

```bash
pnpm supabase:start
pnpm supabase:db:reset
pnpm supabase:test:db
pnpm db:types:check
pnpm supabase:stop
```

End-to-end smoke (Playwright) expects a production build first:

```bash
pnpm build
pnpm exec playwright install chromium   # once per machine
pnpm test:e2e
```

GitHub Actions (`.github/workflows/ci.yml`) runs two jobs on pull requests and pushes to `main`:

1. Format check, lint, typecheck, unit coverage, production build, Playwright shell smoke
2. Local Supabase start → migrate/reset → pgTAP schema/RLS tests → generated types check

The app job uses non-secret scaffold public values only:

- `NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=stint-ci-scaffold-not-connected`

These values satisfy validation and build. They do not connect to a hosted Supabase project. The database job uses ephemeral local CLI values and does not require GitHub secrets.

### Deployment (Vercel)

The repo is configured as a Next.js app via `vercel.json`. Preview deployments run for pull requests; production deploys from `main`.

Set these browser-safe variables in the Vercel project for Preview and Production (placeholders are enough until a hosted Supabase project exists):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Do not add a service-role or secret key unless a later slice explicitly requires a server-only secret. Do not paste real credentials into issues or pull requests.

### Environment variables

| Variable                                 | Required locally | Exposure               | Notes                                                                    |
| ---------------------------------------- | ---------------- | ---------------------- | ------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`               | Yes              | Browser-safe           | Local default is `http://127.0.0.1:54321`                                |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`   | Yes              | Browser-safe           | From `pnpm supabase:status` (`Publishable` key; legacy label `anon key`) |
| `SUPABASE_SERVICE_ROLE_KEY` / secret key | No               | Server-only (deferred) | Not required for the current shell; do not expose via `NEXT_PUBLIC_*`    |

Environment access goes through `src/lib/env/`. Do not read `process.env` ad hoc in application code.

### Scripts

| Command                  | Purpose                                     |
| ------------------------ | ------------------------------------------- |
| `pnpm dev`               | Start the Next.js development server        |
| `pnpm build`             | Create a production build                   |
| `pnpm start`             | Serve the production build                  |
| `pnpm lint`              | Run ESLint                                  |
| `pnpm typecheck`         | Run TypeScript (`tsc --noEmit`)             |
| `pnpm format`            | Format files with Prettier                  |
| `pnpm format:check`      | Check Prettier formatting                   |
| `pnpm test`              | Vitest watch mode                           |
| `pnpm test:run`          | Vitest single run                           |
| `pnpm test:coverage`     | Vitest run with coverage                    |
| `pnpm test:e2e`          | Playwright shell smoke                      |
| `pnpm supabase:start`    | Start local Supabase (project-pinned CLI)   |
| `pnpm supabase:stop`     | Stop local Supabase                         |
| `pnpm supabase:status`   | Show local URL and keys                     |
| `pnpm supabase:db:reset` | Reset local DB from migrations (local-only) |
| `pnpm supabase:test:db`  | Run pgTAP schema/RLS tests                  |
| `pnpm db:types`          | Generate `src/types/database.ts` locally    |
| `pnpm db:types:check`    | Fail if generated types are stale           |

## Guiding question

> Does this help someone take one meaningful step toward work?
