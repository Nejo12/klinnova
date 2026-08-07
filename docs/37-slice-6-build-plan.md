# Slice 6 Build Plan — Employer Applicant Review and Application-Status Workflow

> **Status:** Decision **D-070 Accepted** 2026-08-06 — see `docs/10-decisions.md`.
> **PR 6.1 (database contract) Done** — merged as PR #60
> (`a3e0a28ba8295cee501bf631cab591a0ef86d33f`).
> **PR 6.2 (employer applicant list/detail/status-transition UI) is in
> progress.** PR 6.3 (candidate status UI) and PR 6.4 (exit proof/closure)
> are not started.

**Goal:** Let a completed, vacancy-owning employer review applicants and move
each application through a narrow, auditable status lifecycle
(`submitted → reviewing/shortlisted/accepted/rejected`), and let the
candidate see their own current status — without interviews, notifications,
document handling, or a general admin/audit platform.

**Baseline:** Slice 5 Done (merge commit `2d85b9928566a5062723aba530002aeb299e3ecf`,
PR #58). Decision baseline: D-001–D-069 Accepted; D-070 proposed by this plan.

**Active tracking:** `docs/14-founder-dashboard.md`

**Companion document:** `docs/38-application-status-and-review-proposal.md`
(full schema, RLS, RPC contracts, privacy matrix — this document references it
rather than repeating it).

---

## Source of truth

| Doc | Role |
|---|---|
| `docs/04-mvp.md` | Scope boundary (pre-narrowing "Included" list for employer review) |
| `docs/13-implementation-plan.md` | Original Slice 6 scope statement — narrowed by D-070 |
| `docs/10-decisions.md` | D-038/039/040/041/042/043/044/055/062/065/066 (binding precedent), D-070 (proposed) |
| `docs/12-terminology.md` | `candidate`/`applicant` usage, rejection copy |
| `docs/14-founder-dashboard.md` | Current focus tracking |
| `docs/38-application-status-and-review-proposal.md` | This slice's schema/RPC/privacy contract |

## Non-goals (explicit — do not build unless separately decided)

CV upload, document storage, file attachments, employer notes visible to
candidates, internal scoring, AI ranking, candidate messaging, email
notifications, SMS notifications, interview/calendar scheduling, contracts,
payroll, invoicing, a generic CRM, operator participation in applicant
review, multi-company enterprise permissions, analytics, bulk status
changes, automated/system-initiated rejection, automatic matching changes,
candidate-initiated withdrawal, vacancy-fill/application-status
auto-coupling, and Slice 7/8 work (general `audit_events` platform,
admin/moderation UI).

## Employer access rule (recommendation, evidence-based)

**Completed employer + vacancy ownership — the same gate `requireCompletedEmployer()`
already applies to `/employer/vacancies/[vacancyId]`. No additional "currently
verified" check.**

Evidence: `requireCompletedEmployer()` governs every existing employer
vacancy-manage route today and checks only `onboarding_completed_at`, not
`verification_state`. Verification is enforced narrowly, only at the moment
an action needs it (`publish_employer_vacancy`), not as a page/route gate.
`revoke_employer_verification` already only *pauses* an employer's published
vacancies — it does not hide them or their history from the owner. Requiring
"currently verified" for applicant review would be **more restrictive** than
every existing employer surface, cut off legitimate historical access the
moment verification lapses, and contradict the revocation precedent's own
"pause, don't hide" design. Any vacancy that has applications was published
while verified at least once (publish already requires verification), so
this isn't a bypass — it's consistency with how every other owned-resource
view already works in this codebase.

## Route architecture

- `/employer/applications` — cross-vacancy applicant list (optional `?vacancy=`/`?status=` query filters), reusing `EmployerVacancyPageHeader` with a new `"applications"` nav entry (extends its currently closed `"home"|"vacancies"|"verification"` union).
- `/employer/applications/[applicationId]` — one applicant's detail + status-transition control.
- `/candidate/applications` — candidate's own application index (status-labelled list; new, closes the D-044-deferred "application index" gap now that there's a status worth listing).
- `/candidate/applications/[applicationId]` — existing confirmation route, extended with status label + optional timeline (no new route).

No `/employer/vacancies/[vacancyId]/applications` nested route — the flat `/employer/applications?vacancy=` model was chosen over nesting because an employer reviewing across multiple vacancies (the common case once they have more than one live posting) shouldn't need to leave and re-enter per-vacancy; the existing `EmployerVacancyPageHeader` nav pattern already favors flat top-level sections (Home/Vacancies/Verification) over nesting.

## Component architecture

