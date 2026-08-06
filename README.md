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

- employer account for private and organisation employers
- employer profile (company profile only for organisation employers)
- type-specific employer verification
- vacancy creation
- language-requirement configuration
- salary, shift, privacy-safe location, and contract details
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
- [Slice 1 build plan](docs/16-slice-1-build-plan.md) (complete; historical)
- [Slice 1 schema proposal](docs/17-slice-1-schema-proposal.md)
- [Slice 2 discovery](docs/18-slice-2-discovery.md) (planning locked; D-026–D-033 Accepted)
- [Slice 2 build plan](docs/19-slice-2-build-plan.md) (planning locked)
- [Slice 2 schema and matching proposal](docs/20-slice-2-schema-and-matching-proposal.md) (planning locked)
- [Slice 2 closure evidence](docs/21-slice-2-closure.md) (complete; hosted Production proof recorded)
- [Slice 3 discovery](docs/22-slice-3-discovery.md) (contracts Accepted 2026-08-03; D-035–D-045)
- [Slice 3 build plan](docs/23-slice-3-build-plan.md) (Slice 3 Done; PR 3.1–3.5 merged #33–#37)
- [Slice 3 schema and journey proposal](docs/24-slice-3-schema-and-journey-proposal.md) (contracts Accepted)
- [Slice 3 exit proof (local)](docs/25-slice-3-exit-proof.md) (local automated proof complete)
- [Slice 3 hosted-proof runbook](docs/26-slice-3-hosted-proof-runbook.md) (Production fallback executed 2026-08-03)
- [Slice 3 closure evidence](docs/27-slice-3-closure.md) (complete; hosted Production proof recorded)
- [Slice 4 discovery](docs/28-slice-4-discovery.md) (contracts Accepted 2026-08-03; D-046–D-054)
- [Slice 4 build plan](docs/29-slice-4-build-plan.md) (PR 4.1–4.5 complete)
- [Slice 4 schema and journey proposal](docs/30-slice-4-schema-and-journey-proposal.md) (contracts Accepted)
- [Slice 4 exit proof (local)](docs/31-slice-4-exit-proof.md) (local proof via `pnpm proof:slice4`)
- [Slice 4 hosted-proof runbook](docs/32-slice-4-hosted-proof-runbook.md) (executed 2026-08-04 on Preview/disposable)
- [Slice 4 closure](docs/33-slice-4-closure.md) (Done — Preview/disposable hosted proof)
- [Slice 5 discovery](docs/34-slice-5-discovery.md) (planning Done; D-055–D-067 Accepted 2026-08-05)
- [Slice 5 build plan](docs/35-slice-5-build-plan.md) (PR 5.1 Done; PR 5.2 database foundation in progress)
- [Slice 5 schema and publication proposal](docs/36-slice-5-schema-and-publication-proposal.md) (contract locked; lifecycle events decided)
- [Not now](NOT_NOW.md)
- [Agent instructions](AGENTS.md)

## Development status

Delivery follows a solo vertical-slice workflow tracked in `docs/14-founder-dashboard.md`. Slice 0, Slice 1, Slice 2, Slice 3, and Slice 4 are complete. Slice 2 delivered vacancy schema/RLS, matcher/loader, `/candidate/matches`, local critical journey, and owner-controlled hosted Demo fixtures (PR #26–#29). Slice 3 delivered candidate job detail, application preview/submit, snapshot-backed confirmation, Applied state, local exit proof, and owner-authorized Production hosted proof (PR #33–#37; closure in `docs/27-slice-3-closure.md`). Slice 4 delivered employer registration/onboarding, employer-owned draft vacancies, local exit proof, and owner-authorized Preview/disposable hosted proof (PR #41–#45; closure in `docs/33-slice-4-closure.md`). Slice 5 planning is **Done** (`docs/34`–`docs/36`; D-055–D-067 Accepted 2026-08-05; D-068–D-069 Accepted 2026-08-06). PR 5.1 is Done. PR 5.2 (verification + publication schema/RLS/RPCs/pgTAP) is Done. PR 5.3 employer verification request/status UI (`/employer/verification`, attestation-based request/resubmission, state-specific panels) is Done. PR 5.3a (merged) added three narrow Auth-bound read RPCs — `is_current_user_verification_operator()`, `list_pending_employer_verifications()`, `get_employer_verification_review(uuid)`. PR 5.3b (merged) added the operator review UI — `/internal/verification` (queue) and `/internal/verification/[employerProfileId]` (review detail with approve/reject), authorized via the PR 5.3a read RPCs and gated at the proxy layer alongside `/candidate/*` and `/employer/*`; no revocation UI, no publication UI, no public jobs routes, and no general admin dashboard. PR 5.4 (merged) added employer-facing publish/pause/resume/fill/withdraw/materialize-expiry/renew controls at `/employer/vacancies/[vacancyId]` on the existing PR 5.2 lifecycle RPCs (no migration); the vacancy list and manage page now show every lifecycle state, not only drafts. PR 5.5 UI work was correctly stopped after auditing the database contract: `anon` had zero table-level read access to vacancy data (only a boolean/ID-list helper), so PR 5.5a (Done, merged) added a narrow read-only migration — `list_effective_public_vacancies()`, `get_effective_public_vacancy(uuid)`, `get_effective_public_vacancy_languages(uuid)`, granted to `anon` and `authenticated`, no table grant or RLS change. PR 5.5b (Done, merged) is public-discovery-only: `/jobs` and `/jobs/[vacancyId]`, public navigation, metadata, and safe rendering, built entirely on the PR 5.5a RPCs. Before writing candidate-facing code, PR 5.5b audited the candidate-matching path and found it blocked: `resolveCandidateVacancyMatch()`/`matchCandidateToVacancy()` (shared by `/candidate/matches`, `/candidate/jobs/[vacancyId]`, and the apply Server Action) require `employment_types`, `shift_requirements`, `german_requirement`, and `available_from`, none of which the PR 5.5a projection exposes, and no `authenticated` RLS policy lets a candidate read another employer's vacancy row directly (confirmed by grepping every RLS policy and every RPC across all 10 migrations). `submit_candidate_application` itself did not enforce the full deterministic matcher transactionally either. PR 5.5c (Done, merged; PR #57) closed that gap: one additive migration (11th, the last migration in this repo) adds a canonical, non-short-circuiting SQL eligibility evaluator (`_evaluate_candidate_vacancy_eligibility`, internal only) ported rule-for-rule from the TypeScript matcher, shared by two new narrow authenticated RPCs — `resolve_current_candidate_vacancy_match(uuid)` and `list_current_candidate_vacancy_matches()` — and by a modified `submit_candidate_application`, which now rejects an ineligible submission transactionally (`{"result":"ineligible","missing_requirements":[...]}`) instead of only checking category (D-068). PR 5.5d (in progress, this unit) switches `/candidate/matches` and `/candidate/jobs/[vacancyId]` onto those RPCs as the sole eligibility authority (D-069, no migration): the pre-submit TypeScript matcher check is removed from the application Server Action, which now only validates input, confirms the Auth session, and interprets `submit_candidate_application`'s own transactional result, including the new `ineligible` outcome; the "Application preview" section (D-043) is dropped since its profile fields are outside the new read boundary, replaced by a direct Submit control (eligible) or a labelled missing-requirements list (ineligible); `/candidate/matches`'s existing unauthenticated/missing-profile/incomplete redirect guards are preserved exactly via a new narrow completion guard (`loadCandidateCompletionStatus`, selecting only `onboarding_completed_at` under the existing `candidate_profiles_select_own` RLS policy — no matching-input column) — the canonical list RPC is only ever called once that guard reports a complete profile, so its own empty-array result can only mean "zero current eligible matches"; `/candidate/jobs/[vacancyId]`'s onboarding redirect for an incomplete candidate is unaffected either way, since the single-vacancy RPC reports `incomplete` as its own status rather than requiring a table read. The TypeScript matcher and its old callers are left in place, unused by any candidate route, not deleted. No employer applicant review. Hosted Demo fixtures on `https://stint.company` / project `kvrzmzoszitdicjvrprt` remain retained until 2026-09-02. Preview currently has no Preview-scoped Supabase configuration and must be re-isolated before any future hosted proof. Slice 6/7/8 have not started. Product scope remains `docs/04-mvp.md`.

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
pnpm supabase:db:reset   # local-only; recreates DB from migrations + local/CI seeds
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

### Authentication, onboarding, and completion (PR 1.2–1.4)

- Email/password registration with required email confirmation
- Cookie-based SSR sessions; refresh via `src/proxy.ts` (`getClaims()`)
- Protected `/candidate/*` (anonymous → `/login`)
- Idempotent `candidate_profiles` creation after signup/confirm/login (no Auth DB trigger)
- Confirmation callback: `/auth/confirm` (supports `token_hash` + `type`, and PKCE `code`)
- Essential onboarding at `/candidate/onboarding` with durable per-section save (D-025 allow-lists)
- Progress derived from persisted fields; review offers **Confirm essentials** when answers look complete
- Authoritative completion via `complete_candidate_onboarding()` (locks profile, validates persisted DB state; sets gate timestamp)
- Database triggers clear `onboarding_completed_at` in the same transaction when essential profile/language edits leave essentials invalid
- `work_authorisation_declared_at` stays non-null only while declaration is true (trigger-synced)
- No matching / job feed on the completed-candidate home (Slice 2)
- No password-recovery UI yet (before-pilot)
- No service-role key for browser or ordinary SSR sessions

Local Auth + onboarding + completion + matches journeys (requires local Supabase + Mailpit):

```bash
pnpm test:e2e:onboarding
```

Slice 2 critical exit journey (register → complete → matches → authz → invalidate → recover):

```bash
pnpm test:e2e:slice2
```

Slice 3 critical exit journey (register → complete → detail → preview → submit → confirmation → Applied → duplicate/single-row → authz/historical proofs):

```bash
pnpm test:e2e:slice3
```

Hosted Production Auth uses the repository owner’s Supabase project, Vercel Production public env, Site URL `https://stint.company`, and the configured redirect allow-list. Hosted completion and applications migrations are applied on Production. Slice 3 hosted Production proof is complete — see `docs/27-slice-3-closure.md`. Slice 4 hosted proof used an isolated Preview + disposable Supabase project (deleted after proof); Preview currently has no Preview-scoped Supabase variables and must be re-isolated before any future hosted proof — see `docs/33-slice-4-closure.md`.

Hosted Demo vacancy fixtures (D-031) are **owner-run only** — never applied by migrations, CI, build, or deploy. See `supabase/fixtures/hosted/README.md` and `docs/21-slice-2-closure.md`.

### Local-only notes

- No Supabase account is needed for local development.
- Do not run `supabase login`.
- Do not link a remote Supabase project from the CLI for routine work.
- Candidate schema, Auth, essential onboarding, and controlled completion RPCs exist; vacancy tables are Slice 2 PR 2.1.
- Local/CI seeding is enabled for fictional Demo vacancy fixtures (`supabase/seeds`); hosted Production/Preview schema migrations do not auto-insert demo business data (D-031). Owner-run hosted Demo fixtures: temporarily `export SUPABASE_DB_URL='...'`, then `pnpm fixtures:hosted:apply -- --env <preview|production> --project-ref <ref>` (Production also needs `--confirm-production=I_UNDERSTAND_HOSTED_DEMO`), then `unset SUPABASE_DB_URL`. Never pass the connection string on the CLI; never paste credentials into issues, PRs, or evidence.
- No service-role or secret key is required for ordinary app paths. Browser/SSR session paths use the publishable key + user cookies and RLS.
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
| `pnpm test:e2e:employer` | Employer onboarding + vacancy draft E2E     |
| `pnpm test:e2e:slice3`   | Slice 3 candidate critical journey E2E      |
| `pnpm proof:migrations`  | Local migration inventory (checksums only)  |
| `pnpm proof:slice4`      | Local Slice 4 exit-proof orchestrator       |
| `pnpm supabase:start`    | Start local Supabase (project-pinned CLI)   |
| `pnpm supabase:stop`     | Stop local Supabase                         |
| `pnpm supabase:status`   | Show local URL and keys                     |
| `pnpm supabase:db:reset` | Reset local DB from migrations (local-only) |
| `pnpm supabase:test:db`  | Run pgTAP schema/RLS tests                  |
| `pnpm db:types`          | Generate `src/types/database.ts` locally    |
| `pnpm db:types:check`    | Fail if generated types are stale           |

## Guiding question

> Does this help someone take one meaningful step toward work?
