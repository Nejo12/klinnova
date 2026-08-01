# Stint Implementation Plan

## Objective

Deliver the smallest production-capable version of Stint that allows a candidate to create a lightweight profile, receive suitable Berlin job matches, and submit an application, while allowing an employer to publish a verified vacancy and review applicants.

Product scope remains defined by `docs/04-mvp.md`. This plan defines delivery order for a solo founder.

## Solo delivery rules

- Build **vertical slices**, not frontend/backend layers and not micro-task checklists.
- One active slice at a time; track it in `docs/14-founder-dashboard.md`.
- Each slice includes the UI, data, validation, authorization, tests, and observability needed to ship.
- Prefer deterministic, explainable rules over opaque automation.
- Treat accessibility, privacy, authorization, and verification as core requirements.
- Do not add features because a framework or agent makes them easy.
- Park non-urgent ideas in `NOT_NOW.md` without changing MVP scope.
- Every pull request must leave the product deployable.

## Recommended stack

- Next.js App Router
- React and strict TypeScript
- SCSS Modules and CSS custom properties
- Supabase PostgreSQL, Auth, Storage, and Row Level Security
- React Hook Form and Zod
- Resend and React Email
- Vitest, Testing Library, MSW, and Playwright
- Sentry and PostHog
- GitHub Actions and Vercel preview deployments

## Vertical slices

Each slice is the unit of planning, implementation, and review. Size for roughly 0.5–2 days of focused solo work when possible; larger slices are acceptable when the journey cannot be split without leaving `main` broken.

### Slice 0 — Engineering foundation

**Outcome:** deployable, tested application shell with Stint design tokens and reproducible local setup.

**Build plan:** `docs/15-slice-0-build-plan.md` (four sequential PRs).

**Includes:** Next.js bootstrap; strict TypeScript, ESLint, Prettier, absolute imports; SCSS tokens; env validation; Supabase local setup; test toolchain; CI; Vercel previews.

**Exit criteria:**

- `main` deploys successfully
- lint, type-check, unit tests, and build run in CI
- local setup is documented and reproducible

### Slice 1 — Registration to persisted onboarding

**Outcome:** a candidate can register and complete essential onboarding with durable progress.

**Includes:** authentication; account-role selection; six-step essential onboarding; candidate profile and preference persistence; step-motif progress; safe resume.

**Exit criteria:**

- onboarding can be resumed without data loss
- no CV or phone number is required to complete essentials
- preferences needed for matching are stored

### Slice 2 — Onboarding to seeded matches

**Outcome:** after essentials, a candidate sees deterministic, explainable matches against seeded vacancies.

**Includes:** seed vacancies; match calculation from category, language, location/radius, availability, employment type, shift, experience, and work-authorisation declaration; matches screen; empty states; match explanations.

**Exit criteria:**

- a new candidate reaches relevant matches in under three minutes
- each match explains why it appears
- no opaque scores or recommendation black boxes

### Slice 3 — Job detail to submitted application

**Outcome:** a candidate can evaluate a vacancy and apply through Stint.

**Includes:** job list and detail; salary, distance, shift, contract, language, verification, and freshness; save/unsave; profile-based application; optional CV upload with private storage; confirmation; application timeline; candidate application dashboard.

**Exit criteria:**

- exactly one application per vacancy per candidate
- private documents are never publicly accessible
- application status is visible and auditable

### Slice 4 — Employer registration to draft vacancy

**Outcome:** an employer can register, create a company profile, and save a structured draft vacancy.

**Includes:** employer onboarding; company profile; draft vacancy with required structured fields (salary, language, location, contract, shift/schedule, expiry or auto-expiry).

**Exit criteria:**

- draft vacancies are not publicly visible
- required eligibility fields are explicit before publish is possible later

### Slice 5 — Employer verification to public vacancy

**Outcome:** only verified employers can publish public vacancies.

**Includes:** employer verification state; create/edit/publish/pause/expire/fill flows; public job visibility rules.

**Exit criteria:**

- unverified employers cannot publish public vacancies
- language and salary information remain required and visible
- published vacancies can be closed or expired

### Slice 6 — Applicant review to status update

**Outcome:** a verified employer can review applicants and move applications forward; candidates see progress.

**Includes:** applicant list and detail; application status changes; interview invitation metadata without full messaging; candidate-visible timeline updates; status notification emails.

**Exit criteria:**

- employers can update application status for their jobs only
- candidates receive clear next-step status
- interview/hire outcomes can be recorded for pilot measurement

### Slice 7 — Admin moderation to audit event

**Outcome:** Stint can be operated safely for a controlled Berlin pilot.

**Includes:** admin authorization; employer review/approval; vacancy moderation; reports; suspension; stale-vacancy handling; audit events; transactional email completeness; privacy/terms/Impressum placeholders; basic funnel analytics.

**Exit criteria:**

- administrators can suspend unsafe actors and remove vacancies
- sensitive admin actions are audited
- pilot funnel events are measurable

### Slice 8 — Account deletion to confirmed data removal

**Outcome:** candidates and employers can request export and deletion; removal can be confirmed.

**Includes:** account export; deletion request workflow; confirmation of data-removal path for MVP needs.

**Exit criteria:**

- core GDPR user actions work for the MVP surface
- deletion does not leave private documents publicly reachable

## Milestone mapping

Milestones remain planning checkpoints, not separate micro-backlogs:

| Milestone | Slices | Checkpoint |
|-----------|--------|------------|
| M0 Foundation | 0 | Shell deploys with CI |
| M1 Candidate matching shell | 1–2 | Candidate reaches seeded matches |
| M2 Applications | 3 | Candidate applies and tracks status |
| M3 Employer flow | 4–6 | Verified employer publishes and reviews |
| M4 Trust and beta readiness | 7–8 | Ops and GDPR basics work |
| M5 Berlin private beta | operate | Validate outcomes; freeze feature expansion |

### Berlin private beta targets

- 20 participating employers
- 100 verified vacancies
- 200 candidates
- 10 interviews
- 3 confirmed hires

This phase is operational and product-led. It should not trigger large feature expansion.

## Initial domain model

- `profiles`
- `candidate_profiles`
- `employer_profiles`
- `companies`
- `jobs`
- `job_categories`
- `languages`
- `candidate_languages`
- `job_language_requirements`
- `candidate_preferences`
- `saved_jobs`
- `applications`
- `employer_verifications`
- `job_verifications`
- `reports`
- `audit_events`

A schema proposal must be reviewed before migrations are committed. Encode verification and publication gates in the schema from Slice 0/1 onward even if admin UI arrives in Slice 7.

## Pull-request policy

Each pull request should:

- advance one active vertical slice (or a coherent part of it)
- state acceptance / exit criteria in the description
- include tests for business-critical behavior
- preserve strict TypeScript without `any`
- contain no unrelated refactoring
- update relevant documentation
- pass lint, type-check, tests, and production build
- include screenshots for visible UI changes

## Deferred work

Deferred capabilities are listed in `NOT_NOW.md`. Do not implement them until MVP evidence and an explicit decision-log entry say otherwise.