New, under `src/components/employer-applications/` (mirrors `src/components/candidate-matches/` naming convention): `employer-applications-page.tsx`, `applications-list.tsx`, `application-card.tsx`, `application-detail-page.tsx`, `status-transition-form.tsx` (Client Component, `useActionState`, mirrors `application-submit-form.tsx`'s exact shape), `applications-empty-state.tsx`, `applications-error-state.tsx`.

New, under `src/components/candidate-applications/`: `candidate-applications-page.tsx`, `application-list-item.tsx` (status badge + link), reuse existing `candidate-application-confirmation` components for detail, extended with a `status-badge.tsx` and optional `status-timeline.tsx`.

SCSS Modules per component, per repo convention (no Tailwind). Desktop-first for employer components, functional mobile fallback (per AGENTS.md); mobile-first for candidate components.

## Caching/freshness

Both new employer routes and `/candidate/applications` are `force-dynamic`, matching every other candidate/employer route in this codebase — no `revalidatePath` calls, no persistent route cache, every request re-reads current RPC state. This is a direct continuation of the Slice 5 precedent (D-069), not a new pattern.

## Accessibility

Status badges use text labels, never color alone (AGENTS.md: semantic HTML/accessible primitives). Status-transition form: `role="alert"`/`aria-live` result region, focus management on result, matching `application-submit-form.tsx`'s existing pattern exactly. Status timeline as an ordered `<ol>` with visually-hidden date context, not a purely visual/color-coded stepper.

---

## PR decomposition

Four PRs, each independently shippable and testable, following the same
DB-contract-then-UI split already proven in Slice 5 (5.5c database contract,
5.5d UI integration) for exactly this reason: schema/security work benefits
from an isolated, audit-heavy review pass before any UI depends on it.

### PR 6.1 — Application status and review database contract

**Status:** Done — merged as PR #60
(`a3e0a28ba8295cee501bf631cab591a0ef86d33f`). Migration
`supabase/migrations/20260806140000_application_status_and_review_contract.sql`
(12th) and `supabase/tests/database/28_application_status_and_review_contract_test.sql`
implemented and passing.

**Objective:** Add the status vocabulary, audit-history table, and five
narrow RPCs from `docs/38-application-status-and-review-proposal.md`. No UI.

**Includes:** One additive migration (12th): widen `applications_status_chk`
to `('submitted','reviewing','shortlisted','accepted','rejected')`; create
`application_status_history` (table, index, zero `authenticated` grant);
backfill one synthesized `submitted` history event for every pre-existing
application (`from_status=null, to_status='submitted', actor_user_id=candidate_id,
occurred_at=submitted_at`); update `submit_candidate_application` so every
future submission inserts its `applications` row and initial `submitted`
history row atomically, in the same transaction (proposal §7);
`list_current_employer_applications(uuid default null, text default null)`;
`get_current_employer_application(uuid)`;
`transition_current_employer_application_status(uuid, text, text default null)`
(with the `p_reason` normalization/length rules in proposal §6);
`list_current_candidate_application_status_history(uuid)`. Full pgTAP
coverage (see Test strategy below). Accept D-070 in `docs/10-decisions.md`
at the start of this PR.

**Excludes:** Any route, component, Server Action, or generated-type
regeneration beyond what `db:types` naturally picks up; candidate-facing
label/copy changes (PR 6.3); employer UI (PR 6.2); the pre-existing
`vacancySnapshotV1Schema`/`demo_label` bug fix (recommended as a separate,
unrelated PR — see proposal §1).

**Database effects:** One migration, additive only. No change to
`applications`' column set or `snapshot_version`. No change to any PR 5.5a/c
function. Migration count: 11 → 12.

**Route effects:** None.

**Tests:** pgTAP only (privileges, RLS/ownership isolation, all five RPCs,
transition matrix incl. invalid/idempotent/terminal cases, history
insertion/immutability/candidate-safe projection, concurrency via two
sessions, no-verification-required proof, cross-employer denial).

**Exit criteria:** All five RPCs behave exactly per the proposal; full pgTAP
suite (including all pre-existing files) green; migration count 12;
generated types regenerate with no manual edits needed.

---

### PR 6.2 — Employer applicant review UI

**Status:** In progress. Do not mark Done before merge.

**Objective:** `/employer/applications` and `/employer/applications/[applicationId]`,
built entirely on the PR 6.1 RPCs.

**Includes:** List page (vacancy/status filters), detail page (candidate
snapshot fields, status badge, allowed-transitions-aware transition form,
status history with reason), new `EmployerVacancyPageHeader` "Applications"
nav entry, empty/error/unavailable states, static-security test enumerating
every new employer-application file and asserting: no direct
`candidate_profiles`/`candidate_languages` read, no direct `applications`
table read (RPC-only), no service-role client, only the approved RPC names.

**Excludes:** Candidate-facing changes (PR 6.3); any vacancy-lifecycle
auto-coupling (explicitly rejected, proposal §9).

**Database effects:** None.

**Route effects:** `/employer/applications`, `/employer/applications/[applicationId]`.
No candidate or public route changes.

**Tests:** Vitest/Testing Library for loaders, view-resolvers, and
components; the static-security test above; local-only (no live Supabase
required) coverage for the transition Server Action's typed result mapping.

**Exit criteria:** A completed, vacancy-owning employer can list and review
their applicants and transition status end-to-end locally; an unrelated
employer sees nothing; full local Vitest/typecheck/lint/build green.

---

### PR 6.3 — Candidate status visibility

**Objective:** Candidates see their current application status and a
minimal history; a new `/candidate/applications` index closes the
D-044-deferred gap.

**Includes:** `/candidate/applications` (own applications, RLS-scoped plain
select, no new RPC needed — see proposal §13); confirmation route status
label update (replace the hardcoded `"Submitted"` with the full 5-status
map); optional status timeline component consuming
`list_current_candidate_application_status_history`; updated
`docs/12-terminology.md`-consistent rejected copy.

**Excludes:** Any notification (email/SMS/push) — explicit non-goal.

**Database effects:** None (reuses PR 6.1's candidate RPC/existing RLS).

**Route effects:** `/candidate/applications` (new), `/candidate/applications/[applicationId]` (extended, not restructured).

**Tests:** Vitest/Testing Library for the new list page and status
components; Playwright coverage folded into the existing
`slice3-critical-journey`/`job-detail-journey` style (candidate sees status
progress after an employer transition, made visible via the local Postgres
helper pattern already used for cross-actor E2E in this repo).

**Exit criteria:** A candidate sees their real current status and can find
all their applications from one index; full local suite green.

---

### PR 6.4 — Slice 6 exit proof and closure

**Objective:** Full local orchestrated proof, hosted-proof runbook, decision
and dashboard closure — mirrors the Slice 5 `5.6` pattern (D-067's
Local→Preview→Production-with-explicit-authorization model).

**Includes:** Full local proof orchestrator entry (parallel to
`scripts/proof/migration-inventory.mts`/`slice4.mts`); evidence matrix;
hosted runbook (disposable project, employer A/B isolation, candidate
ownership, transition, history, revoked-verification, candidate visibility,
Production untouched, Preview not connected to Production); documentation
closure (README, dashboard, `docs/10-decisions.md` status rollups,
`docs/13-implementation-plan.md` cross-reference note).

**Excludes:** Running hosted/Production proof itself; marking Slice 6 Done
(requires owner-authorized hosted proof, per the established Slice 3/4/5
pattern).

**Database effects:** None.

**Route effects:** None.

**Tests:** Full local proof gate (pgTAP + Vitest + Playwright + build +
migration inventory + type-drift check, all green).

**Exit criteria:** Local checklist green; hosted runbook ready; Slice 6
Done only after owner-authorized hosted proof — not before.

---

## pgTAP strategy (PR 6.1)

Table privileges (no `authenticated` grant on `application_status_history`);
RLS isolation (candidate-owner-only remains on `applications`, no new
policy); employer ownership (owning employer sees own applications via
RPC); unrelated employer denial (zero rows/`unavailable`, no existence
oracle); candidate ownership (candidate sees only own rows/history);
anonymous denial (all three employer RPCs + candidate history RPC); employer
completion required, **verification not required** (explicit positive test:
a `verified`-then-`revoked` employer can still list/detail/transition);
list RPC (ordering, vacancy/status filters, cross-vacancy aggregation,
malformed input); detail RPC (full projection shape, unavailable
collapse); status transitions (every matrix cell, both valid and invalid);
idempotent same-status transition (no duplicate history row); concurrency
(two sessions racing a transition via row lock); history insertion (actor
derived from `auth.uid()`, never client-supplied); history immutability (no
`authenticated` UPDATE/DELETE grant); candidate-safe history projection
(`reason`/`actor_user_id` never returned to the candidate RPC); terminal
states (zero valid outbound transitions from `accepted`/`rejected`); vacancy
lifecycle interaction (review remains available across paused/filled/
withdrawn/expired vacancies); snapshot stability (unaffected by any of this
— regression-only, reusing the existing Slice 3 snapshot-stability
fixtures); no private-data leakage (candidate auth ID/email/phone never
appear in any new RPC's return shape — grep-provable, same as Slice 5's
static-security pattern applied at the SQL layer via `\df+` inspection in a
test comment, not a new tool); **backfill correctness** (every pre-existing
application has exactly one synthesized `submitted` history row after
migration, with `occurred_at` matching its own `submitted_at` and
`actor_user_id` matching its own `candidate_id`); **atomic future-submission
history** (a fresh `submit_candidate_application` call produces both the
`applications` row and its initial history row in one transaction, using one
shared timestamp for `applications.submitted_at`/`created_at`/`updated_at`
and `application_status_history.occurred_at` — no window where a new
application has zero history rows, and no drift between the two
timestamps); **reason normalization** (empty/whitespace-only `p_reason`
normalizes to `NULL`, not an error; a non-null, post-trim `p_reason`
supplied for any target other than `rejected` is a caller error —
`invalid_transition`, no state change, no history row, never silently
discarded; a `rejected` target accepts a 1–1000 trimmed-character reason;
longer is `invalid_transition`, not a raw constraint-violation error).

## Vitest strategy (PR 6.2/6.3)

Runtime schemas for both new RPC result shapes (Zod, exhaustive discriminated
unions matching §10–13 of the proposal, malformed-row-fails-whole-result
where the data is authenticated/cross-user like the employer list, matching
the Slice 5 `candidateVacancyMatchListSchema` precedent); employer
list/detail loaders (mocked Supabase client, same test-double pattern as
`load-current-candidate-matches-page.test.ts`); transition Server Action
(mirrors `actions.test.ts` from Slice 5 — validates input, confirms Auth
session, calls only the transition RPC, maps every result variant, no
service-role/matcher references); candidate status loader and list page;
status label/badge components; empty/error/unavailable states for both
sides; static-security tests for both new file sets (employer-application
files banning direct `applications`/`candidate_profiles`/
`candidate_languages` reads; candidate-application files banning any
employer-only field like `reason`/`actor_user_id`).

## E2E strategy (PR 6.2/6.3)

New `e2e/employer-applicant-review-journey.spec.ts`: employer sees own
applicants after a candidate submits (reusing the local-application-proof
helper pattern from `e2e/helpers/local-application-proof.ts` to seed a real
submission), unrelated employer (second registered employer) cannot see
them, employer opens applicant detail, employer transitions
`submitted → reviewing → shortlisted → accepted`, invalid/stale transition
(attempt `accepted → reviewing`) fails safely, revoked-verification employer
can still transition (proves the access-rule decision end-to-end, not just
in pgTAP), candidate sees the updated status on both `/candidate/applications`
and the confirmation route after the employer's transition, snapshot
remains stable after profile/vacancy edits (regression assertion reusing
the existing Slice 3 mutation-then-reload pattern). A new
`test:e2e:employer-applications` `package.json` script, following the exact
naming convention established by `test:e2e:candidate-integration` in Slice
5.

## Documentation plan

At PR 6.1: accept D-070 in `docs/10-decisions.md`. At PR 6.4 (closure):
`README.md` (Slice 6 summary paragraph, matching the existing per-slice
paragraph style), `docs/14-founder-dashboard.md` (Next slice → Done, Next
slice → Slice 7), a routine correction of the pre-existing stale "PR 5.5d
... in progress, this unit" README sentence (unrelated staleness noticed
during this planning pass, folded into the same doc-closure pass rather than
a separate PR), `docs/38-application-status-and-review-proposal.md` marked
Locked/Implemented (mirroring how `docs/36` was marked once PR 5.2 shipped
its contract). No new terminology-doc entry needed (`applicant` is already
defined).

## Rollout and hosted-proof plan (future — PR 6.4, not authorized now)

Local: full pgTAP/Vitest/Playwright/build/migration-inventory/type-drift
suite, exactly as run for every prior slice in this session. Hosted (future,
explicit owner authorization required, mirrors D-045/D-067): disposable
hosted Supabase project; apply all 12 migrations; seed two distinct verified
employers (A, B) each with a published vacancy and a real candidate
application; prove employer A cannot see employer B's applicants via the
list/detail RPCs; prove candidate ownership isolation; execute one full
`submitted → reviewing → shortlisted → accepted` transition and confirm
history; revoke employer A's verification mid-review and confirm review
still works; confirm candidate sees the updated status; confirm Production
remains untouched throughout; confirm Preview stays disconnected from
Production Supabase (unchanged from Slice 5's finding — Preview is still
unconfigured and this plan does not change that).

## Recommended next PR

**PR 6.1 — Application status and review database contract**, starting with
accepting D-070 in `docs/10-decisions.md`, then the single additive
migration and its full pgTAP suite, per the contract in
`docs/38-application-status-and-review-proposal.md`.
