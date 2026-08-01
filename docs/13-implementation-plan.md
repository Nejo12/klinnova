# Stint Implementation Plan

## Objective

Deliver the smallest production-capable version of Stint that allows a candidate to create a lightweight profile, receive suitable Berlin job matches, and submit an application, while allowing an employer to publish a verified vacancy and review applicants.

## Delivery rules

- Build vertical slices, not isolated frontend and backend layers.
- Keep the MVP boundaries defined in `docs/04-mvp.md`.
- Prefer deterministic, explainable rules over opaque automation.
- Treat accessibility, privacy, authorization, and verification as core requirements.
- Do not add features merely because the framework or an agent makes them easy.
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

## Release sequence

### Milestone 0 — Engineering foundation

Outcome: a deployable, tested application shell with the Stint design tokens and documented engineering rules.

Deliverables:

- Next.js project bootstrap
- strict TypeScript, ESLint, Prettier, and absolute imports
- SCSS architecture and initial design tokens
- environment validation
- Supabase local/development setup
- testing toolchain
- GitHub Actions CI
- Vercel project and preview deployments
- Sentry and analytics scaffolding
- repository contribution and agent instructions

Exit criteria:

- `main` deploys successfully
- lint, type-check, unit tests, and build run in CI
- local setup is documented and reproducible

### Milestone 1 — Candidate onboarding and matching shell

Outcome: a candidate can register, answer essential onboarding questions, and receive deterministic sample matches.

Deliverables:

- authentication
- account-role selection
- six-step candidate onboarding
- candidate profile persistence
- language, German level, location, radius, interests, availability, and contract preferences
- onboarding progress step motif
- basic match calculation against seeded vacancies
- matches screen and empty states

Exit criteria:

- a new candidate reaches relevant matches in under three minutes
- no CV or phone number is required to see matches
- onboarding can be resumed safely

### Milestone 2 — Jobs and candidate applications

Outcome: a candidate can evaluate a real vacancy and apply through Stint.

Deliverables:

- job list and job detail pages
- salary, distance, shift type, contract type, language requirement, and verification state
- save job
- profile-based application
- optional CV upload
- application confirmation and timeline
- candidate application dashboard

Exit criteria:

- candidate can submit exactly one application per vacancy
- private documents are never publicly accessible
- application status is visible and auditable

### Milestone 3 — Employer vacancy and applicant flow

Outcome: an approved employer can publish a vacancy and review applicants.

Deliverables:

- employer onboarding
- company profile
- employer verification state
- create, edit, publish, pause, expire, and fill vacancy
- applicant list and applicant detail
- application status changes
- interview invitation metadata without full messaging

Exit criteria:

- unverified employers cannot publish public vacancies
- required language and salary information are explicit
- candidates receive application-status notifications

### Milestone 4 — Administration, trust, and beta readiness

Outcome: Stint can be operated safely as a controlled Berlin pilot.

Deliverables:

- admin authorization
- employer review and approval
- vacancy moderation
- user and vacancy reports
- audit events
- expiry and stale-vacancy handling
- transactional email templates
- account export and deletion flow
- privacy, terms, and Impressum placeholders for legal review
- beta analytics dashboard

Exit criteria:

- administrators can suspend unsafe actors and remove vacancies
- core GDPR user actions work
- pilot funnel events are measurable

### Milestone 5 — Berlin private beta

Outcome: validate demand and hiring outcomes with real users.

Targets:

- 20 participating employers
- 100 verified vacancies
- 200 candidates
- 10 interviews
- 3 confirmed hires

This milestone is operational and product-led. It should not trigger large feature expansion.

## Vertical-slice order

1. Candidate registration to persisted onboarding
2. Candidate onboarding to seeded matches
3. Job detail to submitted application
4. Employer registration to draft vacancy
5. Employer verification to public vacancy
6. Employer applicant review to status update
7. Admin moderation to audit event
8. Account deletion to confirmed data-removal workflow

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

A schema proposal must be reviewed before migrations are committed.

## Pull-request policy

Each pull request should:

- address one coherent issue
- include acceptance criteria in its description
- include tests for business-critical behavior
- preserve strict TypeScript without `any`
- contain no unrelated refactoring
- update relevant documentation
- pass lint, type-check, tests, and production build
- include screenshots for visible UI changes

## Deferred until after beta evidence

- native mobile applications
- real-time chat
- public reviews and ratings
- payroll and payment processing
- on-demand worker booking
- AI-branded features
- complex recommendation models
- dedicated search infrastructure
- multi-city rollout
- staffing-agency functionality
