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

**Build plan:** `docs/15-slice-0-build-plan.md` (four sequential PRs). **Status:** complete (PR 0.1–0.4 merged).

**Includes:** Next.js bootstrap; strict TypeScript, ESLint, Prettier, absolute imports; SCSS tokens; env validation; Supabase local setup; test toolchain; CI; Vercel previews.

**Exit criteria:**

- `main` deploys successfully
- lint, type-check, unit tests, and build run in CI
- local setup is documented and reproducible

### Slice 1 — Registration to persisted onboarding

**Outcome:** a candidate can register and complete essential onboarding with durable progress.

**Build plan:** `docs/16-slice-1-build-plan.md` (four sequential PRs; PR 1.1 decisions Accepted).
**Schema proposal:** `docs/17-slice-1-schema-proposal.md` (Accepted). Auth: D-021/D-022 Accepted. Allow-lists: D-025 Accepted (2026-08-01).

**Includes:** authentication; essential onboarding data persistence (MVP sequence as UI grouping); candidate profile essentials; step-motif progress; safe resume.

**Exit criteria:**

- onboarding can be resumed without data loss
- no CV or phone number is required to complete essentials
- preferences needed for matching are stored

### Slice 2 — Onboarding to seeded matches

**Outcome:** after essentials, a candidate sees deterministic, explainable matches against seeded vacancies.

**Includes:** seed/demo vacancies; match calculation from category, language, Berlin location, availability, employment type, shift, and work-authorisation declaration as a completion gate; `/candidate/matches` screen; empty states; match explanations.

**Accepted Slice 2 narrowings (D-026–D-033):** experience is excluded (no fields, eligibility, ordering, explanation, or display-only pseudo-requirement); travel minutes are unused for eligibility, ordering, reasons, and match claims (Berlin hard filter only); UI is `/candidate/matches` only (no detail/apply/save); fictional seed companies with `source = seed` and no verification claim; pure TypeScript matching with deterministic sort and no opaque scores; no automatic Production business-data insertion through schema migrations. Broader Matching v1 items remain later MVP intent where narrowed here.

**Planning artifacts:** discovery `docs/18-slice-2-discovery.md`, build plan `docs/19-slice-2-build-plan.md`, schema/matching proposal `docs/20-slice-2-schema-and-matching-proposal.md`.

**Exit criteria:**

- a new candidate reaches relevant matches in under three minutes
- each match explains why it appears
- no opaque scores or recommendation black boxes

### Slice 3 — Job detail to submitted application

**Outcome:** a candidate can evaluate a vacancy and apply through Stint.

**Broader MVP includes (still product intent):** job list and detail; salary, distance, shift, contract, language, verification, and freshness; save/unsave; profile-based application; optional CV upload with private storage; confirmation; application timeline; candidate application dashboard.

**Accepted Slice 3 narrowings (D-035–D-045; Accepted 2026-08-03):** authenticated `/candidate/jobs/[vacancyId]` detail for RLS-visible seed vacancies using schema-backed fields only; profile-based preview and atomic submit; reload-safe confirmation from RPC-generated versioned snapshots; Applied-state feedback; permanent DB unique one application per candidate per vacancy; status constrained to `submitted` only. Deferred from this slice: save/unsave; CV/Storage; salary/distance/experience/verification/interview-language fields; employer status transitions; withdrawal/resubmission; future application statuses beyond `submitted`; full applications dashboard. Employer implementation remains Slice 4+.

**Planning artifacts:** discovery `docs/22-slice-3-discovery.md`, build plan `docs/23-slice-3-build-plan.md`, schema/journey proposal `docs/24-slice-3-schema-and-journey-proposal.md`.

**Status:** **Done** — PR 3.1–3.5 merged (#33–#37); local + Production hosted proof complete (`docs/25`–`docs/27`).

**Exit criteria (operational for narrowed Slice 3):**

- exactly one application per vacancy per candidate
- completed candidate can submit a profile-based Demo application with confirmation
- duplicate submit is deterministic and safe
- unauthenticated / incomplete candidates cannot apply
- private documents remain out of Slice 3 (no CV upload); later privacy rules still apply when documents exist
- submission is auditable via stored application + snapshots; employer-visible status timeline deferred

### Slice 4 — Employer registration to draft vacancy

**Outcome:** a private or organisation employer can register, create an employer profile, and save a structured draft vacancy.

**Includes:** employer onboarding for private and organisation employers; employer profile (company profile only for organisation employers); draft vacancy with required structured fields (salary, language, privacy-safe location, contract, shift/schedule, expiry or auto-expiry; employer type / workplace type / frequency where product requires).

**Exit criteria:**

- draft vacancies are not publicly visible
- required eligibility fields are explicit before publish is possible later
- exact private residential addresses are not publicly exposed

**Planning status:** Contracts Accepted 2026-08-03 (D-046–D-054). Planning
package `docs/28`–`docs/30` locked.

**Status:** **Done** — PR 4.1–4.5 merged (#41–#45); local + Preview/disposable
hosted proof complete (`docs/31`–`docs/33`). Verification and publication remain
Slice 5.

### Slice 5 — Employer verification to public vacancy

**Outcome:** only verified employers can publish public vacancies.

**Includes:** type-specific employer verification state (D-034); create/edit/publish/pause/expire/fill flows; public job visibility rules with privacy-safe location for private workplaces.

**Planning status:** Planning package `docs/34`–`docs/36` locked; decisions
D-055–D-067 **Accepted** 2026-08-05. PR 5.1 records acceptance (docs only).
Slice 5 product implementation has **not** started. **PR 5.2 is not authorized
until PR 5.1 merges.** Preview currently has no Preview-scoped Supabase
configuration after Slice 4 teardown — future hosted proof requires explicit
re-isolation (`docs/33`, D-067). Slice 6 / 7 / 8 have not started.

**Exit criteria:**

- unverified employers cannot publish public vacancies
- language and salary information remain required and visible
- published vacancies can be closed or expired
- private residential addresses remain non-public

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

**Planning status:** Discovery/build-plan/proposal package `docs/41`–`docs/43`
locked; decisions D-071–D-075 **Accepted** 2026-08-07. PR 7.1 records
acceptance (docs only). Employer review/approval is already Done (Slice 5).
The first Slice 7 implementation contract is narrower than the broad list
above — see `docs/42-slice-7-build-plan.md` and D-071–D-075 for the locked
boundary and the reasoning for each narrowing. This line preserves the
original broad intent; it is not silently edited. **Implementation status:**
PR 7.1 (planning) merged (#64); PR 7.2 (moderation/audit database
contract) merged (#65); PR 7.3 (operator moderation UI +
suspended-employer UX) merged (#66); PR 7.4 (pilot funnel + legal
placeholders + local exit proof, `docs/44-slice-7-exit-proof.md`) merged
(#67). **Slice 7 is Done locally** — all three exit criteria below pass
against the merged implementation; hosted proof has not been run. Slice 8
(account deletion to confirmed data removal) planning is **Accepted**:
decisions D-076–D-090 Accepted; PR 8.1 (planning) merged. PR 8.2
(deletion/tombstone/request/access-gate database contract) is **merged** —
no Auth Admin API call, no service-role application code, no UI. PR 8.3 is
split into PR 8.3a (D-089 narrow employer-export read RPC) **merged**, and
PR 8.3b (role-scoped export API/UI) **merged**. PR 8.4 (deletion request UI
+ privileged Auth processing) is implementation-complete locally, awaiting
review — implementation discovery found a stranded-`processing` recovery
gap, closed by D-090 with one additive migration (16th). PR 8.5 has not
started.

**Exit criteria:**

- administrators can suspend unsafe actors and remove vacancies
- sensitive admin actions are audited
- pilot funnel events are measurable

### Slice 8 — Account deletion to confirmed data removal

**Outcome:** candidates and employers can request export and deletion; removal can be confirmed.

**Includes:** account export; deletion request workflow; confirmation of data-removal path for MVP needs.

**Planning status:** PR 8.1 (discovery, data-ownership inventory, export/
deletion contract proposal, build plan) merged — see
`docs/45-slice-8-discovery.md`, `docs/46-slice-8-build-plan.md`,
`docs/47-slice-8-data-removal-proposal.md`. Decisions D-076–D-090 are
**Accepted** in `docs/10-decisions.md` (D-085/D-086/D-087 discovered and
Accepted during PR 8.2 implementation; D-088/D-089 discovered and
Accepted 2026-08-08 during PR 8.3 implementation start — D-077 left
dual-capability export scope and the employer export's application-data
source unresolved; D-090 discovered and Accepted 2026-08-08 during PR 8.4
implementation — a crash between a successful processing claim and any
subsequent step could permanently strand a request, which D-081 did not
cover).

**Implementation status:** PR 8.2 (deletion/tombstone/request/access-gate
database contract) is **merged** —
one additive migration (14th): `account_deleted_at` on both profile
tables; canonical deleted-account helpers; the deleted-account gate
composed into every candidate/employer RLS policy and self-service RPC;
the `deletion_requests` state machine with self-service request/cancel
RPCs and processor-only claim/domain-scrub/evidence/failure primitives;
D-078/D-079 anonymization (D-085 dual-capability-aware, D-082 audit
redaction and D-086 moderation removal folded into the employer side);
the deleted-employer exclusion in `is_vacancy_effectively_public`; D-087's
deleted-candidate transition freeze. No Auth Admin API call, no
service-role application code, no UI. PR 8.3 is split into **PR 8.3a**
(D-089's narrow `list_current_employer_export_applications()` read
contract — one additive migration, 15th) **merged**, and **PR 8.3b**
(D-088-compliant role-scoped export API/UI — `GET /candidate/account/export`
and `GET /employer/account/export`, no new migration) **merged**. **PR 8.4**
(deletion request UI + privileged Auth processing) is implementation-complete
locally, awaiting review: an isolated server-only privileged Supabase client
(`SUPABASE_SERVICE_ROLE_KEY`, fails closed if absent) confined to one
processor module (`processAccountDeletionRequest`/
`reconcileAccountDeletionRequest`, request-id-only, target derived from the
claimed/reclaimed request row) drives D-081's six-phase claim/domain-scrub/Auth
soft-delete/verify/evidence sequence; `/candidate/account/delete` and
`/employer/account/delete` provide destructive-confirmation
request/cancel UI on the existing PR 8.2 self-service RPCs. Implementation
discovery found `_claim_deletion_request` cannot recover a request stranded
at `processing` by a mid-flight crash (no RPC exposed its `user_id`, and
`service_role` has no direct table read on `deletion_requests`). **D-090**
closes this with one additive migration (16th,
`20260808220000_deletion_processing_lease_and_recovery.sql`): a
`processing_lease_started_at` column distinct from the historical
`processing_started_at`, a `_reclaim_stale_deletion_request()` RPC
(request-id-only, fixed 5-minute DB-owned threshold), reachable only from
`reconcileAccountDeletionRequest`. A local Auth Admin integration proof
(gated to `127.0.0.1`/`localhost`) exercises the real `deleteUser(id, true)`
API against a disposable dual-capability identity (domain tombstoning,
stale-JWT denial, fresh-login failure) and a second disposable identity
through the stranded-processing recovery path end to end. Migration count
is 16; pgTAP is 1437/1437 across 33 files. PR 8.5 (local exit proof +
closure) has not started.

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

A schema proposal must be reviewed before migrations are committed (`docs/17-slice-1-schema-proposal.md` for Slice 1). Candidate ownership and role are encoded from Slice 1. Employer verification and vacancy publication gates are encoded when employer/vacancy tables land (Slices 4–5), even if admin UI arrives in Slice 7.

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
