# P3 Employer Presentation Polish — Discovery Plan

> **Status: APPROVED IN PRINCIPLE, amended per Founder rulings
> (2026-08-18).** All three Product Decision Required items, plus the two
> query/data flags, have been resolved by the Founder — see "Founder
> Rulings (applied)" immediately below. This document is now the binding
> scope for implementation. The original discovery-only classifications are
> preserved throughout (marked RESOLVED, cross-referenced to the ruling that
> settled them) so the reasoning trail stays visible. **No implementation
> has occurred in this amendment — this is a docs-only commit. P3
> implementation has not started, and no PR has been opened.**

> **For agentic workers:** REQUIRED SUB-SKILL: use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. Scope is now fixed by the Founder
> Rulings section below — do not implement anything the rulings explicitly
> ruled out: CEFR German levels, a new multi-step vacancy-form workflow or
> new route, any CV field/data/query/storage, an Account nav item, or a new
> per-vacancy application-count query.

## Founder Rulings (applied 2026-08-18)

The Founder reviewed the discovery plan and returned rulings resolving the
three Section 10 PRODUCT DECISION REQUIRED items plus the query/data flags.
Each resolves the correspondingly numbered item from the original discovery
pass (Section 10 below, now marked RESOLVED with a cross-reference back
here).

1. **German-requirement control — PRESERVE THE REAL 4-VALUE DOMAIN.** Do
   not introduce the design's CEFR A1–C2 scale. Do not change
   `vacancies.german_requirement`'s schema, its CHECK constraint, its
   validation, or its use in matching. Build the employer-facing control
   (which does not exist today) around the existing four values only —
   `none | basic | conversational | comfortable` — using the existing
   `GERMAN_REQUIREMENT_LABELS` copy and the design's radio/segmented visual
   treatment. Wire it to the existing, currently-unused
   `p_german_requirement` RPC parameter on the draft create/update RPCs. No
   migration required. Resolves Section 10 item #1.
2. **Vacancy form structure — PRESERVE THE SINGLE-PAGE ARCHITECTURE.** Do
   not build a new four-step-plus-review workflow, no new routes, no new
   form state machine. Keep `VacancyDraftForm`'s existing 3 fieldsets and
   the existing decoupled `LanguageRequirementsEditor` (still requiring a
   saved vacancy first, exactly as today) on the exact same pages they
   render on now. Presentation-only improvements only: clearer visual
   section headings/hierarchy within the single page, an orientation/
   progress aid where truthful to the real field order, and stronger visual
   emphasis on the review/readiness content the detail/manage page already
   shows (`ReadinessChecklist`). No new page, no new step, no new routing,
   no new form state. Resolves Section 10 item #2.
3. **CV field — REMOVE ENTIRELY.** No "CV attached" UI, no CV field, no CV
   data, no CV query, no CV storage feature is authorized in P3. Confirmed
   fabricated in the original discovery pass; this ruling makes the removal
   binding rather than a recommendation. Resolves Section 10 item #3.
4. **Navigation — PRESERVE THE REAL IA.** The design's "Home, Vacancies,
   Applications, Account" nav classification is factually wrong (confirmed
   in discovery: the real fourth nav item is Verification, and Account is
   not a nav destination). Ship the real nav unchanged. Do not add an
   Account nav item, do not follow the design's classification. Resolves
   Section 10 item #7.
5. **Vacancy lifecycle — PRESERVE ALL SIX STATES.** Including `withdrawn`,
   which the design's mock omitted. Already correctly scoped in the
   original discovery pass (Section 1, Task B); this ruling makes it
   binding, not merely a recommendation.
6. **`employer_seen_at` additive projections — KEPT, CONDITIONALLY
   APPROVED.** Both proposed additive `SELECT`-list changes satisfy the
   Founder's stated test — see "Query/data rulings" below for the full
   justification and the exact RPCs/files affected. Resolves Section 10
   items #4 and #5.
7. **Per-vacancy application counts — DEFERRED.** No new grouped `COUNT`
   query is added solely to power P3 presentation. See "Query/data
   rulings" below for the resulting UI simplification. Resolves Section 10
   item #6.

### Query/data rulings (detail)

**`employer_seen_at` additive projections — kept.** Two RPCs are extended
to return an already-existing column they don't currently return:

- `list_current_employer_applications` (latest definition in
  `supabase/migrations/20260807220000_account_deletion_tombstone_and_request_contract.sql:2077-2137`)
  gains `employer_seen_at` in its `RETURNS TABLE`/`SELECT` list. Consumed by
  `src/lib/employer/applications/load-employer-applications.ts` →
  `src/components/employer-applications/application-list.tsx`.
- `get_current_employer_application` (jsonb projection,
  `20260806140000_application_status_and_review_contract.sql:495-512`)
  gains an `employer_seen_at` key. Consumed by
  `src/components/employer-applications/application-detail.tsx`.

Both satisfy the Founder's three-part test:
1. **The existing UI cannot access the state without it.** The only
   existing access path is `count_unseen_current_employer_applications()`
   — an aggregate total, not a per-row or per-application value. Without
   these two changes, neither the applications list (which row is unseen)
   nor the detail page ("First opened") can show *which* application(s)
   are unseen — only how many, in total, across the employer's whole
   account.
2. **No new unseen/read semantics.** Same column
   (`applications.employer_seen_at`), same meaning, same write path
   (unchanged by this plan) — only where it is *read* changes.
3. **Strictly projection/access plumbing for the already-shipped N4
   feature.** `employer_seen_at` was introduced by
   `20260811000000_employer_application_seen_contract.sql`, shipped in PR
   #116 (`feat/n4-employer-application-attention`, merged prior to this
   branch's base). These two changes expose that existing feature's data in
   two more places; they do not build a new feature.

**Per-vacancy application counts — deferred.** No `count_current_employer_applications_by_vacancy`-style
query (or equivalent) is added. Resulting UI simplification, applied to
Tasks F and G:
- The home "Your vacancies" mini-list and the `/employer/vacancies` list
  rows show **no application-count figure** (the design's "5 applications"
  / "3 open applications" copy is dropped, not substituted with a fake
  number). The qualitative lifecycle word + one-sentence consequence per
  row (e.g. "Paused — existing applications stay open") needs no count and
  is unaffected.
- The home "needs your action" side card ships **only the
  draft-with-missing-fields reason** (real data: existing per-draft
  readiness). The design's "paused, N open applications" reason is dropped
  from P3 — it would require the same deferred count query to know whether
  a paused vacancy has any open applications at all. Listed explicitly in
  Section 11 as deferred, not silently cut.

---

**Goal:** Restyle and reconcile the presentation of the existing employer
product (`/employer`, `/employer/onboarding`, `/employer/verification`,
`/employer/vacancies` incl. create/edit/detail, `/employer/applications` incl.
detail, employer navigation) against the Klinnova Employer Polish design
artifact — using only data the product already computes or can expose via
small additive query changes — without changing employer IA, onboarding
logic, verification rules, vacancy schema, vacancy lifecycle, publish-
readiness logic, the application state machine, allowed transitions,
unseen/read semantics, notifications, matching, Auth, or transactional email.

**Architecture:** No new routes, no new tables, no schema/enum changes, no
change to any RPC's *logic* — the only backend edits are two additive
`SELECT`-list extensions (exposing an already-existing column,
`employer_seen_at`, in two RPC projections that don't currently return it —
Founder Ruling #6). No new grouped-`COUNT` query is added (Founder Ruling
#7 — per-vacancy application counts are deferred; the home and
vacancies-list UI are simplified instead, dropping every count figure). The
employer-facing German-requirement control (Founder Ruling #1) and the
vacancy-form section restyle (Founder Ruling #2) are both in scope, built
strictly on the existing 4-value domain and the existing single-page form
architecture respectively — no schema change, no new route, no new form
step. Every other change is markup/SCSS/component restructuring against
data already returned today.

**Tech Stack:** Next.js App Router (Server Components + Server Actions),
React, TypeScript (strict, no `any`), Supabase Postgres (RPCs, RLS), SCSS
Modules using `src/styles/tokens.css` / `src/styles/breakpoints.scss`
(identical token system to P1/P2), Vitest + Testing Library, Playwright.

**Spec:** The in-conversation "P3 — Employer Presentation Polish" discovery
brief, reconciled against the decoded design reference
`/Users/olaniyiaborisade/Downloads/Klinnova Employer Polish (1).html` (a
Claude Design canvas bundle; its embedded page content was decoded and is
saved as plain text at
`/private/tmp/claude-501/-Users-olaniyiaborisade-Codes-stint/3e680cb8-6409-412c-850b-0220d4889945/scratchpad/template_text.txt`
for reference — not part of the repo). The design artifact is itself
unusually self-aware: it ships its own "07 · handoff" classification section
and flags several of its own open decisions — those are cross-referenced
throughout this plan rather than re-derived from scratch.

## Global Constraints

- Base SHA: `6bdbc1a799c57c4021977076101d23d2c85450a8` (verified: exact tip
  of `origin/main`, the P2 merge commit). Branch:
  `feat/p3-employer-presentation`, created from that base.
- Canonical application statuses are exactly `submitted | reviewing |
  shortlisted | accepted | rejected`, enforced by a `check` constraint (not
  a DB enum) on `applications.status`
  (`supabase/migrations/20260806140000_application_status_and_review_contract.sql:24`).
  No new status, no `withdrawn` application status, no `interviewed`/`hired`
  as an application status — `hired`/`interview_completed` remain separate
  **outcome events** (`application_outcome_events`,
  `20260810020000_application_outcome_events_contract.sql`), architecturally
  distinct from the status machine, exactly as P2 documented for the
  candidate side.
- Allowed transitions are enforced **server-side only**, in
  `public._application_allowed_transitions(text)`
  (`20260806140000...sql:112-127`): `submitted → {reviewing, shortlisted,
  accepted, rejected}`, `reviewing → {shortlisted, accepted, rejected}`,
  `shortlisted → {accepted, rejected}`, `accepted → {}`, `rejected → {}`.
  Forward-skipping confirmed real. This function is the single source of
  truth for both the RPC that reads it (`get_current_employer_application`)
  and the RPC that validates against it
  (`transition_current_employer_application_status`) — no task in this plan
  touches it.
- `accepted != hired`. The accept-notification email body already states
  this explicitly in product copy
  (`src/lib/applications/candidate-status-email.ts:62-74`). No task adds,
  removes, or softens this distinction.
- Candidate-facing `rejected` already displays as **"Not selected"** via
  `candidateStatusDisplayLabel` (`src/lib/applications/candidate-status-labels.ts:6-10`,
  shipped in P2). The employer-facing action/label stays the canonical
  `"Reject application"` wording — this plan adds that literal button label
  to the employer UI (Task C), it does not touch the candidate-side function.
- Email triggers — **verified against code, not assumed**:
  `NOTIFIABLE_APPLICATION_STATUSES = ["shortlisted", "accepted", "rejected"]`
  (`candidate-status-email.ts:7-11`), wired in
  `src/app/employer/applications/[applicationId]/transition-actions.ts:80-106`,
  fired only when the RPC result is `"updated"` (never on a no-op
  `"already_in_state"` result) and only for a notifiable status. `reviewing`
  never sends an email. Confirmation copy in Task C uses this exact mapping.
- `application_status_history` (per-transition timestamps) and
  `employer_seen_at` (attention/read state) already exist as **separate**
  columns/tables — no schema work is proposed for either. `employer_seen_at`
  is presented in this plan as secondary metadata below the status timeline,
  never as a timeline step, exactly as the design requires.
- No new CSS custom properties — every value must resolve to an existing
  token in `src/styles/tokens.css` or breakpoint in
  `src/styles/breakpoints.scss` (`$breakpoint-sm=480, $breakpoint-md=768,
  $breakpoint-lg=1024, $breakpoint-xl=1280` — identical system to P1/P2,
  already imported by `employer-vacancies.module.scss` and
  `employer-onboarding.module.scss`).
- No fabricated candidate data. Confirmed: the employer-facing application
  projection has no locality/district field (matches the P2 no-fabricated-
  district precedent) and **no CV/resume field exists anywhere in the
  product** — the design mock's "CV | Attached" row is fabricated and is
  **removed entirely per Founder Ruling #3** (Section 10, item #3).
- German-requirement values are exactly `none | basic | conversational |
  comfortable` — never CEFR — per Founder Ruling #1. The control built in
  Task J is a visual restyle of the value set that already governs
  matching; it introduces no new value, no schema/CHECK-constraint change,
  no new matching semantics.
- Vacancy create/edit remains a **single page** with the existing 3
  fieldsets and the existing decoupled `LanguageRequirementsEditor` — no
  new route, no new step, no new form state machine, per Founder Ruling #2.
- No CV field/data/query/storage anywhere in employer or candidate surfaces
  per Founder Ruling #3.
- Employer navigation stays exactly Home/Vacancies/Applications/
  Verification — no Account nav item — per Founder Ruling #4.
- No new grouped-`COUNT` query for per-vacancy application counts — deferred
  per Founder Ruling #7; the UI is simplified (no count figures) rather
  than gaining new query scope.
- STOP BEFORE IMPLEMENTATION. This amendment, once written, is committed on
  the same branch — no product code changes occur in this unit. No PR is
  opened.

---

## 1. Current-state map

### `/employer` (`src/app/employer/page.tsx`)

- **Current files:** `page.tsx` (no dedicated dashboard component — home
  content is inline); `src/components/employer-vacancies/employer-vacancy-page-header.tsx`
  (shared header/nav, rendered on every employer route).
- **Current data:** vacancy list (`loadEmployerDrafts`, all 6 lifecycle
  states), unseen-applications count (`loadUnseenApplicationsCount` →
  `count_unseen_current_employer_applications()` RPC — **already an
  aggregate query, already wired to the nav badge**), employer/company
  verification state.
- **Presentation weakness:** no single "what needs attention" slot;
  presumably shows aggregate status totals the design explicitly wants
  removed (not independently re-verified pixel-for-pixel, but the design's
  own stated correction — "status totals have been removed" — is taken as
  the direction).
- **Proposed change:** one attention slot — unseen-applications card when
  count > 0, readiness/verification card when not verified, nothing else
  competes for that slot. A "needs your action" side card names specific
  vacancies — **RESOLVED per Founder Ruling #7 (deferred count query):**
  ships with only the draft-with-missing-fields reason (real, existing
  readiness data); the paused-with-open-applications reason is dropped for
  P3, listed in Section 11. See Task F.

### `/employer/onboarding`, `/employer/verification`

- Out of design scope per the design's own handoff classification
  (`COPY | Verification. State named, no processing times or approval
  promises.`; onboarding not addressed in the design's numbered sections at
  all). Not independently deep-dived this pass — the brief's constraints
  (do not change onboarding logic, do not change verification rules) apply
  regardless, and the design proposes copy-only correction on verification
  (no fabricated processing-time claims), which is achievable without any
  data change. No task in Section 6 restructures either route.

### `/employer/vacancies` (`src/app/employer/vacancies/page.tsx`)

- **Current files:** `page.tsx` → `EmployerVacancyPageHeader`,
  `EmployerRestrictedNotice`, `VacancyList`
  (`src/components/employer-vacancies/vacancy-list.tsx`).
- **Current data:** `loadEmployerDrafts` → `EmployerDraftListItem[]` — `id,
  title, jobCategory, publicLocality, employerType, companyName,
  publicationState, expiresAt, isEffectivelyExpired, updatedAt, ready,
  checklist`. **No per-vacancy application count** (confirmed by reading the
  type definition and its query directly,
  `src/lib/employer/vacancies/load-employer-drafts.ts:17-30,61-69` — the
  `.select()` list has no join/count against `applications`).
- **Lifecycle states:** real `VacancyLifecycleState` = `draft | published |
  paused | filled | expired | withdrawn` — **six** states
  (`load-employer-drafts.ts:14-15`), confirmed by six real server actions in
  `vacancy-lifecycle-actions.tsx:225-302` (Publish, Pause, Resume, Mark
  filled, Withdraw, Renew to draft). The design mock only shows five
  (missing `withdrawn` entirely — Section 10, item #7).
- **Presentation weakness:** flat list, not grouped by live/not-live; no
  per-row consequence sentence.
- **Proposed change:** group Live vs. Not live, one lifecycle word + one
  consequence sentence per row (extend the existing pattern to cover
  `withdrawn`, per Founder Ruling #5), action on the row. **RESOLVED per
  Founder Ruling #7:** no per-row application count — the design's "5
  applications" figure is dropped, not added via a new query.

### Vacancy create (`/employer/vacancies/new`) and edit (`/employer/vacancies/[vacancyId]/edit`)

- **Current files:** both routes render the same `VacancyDraftForm`
  component — **a single page, not a stepped wizard.**
- **Current fields, in order, as three real `<fieldset>` groups:** (1)
  Basics — title, jobCategory, publicLocality; (2) Role details —
  description, workplaceType, workFrequency, employmentTypes (checkboxes),
  shiftRequirements (checkboxes), availableFrom, experienceNotes,
  cvRequired, interviewEnglishOk; (3) Salary (EUR gross) — salaryAmountEur,
  salaryPeriod.
- **Language requirements are not in this form.** They're a separate
  component, `LanguageRequirementsEditor`, driven by
  `replaceDraftLanguagesSchema`, which **requires an existing `vacancyId`**
  — languages can only be set after the draft exists, on the detail/manage
  page, not during initial create.
- **No German-requirement control exists anywhere in the employer UI
  today** — see Section 3. **RESOLVED per Founder Ruling #1:** Task J
  builds it around the real 4-value domain, never CEFR.
- **No separate review/publish page exists.** Publish happens via a
  `Publish` button (gated `publicationState === "draft"`,
  `vacancy-lifecycle-actions.tsx:191,225-234`) directly on the vacancy
  detail/manage page, which already shows the readiness checklist beside it.
- **Publish-readiness is already presented as a checklist, not an error
  dump** — `mapReadinessChecklist()` / `readinessHeadline()`
  (`src/lib/employer/vacancies/readiness.ts`), rendered by
  `ReadinessChecklist` (`readiness-checklist.tsx:22-51`) with 15 real
  checklist items (`CHECKLIST_ORDER`: employer_completion, verification,
  title, job_category, public_locality, description, workplace_type,
  work_frequency, employment_types, shift_requirements, salary, languages,
  cv_required, interview_english_ok, company). **This already matches the
  design's stated goal** ("readiness stated on the review step, not raised
  as an error after publish") — no new component needed for that part.
- **Presentation weakness:** no visual section grouping or sticky index; the
  15-item checklist has no distilled 4-line summary comparable to the mock's
  review card.
- **Proposed change — RESOLVED per Founder Ruling #2:** the design's "four
  named sections + separate review step" is **not built as a new
  workflow.** The single-page 3-fieldset form and the decoupled language
  editor (still requiring a saved vacancy first) are preserved exactly as
  they are today, on the exact same pages. In scope: visually group the
  existing 3 fieldsets under clearer headings within the single page, an
  orientation/progress aid where truthful to the real field order, and
  stronger visual emphasis on the existing `ReadinessChecklist` on the
  detail/manage page. No new route, no new step, no new form state. See
  Task K.

### `/employer/applications` (`src/app/employer/applications/page.tsx`)

- **Current files:** `page.tsx` → `ApplicationList`
  (`src/components/employer-applications/`).
- **Current data:** `list_current_employer_applications` RPC (latest
  definition in
  `supabase/migrations/20260807220000_account_deletion_tombstone_and_request_contract.sql:2077-2137`)
  returns `application_id, vacancy_id, vacancy_title, candidate_deleted,
  candidate_display_name, job_category, german_comfort, available_from,
  current_status, submitted_at, updated_at`. **`employer_seen_at` is not in
  this return list** (confirmed by reading the SQL directly) — Section 10,
  item #4.
- **Filtering:** `?vacancy=` and `?status=` query-param filters **already
  exist and work today** (`application-list-filters.tsx`,
  `parse-list-filters.ts`, RPC params `p_vacancy_id`/`p_status`). The
  per-vacancy filter the design's brief says not to add unless it already
  exists cleanly — **it already does; reuse it, add nothing new.**
- **Proposed change:** three derived groups — Needs review / Open / Decided.
  "Open" (submitted/reviewing/shortlisted) and "Decided"
  (accepted/rejected) are derivable today from `current_status`, already
  loaded, zero new queries. "Needs review" (unseen) is **not** derivable
  today — blocked on the additive RPC change in item #4.

### `/employer/applications/[applicationId]`

- **Current files:** route file →
  `src/components/employer-applications/application-detail.tsx`,
  `application-transition-form.tsx`, plus a separate outcome-recording
  section (`record-outcome-form.tsx`, `application-outcome-history.tsx`,
  `void-outcome-button.tsx`).
- **Current candidate projection**
  (`get_current_employer_application`/`application-detail.tsx:59-121`):
  `matched_job_category, german_comfort, languages[],
  work_authorisation_declared, available_from, employment_types[],
  shift_preferences[]`. **No locality/district field. No CV/resume field —
  confirmed absent from the schema, the component, and every migration
  (grep for cv_url/resume_url/cv_link/curriculum returns nothing).** The
  design's "Availability" row maps cleanly to `shift_preferences`
  (presentation remap only); "Work permission" maps to
  `work_authorisation_declared` (presentation-only). "CV | Attached" has no
  backing data anywhere — **RESOLVED per Founder Ruling #3: removed
  entirely, not built.**
- **Status history:** `application_status_history` already has real,
  per-transition `occurred_at` timestamps and is already returned in full by
  `get_current_employer_application` (`status_history` key) — **no schema
  work needed** for a dated timeline exactly as the mock shows ("Submitted
  15 August", "Reviewing 17 August").
- **`employer_seen_at` / "First opened":** not currently included in this
  RPC's projection (confirmed: its `SELECT`/jsonb-build list has no
  `employer_seen_at` key) — Section 10, item #3.
- **Current status-action UI:** a **single `<select>` dropdown** populated
  only with `allowedTransitions` (so there is no dead/no-op option today) +
  one generic "Update status" submit button
  (`application-transition-form.tsx:104-185`). **No discrete labeled
  buttons, no confirmation dialog exists today for any transition.** Current
  employer-facing label for `rejected` is the generic `"Rejected"`
  (`src/lib/employer/applications/status.ts:28`), not yet `"Reject
  application"`.
- **Outcome-recording section** (interview/hire events, a real, separate
  M5.1 contract) is **not shown anywhere in the design mock.** It is kept
  as-is, below the restyled status-action block — see Task C.
- **Proposed change:** replace the dropdown with discrete
  state-dependent buttons (Start reviewing / Shortlist / Accept / Reject
  application, per current status) plus a confirmation dialog for the two
  terminal actions, using the exact existing `allowedTransitions` data and
  the exact existing `transitionEmployerApplicationAction` — **no new RPC
  call, no new transition logic.**

### `/employer/account`

- **No dedicated `/employer/account` page exists.** Only
  `/employer/account/delete` (`DeleteAccountPanel`) and
  `/employer/account/export` (a route-handler file download), both linked
  from the bottom of the `/employer` home page today, not from any nav item.
  Design's "KEEP, out of scope" is safe for content; its assumption that
  Account is a nav destination is not — **RESOLVED per Founder Ruling #4:
  ship the real nav, do not add an Account nav item.**

### Employer navigation/header

- **File:** `src/components/employer-vacancies/employer-vacancy-page-header.tsx`.
- **Real nav items:** Home / Vacancies / Applications / **Verification** —
  not "Account". There is no Account nav destination.
- **Unseen-applications badge is already implemented, not new** —
  `loadUnseenApplicationsCount` renders as `styles.navBadge` next to
  "Applications" when > 0. This resolves the design's own flagged
  "PRODUCT DECISION REQUIRED: is `employer_seen_at` aggregate-queryable?" —
  **it already is, and it's already wired.**

---

## 2. Design reconciliation

Every element from the design's seven numbered sections, classified.

### 01 · Employer home

| Design element | Classification | Notes |
|---|---|---|
| Single attention slot (unseen when > 0, readiness when not verified) | IMPLEMENTABLE WITH EXISTING DATA | Both signals already load today (`loadUnseenApplicationsCount`, verification state). |
| "3 applications you have not opened" count | IMPLEMENTABLE AS-IS | Same aggregate RPC already powering the nav badge. |
| Aggregate status totals removed | IMPLEMENTABLE AS-IS | Deletion, not addition. |
| "Your vacancies" mini-list with per-row application counts | **RESOLVED — DROPPED (Founder Ruling #7)** | `EmployerDraftListItem` has no application-count field today; no new query added. Mini-list shows title/locality/lifecycle state, no counts. |
| "Needs your action" side card (draft missing fields / paused with N open applications) | **RESOLVED — SIMPLIFIED (Founder Ruling #7)** | Ships with only draft-missing-fields (existing readiness data). Paused-with-N-open-applications is dropped, not built — see Section 11. |
| Verification readiness card, warm-neutral not oxblood | IMPLEMENTABLE AS-IS | Styling only. |
| Sidebar: total vacancies (plain), unseen applications (oxblood pill) | IMPLEMENTABLE AS-IS | Both counts already available (`loadEmployerDrafts.length`, existing unseen aggregate). |

### 02 · Vacancies

| Design element | Classification | Notes |
|---|---|---|
| Grouped Live / Not live | IMPLEMENTABLE AS-IS | Pure derivation from `publicationState`. |
| Lifecycle word + one consequence sentence per row | **RESOLVED — DESIGN CORRECTION APPLIED (Founder Ruling #5)** | Real enum has 6 states, design shows 5 — `withdrawn` is added following the same pattern, binding per ruling. |
| Per-row application count ("5 applications") | **RESOLVED — DROPPED (Founder Ruling #7)** | No new query added; row shows lifecycle word + consequence sentence only, same gap as home's mini-list. |
| Action per row (Review / Edit / Resume / Continue / View) | IMPLEMENTABLE AS-IS | Maps directly to existing per-state actions already in `vacancy-lifecycle-actions.tsx`. |

### 03 · Create and review a vacancy

| Design element | Classification | Notes |
|---|---|---|
| Four named sections + sticky rail index | **RESOLVED — SCOPED DOWN (Founder Ruling #2)** | Real form stays a single page with the existing 3 fieldsets + decoupled language editor; sections are grouped visually within that one page, no new step/route/form state. See Task K. |
| Minimum German level, single-choice radio, 7 CEFR options | **RESOLVED — REAL 4 VALUES ONLY (Founder Ruling #1)** | Built as No German required/Basic/Conversational/Comfortable using `GERMAN_REQUIREMENT_LABELS`, never CEFR. No schema/matching change. See Task J. |
| Work permission checkbox | IMPLEMENTABLE AS-IS | Real field (`cvRequired`... — actually a distinct "must be permitted to work" concept; confirm exact form field name at implementation time), already in the form. |
| Separate "Review and publish" step with 4-line summary + Publish/Keep as draft | **RESOLVED — NOT A NEW STEP (Founder Ruling #2)** | The existing detail/manage page (readiness checklist + Publish button) gets stronger visual emphasis; it is not replaced by a new page. |
| Readiness stated on review, not as post-submit errors | ALREADY TRUE — no change needed | `ReadinessChecklist` already does exactly this. |

### 04 · Applications and status control

| Design element | Classification | Notes |
|---|---|---|
| Needs review / Open / Decided groups | IMPLEMENTABLE — RESOLVED (Founder Ruling #6) | Open/Decided: zero new queries. Needs review: the additive `employer_seen_at` projection change is approved (kept, conditionally). |
| Per-vacancy filter | ALREADY EXISTS | Reuse `?vacancy=`, add nothing new — design's own caution ("no per-vacancy filter unless it already exists cleanly") is satisfied by reuse. |
| Discrete state-dependent action buttons (Start reviewing / Shortlist / Accept / Reject application) | IMPLEMENTABLE WITH EXISTING DATA | Same `allowedTransitions` array, same transition RPC — component restructure only. |
| Confirmation dialogs on both terminal actions | IMPLEMENTABLE WITH EXISTING DATA | New UI state, no new RPC call. Copy must reflect verified email behavior (Global Constraints) and accepted≠hired. |
| "Reject application" employer-facing wording | IMPLEMENTABLE AS-IS | New literal label on the existing reject transition; candidate-facing "Not selected" is untouched (already shipped, P2). |
| Status history with dated transitions, seen state separated below a divider | IMPLEMENTABLE WITH EXISTING DATA (status history) / **RESOLVED (Founder Ruling #6)** for "First opened" | History is already returned in full; the additive `employer_seen_at` projection change on `get_current_employer_application` is approved. |
| "CV \| Attached" candidate field | **RESOLVED — REMOVED (Founder Ruling #3)** | No CV/resume field exists anywhere in the product; not built. |
| "German level \| A2", "Availability", "Work permission" fields | IMPLEMENTABLE AS-IS | Real fields, direct or near-direct remap (`german_comfort`, `shift_preferences`, `work_authorisation_declared`). |
| Outcome-recording section (interview/hire events) | **NOT ADDRESSED BY DESIGN — KEEP AS-IS** | Real, separate feature; not shown in the mock at all; retained below the restyled status block. |

### 05 · Mobile (390)

| Design element | Classification | Notes |
|---|---|---|
| Sidebar → top bar with menu | IMPLEMENTABLE AS-IS (restyle) | No IA change — same 4 real destinations. |
| Vacancy rows → stacked cards | IMPLEMENTABLE AS-IS (restyle) | Employer surfaces currently have minimal responsive treatment (`employer-vacancies.module.scss` has one `@media` block) — this is new SCSS work, not new data. |
| Status actions → full-width stacked buttons, terminal actions in a bottom sheet | IMPLEMENTABLE WITH EXISTING DATA | Same restructure as Task C, styled for narrow viewports. |
| Long German titles wrap, not truncate | IMPLEMENTABLE AS-IS | Styling rule. |
| 768 → icon-only sidebar; 1280 → full labelled sidebar | IMPLEMENTABLE AS-IS | Matches existing breakpoint tokens. |

### 06 · Empty states

| Design element | Classification | Notes |
|---|---|---|
| "No vacancies yet" | RESTYLE OF EXISTING | Real copy already exists (`VACANCY_EMPTY_LIST`, `messages.ts:28-29`). |
| "No applications yet" | RESTYLE OF EXISTING | Real copy already exists (`APPLICATION_EMPTY_LIST`, `messages.ts:12`), with existing test coverage. |
| "Everything reviewed" | NEW | No existing implementation found. |
| "Verification not finished" | NEW | No existing implementation found (verification-gated publish messaging may exist elsewhere; not confirmed as this exact empty-state copy). |
| "This vacancy is a draft" | NEW | No existing implementation found as a standalone empty state (readiness checklist covers the same information differently). |
| "No applications for this vacancy" | NEW | No existing implementation found. |

### 07 · Handoff (design's own classification)

| Design's own classification | Verdict |
|---|---|
| RESTRUCTURE — Employer home | Confirmed correct scope, simplified per Founder Ruling #7 (no application-count figures). |
| RESTYLE — Onboarding and readiness | Out of this plan's deep-dive; readiness component already matches the goal. |
| COPY — Verification | Achievable, copy-only, not deep-dived this pass. |
| RESTRUCTURE — Vacancies | Confirmed correct scope, plus the `withdrawn` state (Founder Ruling #5) and the count-figure removal (Ruling #7). |
| RESTYLE — Create and edit | **Corrected** — scoped down to a presentation-only restyle of the existing single page, not a new workflow, per Founder Ruling #2. |
| RESTRUCTURE — Applications | Confirmed correct scope, plus the two approved additive projections (Ruling #6) and the removed CV field (Ruling #3). |
| EMPTY — Six new empty states | Confirmed: 2 already exist (restyle only), 4 are genuinely new. |
| KEEP — Navigation and IA: "Home, Vacancies, Applications, Account" | **RESOLVED — design's classification rejected (Founder Ruling #4)** — real nav is Home/Vacancies/Applications/Verification; Account is not a nav destination, and no Account nav item is added. |
| KEEP — Account | Confirmed safe for content; the nav-item assumption is rejected per Ruling #4. |

---

## 3. Product-truth reconciliation

- **Application status machine** — real, single source of truth in
  `public._application_allowed_transitions(text)`, enforced server-side with
  a row lock, never trusting client-supplied "current status." Quoted in
  full in Global Constraints. No task in this plan touches it.
- **Status history** — real, per-transition, `application_status_history`
  table, already returned by `get_current_employer_application`. No schema
  work needed.
- **`employer_seen_at`** — real column, real aggregate RPC
  (`count_unseen_current_employer_applications`), already wired to the nav
  badge and (implicitly) usable for the home attention slot. Not yet
  returned by either the applications-list RPC or the single-application
  detail RPC — the two additive projection changes in Section 10.
- **Email notifications** — real, verified directly against
  `NOTIFIABLE_APPLICATION_STATUSES` and its call site: shortlisted, accepted,
  rejected send an email; reviewing does not; a no-op transition never
  sends one. Matches the brief's stated product truth exactly.
- **`accepted != hired`** — real and already stated in product copy in the
  accept-notification email. The separate `application_outcome_events`
  contract (interview_completed/hired) confirms this is architectural, not
  just wording.
- **German-requirement field** — real column
  (`vacancies.german_requirement text not null`, CHECK-constrained to
  `none/basic/conversational/comfortable`), real matching use
  (`evaluateGerman`/`meetsGermanRequirement` in `src/lib/matching/rules.ts`
  and `ranks.ts`, ordinal comparison against the candidate's own
  `germanComfort`, same 4-value vocabulary on both sides), but **no
  employer-facing UI has ever set it** — every vacancy is created with
  `german_requirement = 'none'` by RPC default and can't be changed through
  the product today. The design's proposed CEFR scale does not exist
  anywhere in the schema, the matching logic, or the candidate's own
  onboarding vocabulary. **Founder Ruling #1: build the missing control
  around the real 4-value domain, never CEFR — see Task J.**
- **Candidate data exposure** — real, narrow projection confirmed by direct
  query inspection: `matched_job_category, german_comfort, languages[],
  work_authorisation_declared, available_from, employment_types[],
  shift_preferences[]`. No locality. No CV/resume field anywhere in the
  product (confirmed by repo-wide grep for cv_url/resume_url/cv_link/
  curriculum — zero real hits).
- **Vacancy lifecycle** — real six-value enum (`draft, published, paused,
  filled, expired, withdrawn`), all six with real server actions. Publish-
  readiness already presented as a checklist, matching the design's stated
  goal without any new component.
- **Employer navigation** — real four items are Home/Vacancies/Applications/
  Verification; the design's assumed fourth item (Account) is not a nav
  destination in the current product.

---

## 4. Component strategy

**Decision: restyle existing route-specific components in place; add a
small number of new, narrowly-scoped presentational components; make the two
Founder-approved additive RPC-projection changes as the only backend edits;
do not touch any transition/matching/readiness logic; do not add the
deferred per-vacancy count query.**

- **Applications list/detail:** restyle `ApplicationList`,
  `application-transition-form.tsx` (→ discrete buttons + confirm dialog),
  `application-detail.tsx` in place. New: a small pure grouping function
  (Task A) and a confirmation-dialog component (Task D) — both consume data
  the RPCs already return once the two additive projection changes land.
- **Vacancies list/home:** restyle `VacancyList`, add the `withdrawn`
  lifecycle-word entry to whatever mapping function backs the existing
  per-state label + consequence sentence (Task B). Home page attention slot
  and side card are new composition purely over existing readiness data —
  no new query (Task F, scoped down per Founder Ruling #7).
- **Empty states:** two are copy/style-only restyles of existing components;
  four are new, small, presentational components following the existing
  `*EmptyState` pattern (`MatchesEmptyState`/`ApplicationsEmptyState`
  precedent from the candidate side).
- **Create/edit form (Task K):** the existing 3 `<fieldset>` groups gain
  visual section headings and an orientation aid within the same single
  page — no new component wraps the whole form, no new page.
- **German-requirement control (Task J):** one new small presentational +
  form-wiring component, `GermanRequirementField`, a radio/segmented group
  over the real 4 values, added inside the existing "Role details" fieldset
  (or a 4th, still-single-page "Requirements" fieldset alongside the
  language editor once a vacancy exists — exact placement decided at
  implementation time against the real form's field order).

---

## 5. Scope

**No schema, Auth, email, matching, or transactional-config changes.**

**Backend changes (both Founder-approved per Ruling #6, additive `SELECT`-list
extensions to existing RPCs — read the full current function body before
editing, diff against the original, and rerun the full RPC/e2e test suite;
do not retype either function from memory or partial reads):**
- `list_current_employer_applications` — add `employer_seen_at` to the
  `RETURNS TABLE`/`SELECT` list (Section 10, item #5).
- `get_current_employer_application` — add `employer_seen_at` to its jsonb
  projection (Section 10, item #4).
- **No per-vacancy `COUNT` query is added — deferred per Founder Ruling
  #7.** No new RPC, no schema change, no migration for this item.
- German-requirement control (Task J) calls the **existing**
  `p_german_requirement` RPC parameter on the draft create/update RPCs
  (already present, currently always called with its default/omitted) —
  this is a new call-site passing a real value, not a new RPC parameter or
  a migration.

**Modified files (frontend):**
- `src/app/employer/page.tsx` (attention slot — draft-incomplete reason
  only; side card, no counts)
- `src/components/employer-vacancies/vacancy-list.tsx`,
  `employer-vacancies.module.scss` (grouping, withdrawn state — no counts)
- `src/lib/employer/vacancies/load-employer-drafts.ts` (add `withdrawn`
  wherever the lifecycle label/consequence mapping currently lives — no
  count field added)
- `src/lib/employer/applications/load-employer-applications.ts`,
  `application-list.tsx`, `application-list.module.scss` (Needs
  review/Open/Decided grouping, once the additive RPC change lands)
- `src/components/employer-applications/application-transition-form.tsx`
  (→ discrete buttons), `application-detail.tsx` (First opened row, once
  the additive RPC change lands; Availability/Work permission relabel; no
  CV row)
- `src/lib/employer/applications/status.ts` (add `"Reject application"`
  employer-facing action label; canonical status labels untouched)
- `src/components/employer-vacancies/employer-vacancy-page-header.tsx`
  (visual polish only — real nav items unchanged, per Founder Ruling #4)
- `src/components/employer-vacancies/vacancy-draft-form.tsx` (visual
  section grouping within the existing single page; add the new German-
  requirement field; existing field order/validation unchanged)
- `src/lib/employer/vacancies/schemas.ts` (add a `germanRequirement` field
  to `createDraftVacancyFormSchema`/`updateDraftVacancyFormSchema`,
  constrained to the real 4 values)
- `src/app/employer/vacancies/actions.ts` (thread the form's
  `germanRequirement` value through to the existing
  `p_german_requirement` RPC parameter — parameter already exists, this is
  the first real caller)

**New files:**
- `src/lib/employer/applications/group-applications.ts` (+ `.test.ts`) —
  pure Needs-review/Open/Decided derivation
- `src/components/employer-applications/application-status-actions.tsx`
  (+ `.test.tsx`) — discrete buttons replacing the dropdown
- `src/components/employer-applications/status-transition-confirm-dialog.tsx`
  (+ `.test.tsx`) — shared Accept/Reject confirmation
- `src/components/employer-vacancies/german-requirement-field.tsx`
  (+ `.test.tsx`) — radio/segmented control over the real 4 values
- 4 new empty-state components under `src/components/employer-*` (exact
  home decided at implementation time, following the existing
  `*EmptyState` pattern)

**Files deleted:** none.

**Explicitly not touched, per Founder ruling (not "blocked," ruled out):**
`LanguageRequirementsEditor`'s decoupled-from-create architecture (Ruling
#2 preserves it as-is), any CV field/component anywhere (Ruling #3), any
new nav item (Ruling #4), any new per-vacancy count query or the tables/
components that would have consumed it (Ruling #7).

---

## 6. Tasks

> All tasks A–K are now implementable — every PRODUCT DECISION REQUIRED item
> is resolved (see Founder Rulings above) and scope is final. Logic tasks
> (A, J, part of F) get full TDD-style signatures and tests; pure-restyle
> tasks (B, C's markup, G, H, I, K) get concrete acceptance criteria with
> exact code deferred to implementation time, matching P2's own convention
> for restyle-only work. Task F is scoped down per Founder Ruling #7 (no
> application counts); Task G drops its count-figure requirement for the
> same reason.

### Task A: Applications list grouping (Needs review / Open / Decided)

**Depends on:** the additive `employer_seen_at` projection change to
`list_current_employer_applications` (Section 10, item #4) landing first,
with its own migration diffed against the original function and the full
RPC test suite passing before this task starts.

**Files:**
- Create: `src/lib/employer/applications/group-applications.ts`
- Test: `src/lib/employer/applications/group-applications.test.ts`
- Modify: `src/lib/employer/applications/load-employer-applications.ts`
  (thread `employer_seen_at` through to the row type once the RPC returns
  it)

**Interfaces:**
- Produces: `groupEmployerApplications(rows: EmployerApplicationRow[]): {
  needsReview: EmployerApplicationRow[]; open: EmployerApplicationRow[];
  decided: EmployerApplicationRow[] }` — `needsReview` = `employer_seen_at
  === null`, `open` = `current_status` in `submitted|reviewing|shortlisted`,
  `decided` = `current_status` in `accepted|rejected`. A row can appear in
  both `needsReview` and one of `open`/`decided` (the groups are not
  mutually exclusive partitions of the same axis — unseen is an orthogonal
  attention signal, not a 4th status bucket), matching the design's own
  framing ("needs review is unseen" as a separate dimension from status).
- Consumes: `EmployerApplicationRow` (extended with `employer_seen_at:
  string | null`) from `@/lib/employer/applications/load-employer-applications`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { groupEmployerApplications } from "@/lib/employer/applications/group-applications";
import type { EmployerApplicationRow } from "@/lib/employer/applications/load-employer-applications";

function row(overrides: Partial<EmployerApplicationRow>): EmployerApplicationRow {
  return {
    applicationId: "a1",
    vacancyId: "v1",
    vacancyTitle: "Reinigungskraft",
    candidateDeleted: false,
    candidateDisplayName: "A. Khoury",
    jobCategory: "cleaning",
    germanComfort: "basic",
    availableFrom: "2026-09-01",
    currentStatus: "submitted",
    submittedAt: "2026-08-15T00:00:00Z",
    updatedAt: "2026-08-15T00:00:00Z",
    employerSeenAt: null,
    ...overrides,
  };
}

describe("groupEmployerApplications", () => {
  it("puts unseen rows in needsReview regardless of status", () => {
    const rows = [
      row({ applicationId: "a1", currentStatus: "submitted", employerSeenAt: null }),
      row({ applicationId: "a2", currentStatus: "accepted", employerSeenAt: null }),
    ];
    const { needsReview } = groupEmployerApplications(rows);
    expect(needsReview.map((r) => r.applicationId)).toEqual(["a1", "a2"]);
  });

  it("splits open vs decided purely on current_status", () => {
    const rows = [
      row({ applicationId: "a1", currentStatus: "reviewing", employerSeenAt: "2026-08-16T00:00:00Z" }),
      row({ applicationId: "a2", currentStatus: "rejected", employerSeenAt: "2026-08-16T00:00:00Z" }),
    ];
    const { open, decided } = groupEmployerApplications(rows);
    expect(open.map((r) => r.applicationId)).toEqual(["a1"]);
    expect(decided.map((r) => r.applicationId)).toEqual(["a2"]);
  });

  it("never drops a row — every row appears in exactly one of open/decided, plus needsReview if unseen", () => {
    const rows = [row({ applicationId: "a1", currentStatus: "shortlisted", employerSeenAt: null })];
    const { needsReview, open, decided } = groupEmployerApplications(rows);
    expect(needsReview).toHaveLength(1);
    expect(open).toHaveLength(1);
    expect(decided).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/employer/applications/group-applications.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `groupEmployerApplications`**

```ts
import type { EmployerApplicationRow } from "@/lib/employer/applications/load-employer-applications";

const OPEN_STATUSES = new Set(["submitted", "reviewing", "shortlisted"]);

export function groupEmployerApplications(rows: EmployerApplicationRow[]) {
  const needsReview = rows.filter((r) => r.employerSeenAt === null);
  const open = rows.filter((r) => OPEN_STATUSES.has(r.currentStatus));
  const decided = rows.filter((r) => !OPEN_STATUSES.has(r.currentStatus));
  return { needsReview, open, decided };
}
```

- [ ] **Step 4: Run test to verify it passes; commit**

```bash
npx vitest run src/lib/employer/applications/group-applications.test.ts
git add src/lib/employer/applications/group-applications.ts src/lib/employer/applications/group-applications.test.ts
git commit -m "feat: derive needs-review/open/decided application grouping, zero new persistent state"
```

### Task B: Add `withdrawn` to the vacancy lifecycle label/consequence mapping

**Files:**
- Modify: whichever file currently maps `VacancyLifecycleState` to a display
  word + consequence sentence for `VacancyList` (locate at implementation
  time — likely co-located with `vacancy-list.tsx` or in
  `src/lib/employer/vacancies/messages.ts`; confirm exact location before
  editing, do not guess).
- Test: the corresponding existing test file for that mapping.

**Acceptance criteria:** `withdrawn` gets its own word (not "Closed") and
its own one-sentence consequence, following the exact structural pattern
already used for `paused` ("applications stay open"), `expired` ("was not
filled"), and `filled` ("says when and how many were kept") — i.e., state
what withdrawal means for existing applications, using only real product
behavior (confirm with the `Withdraw` server action's actual effect on
existing applications before writing the sentence — do not invent a
consequence). Existing tests for the four already-covered states must
continue to pass unmodified.

- [ ] **Step 1:** Locate the mapping function and its test file; read both
  in full.
- [ ] **Step 2:** Add a failing test case for `withdrawn`.
- [ ] **Step 3:** Add the `withdrawn` case to the mapping, verified against
  the real behavior of the `Withdraw` action in `vacancy-lifecycle-actions.tsx`.
- [ ] **Step 4:** Run the full test file, confirm all cases (old + new)
  pass; commit.

### Task C: Discrete status-action buttons + confirmation dialogs

**Files:**
- Create: `src/components/employer-applications/application-status-actions.tsx`
- Test: `src/components/employer-applications/application-status-actions.test.tsx`
- Create: `src/components/employer-applications/status-transition-confirm-dialog.tsx`
- Test: `src/components/employer-applications/status-transition-confirm-dialog.test.tsx`
- Modify: `src/components/employer-applications/application-detail.tsx`
  (render `ApplicationStatusActions` instead of the raw
  `ApplicationTransitionForm` dropdown; keep
  `transitionEmployerApplicationAction` as the only mutation call)
- Modify: `src/lib/employer/applications/status.ts` (add
  `employerApplicationActionLabel(status: ApplicationStatus): string`
  mapping — `submitted → "Start reviewing"`/`"Shortlist"`/`"Accept"`/`"Reject
  application"` as separate discrete labels, not one function per status;
  exact shape decided at implementation time against the existing file's
  conventions)

**Interfaces:**
- Produces: `ApplicationStatusActions({ currentStatus: ApplicationStatus,
  allowedTransitions: ApplicationStatus[], onTransition:
  (target: ApplicationStatus) => void })` — renders one button per allowed
  transition, ordinary transitions first, terminal transitions
  (`accepted`/`rejected`) last, separated by a divider; renders nothing (no
  disabled button, no placeholder) when `allowedTransitions.length === 0`,
  matching the existing "no further status action" precedent in
  `application-transition-form.tsx:104-116`. Terminal-transition buttons
  open `StatusTransitionConfirmDialog` instead of calling `onTransition`
  directly.
- Produces: `StatusTransitionConfirmDialog({ targetStatus: "accepted" |
  "rejected", onConfirm: () => void, onCancel: () => void })` — copy for
  `accepted` states plainly that accepting does not record a hire (reusing
  the existing product-truth wording already in the accept email); copy for
  `rejected` states that the candidate sees this as "Not selected" and no
  reason is shared with them. Both states note the action cannot be
  changed afterward. Neither copy claims an email is sent for a status this
  plan's verified `NOTIFIABLE_APPLICATION_STATUSES` list doesn't cover.
- Consumes: `ApplicationStatus`, `applicationStatusLabel`,
  `employerApplicationActionLabel` from
  `@/lib/employer/applications/status`.

- [ ] **Step 1: Write the failing test for `ApplicationStatusActions`**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApplicationStatusActions } from "@/components/employer-applications/application-status-actions";

describe("ApplicationStatusActions", () => {
  it("renders one button per allowed transition, in submitted order", () => {
    render(
      <ApplicationStatusActions
        currentStatus="submitted"
        allowedTransitions={["reviewing", "shortlisted", "accepted", "rejected"]}
        onTransition={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Start reviewing" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Shortlist" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject application" })).toBeInTheDocument();
  });

  it("renders no action controls at all for a terminal status", () => {
    render(
      <ApplicationStatusActions currentStatus="accepted" allowedTransitions={[]} onTransition={vi.fn()} />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/employer-applications/application-status-actions.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `ApplicationStatusActions` and
  `StatusTransitionConfirmDialog`** per the interfaces above, wiring
  `accepted`/`rejected` clicks to open the dialog rather than transition
  immediately.

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Wire into `application-detail.tsx`**, replacing the
  dropdown. Run the existing `application-detail.test.tsx` and
  `application-transition-form.test.tsx` — update assertions that depended
  on the dropdown markup (expected: these need real updates, not just a
  pass-through, since the interaction model changes from select+submit to
  discrete buttons+confirm).

- [ ] **Step 6: Run the full applications test suite, then commit**

```bash
npx vitest run src/components/employer-applications src/lib/employer/applications
git add src/components/employer-applications/application-status-actions.tsx src/components/employer-applications/application-status-actions.test.tsx src/components/employer-applications/status-transition-confirm-dialog.tsx src/components/employer-applications/status-transition-confirm-dialog.test.tsx src/components/employer-applications/application-detail.tsx src/lib/employer/applications/status.ts
git commit -m "feat(employer-applications): discrete status-action buttons with confirm on terminal actions"
```

### Task D: "First opened" on the application detail page

**Depends on:** the additive `employer_seen_at` projection change to
`get_current_employer_application` (Section 10, item #3) — read the full
current function body first, diff, rerun the RPC/e2e suite before touching
any frontend code.

**Files:**
- Modify: `src/components/employer-applications/application-detail.tsx`
  (render "First opened {date}" below the status-history divider, as
  secondary metadata, never as a timeline node)
- Modify: `application-detail.test.tsx`

**Acceptance criteria:** the row renders only when `employer_seen_at !==
null`; it is visually and structurally separate from the
`application_status_history` list (a different element, not appended to the
same `<ol>`); when `employer_seen_at === null`, nothing renders in its
place (no "Not yet opened" placeholder — matches the "state, cause, one
action" empty-state discipline in Section 2 rather than inventing a new
micro-empty-state here).

### Task E: Employer-facing candidate field remap (Availability, Work permission)

**Files:**
- Modify: `src/components/employer-applications/application-detail.tsx`

**Acceptance criteria:** relabel the existing `shift_preferences` row as
"Availability" and `work_authorisation_declared` as "Work permission",
using existing label-formatting helpers (locate and reuse whatever function
currently formats `shift_preferences` for other surfaces — do not
hand-roll a duplicate formatter). No new field, no CV row added (Section
10, item #6 — explicitly drop).

### Task F: Employer home — attention slot and vacancy side card

**Scope, per Founder Ruling #7:** no per-vacancy application-count query is
added. The side card ships with only the draft-with-missing-fields reason,
built entirely from existing readiness data. The design's
paused-with-N-open-applications reason is **not built** in P3 — see Section
11.

**Files:**
- Modify: `src/app/employer/page.tsx`
- Modify/create: `page.module.scss`
- New: `src/lib/employer/vacancies/select-attention-vacancies.ts`
  (+ `.test.ts`) — given the vacancy list and its existing readiness data,
  returns the subset needing action

**Interfaces:**
- Produces: `selectAttentionVacancies(drafts: EmployerDraftListItem[]): {
  vacancyId: string; title: string; reason: "draft_incomplete" }[]` —
  `draft_incomplete` when `publicationState === "draft" && ready === false`.
  Single reason code today (not a union with a second, unbuilt case) —
  adding `paused_with_open` is future work, tracked in Section 11, not a
  stub in this signature.
- Consumes: `EmployerDraftListItem` from
  `@/lib/employer/vacancies/load-employer-drafts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { selectAttentionVacancies } from "@/lib/employer/vacancies/select-attention-vacancies";
import type { EmployerDraftListItem } from "@/lib/employer/vacancies/load-employer-drafts";

function draft(overrides: Partial<EmployerDraftListItem>): EmployerDraftListItem {
  return {
    id: "v1",
    title: "Glasreiniger",
    jobCategory: "cleaning",
    publicLocality: "Mitte",
    employerType: "company",
    companyName: "Hauswerk Berlin",
    publicationState: "draft",
    expiresAt: null,
    isEffectivelyExpired: false,
    updatedAt: "2026-08-15T00:00:00Z",
    ready: false,
    checklist: [],
    ...overrides,
  };
}

describe("selectAttentionVacancies", () => {
  it("includes a not-ready draft as draft_incomplete", () => {
    const result = selectAttentionVacancies([draft({ id: "v1", ready: false })]);
    expect(result).toEqual([{ vacancyId: "v1", title: "Glasreiniger", reason: "draft_incomplete" }]);
  });

  it("excludes a ready draft and any non-draft vacancy", () => {
    const result = selectAttentionVacancies([
      draft({ id: "v1", ready: true }),
      draft({ id: "v2", publicationState: "published", ready: null }),
      draft({ id: "v3", publicationState: "paused", ready: null }),
    ]);
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/employer/vacancies/select-attention-vacancies.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `selectAttentionVacancies`**

```ts
import type { EmployerDraftListItem } from "@/lib/employer/vacancies/load-employer-drafts";

export function selectAttentionVacancies(drafts: EmployerDraftListItem[]) {
  return drafts
    .filter((d) => d.publicationState === "draft" && d.ready === false)
    .map((d) => ({ vacancyId: d.id, title: d.title, reason: "draft_incomplete" as const }));
}
```

- [ ] **Step 4: Run test to verify it passes; wire into `page.tsx`; commit**

```bash
npx vitest run src/lib/employer/vacancies/select-attention-vacancies.test.ts
git add src/lib/employer/vacancies/select-attention-vacancies.ts src/lib/employer/vacancies/select-attention-vacancies.test.ts src/app/employer/page.tsx
git commit -m "feat(employer-home): attention slot + draft-incomplete side card, no new queries"
```

Aggregate status totals are not computed anywhere in this file — their
removal is enforced by the fact that no such value is ever read from the
loaders in this task's scope.

### Task G: Vacancies list restyle (Live / Not live grouping)

Acceptance criteria: two groups (`published`/`paused` under "Live",
`draft`/`filled`/`expired`/`withdrawn` under "Not live" — confirm this
exact split against the design's "Live · 3" / "Not live · 3" example rows
at implementation time, since `paused` counted toward "Live" there);
lifecycle word + consequence sentence per row (Task B supplies `withdrawn`);
**no per-row application count (dropped per Founder Ruling #7 — do not
add one)**; existing `vacancy-list.test.tsx` assertions for row content
continue to pass, extended for the new grouping structure.

### Task H: Empty states

Acceptance criteria per state, "state, cause, one action" — no fake
urgency, no metrics:
- Restyle `VACANCY_EMPTY_LIST` and `APPLICATION_EMPTY_LIST` copy/markup to
  match the design's card treatment — text content unchanged unless a
  factual correction is needed.
- New: "Everything reviewed" (shown on the applications list when
  `needsReview.length === 0 && open.length > 0` — uses Task A's grouping
  output directly, zero new data).
- New: "No applications for this vacancy" (shown on a per-vacancy filtered
  applications view when the filtered result is empty — uses the existing
  `?vacancy=` filter, zero new data).
- New: "Verification not finished" and "This vacancy is a draft" — both
  copy-only compositions over already-loaded verification/readiness state;
  no new data.

### Task I: Responsive (360 / 390 / 430 / 768 / 1280 / 1440)

Acceptance criteria: sidebar collapses to a top bar + menu below 768,
icon-only 768–1279, full labelled sidebar at 1280+ (matches the existing
`$breakpoint-md`/`$breakpoint-xl` tokens exactly — no new breakpoint
value); vacancy rows and application rows become stacked cards below 768,
showing only the two most load-bearing facts with the rest behind the card
(exact fact selection decided at implementation time); status-action
buttons (Task C) become full-width stacked at 48px min-height below 768,
ordinary-first/terminal-last with a divider; terminal confirmation dialogs
become a bottom sheet below 768 rather than a centered dialog; no text
truncation via ellipsis anywhere in employer surfaces — wrap instead,
matching the design's explicit "long German titles wrap rather than
truncate" rule. No table scrolls sideways at any width.

### Task J: German-requirement control (real 4-value domain, per Founder Ruling #1)

**Files:**
- Create: `src/components/employer-vacancies/german-requirement-field.tsx`
- Test: `german-requirement-field.test.tsx`
- Modify: `src/lib/employer/vacancies/schemas.ts` (add `germanRequirement`
  to `createDraftVacancyFormSchema`/`updateDraftVacancyFormSchema`)
- Modify: `src/app/employer/vacancies/actions.ts` (pass the form's
  `germanRequirement` through to the existing `p_german_requirement` RPC
  parameter — first real caller, parameter itself is unchanged)
- Modify: `src/components/employer-vacancies/vacancy-draft-form.tsx` (render
  the new field)

**Interfaces:**
- Produces: `GermanRequirementField({ value: GermanRequirement, onChange:
  (value: GermanRequirement) => void, name: string })` — a `role="radiogroup"`
  of exactly 4 options, labelled with the existing
  `GERMAN_REQUIREMENT_LABELS` copy (`none → "No German required"`, plus
  `basic`/`conversational`/`comfortable`), in that fixed order. Never
  renders a 5th, 6th, or 7th option; never renders a CEFR label.
- Consumes: `GermanRequirement` (the real union type backing
  `vacancies.german_requirement`'s CHECK constraint —
  `"none" | "basic" | "conversational" | "comfortable"`),
  `GERMAN_REQUIREMENT_LABELS` from `@/lib/matching/labels`.
- Zod: `germanRequirementSchema = z.enum(["none", "basic", "conversational",
  "comfortable"])`, added as a required field (default `"none"`, matching
  the RPC's own default) on both draft form schemas.

- [ ] **Step 1: Write the failing test for `GermanRequirementField`**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GermanRequirementField } from "@/components/employer-vacancies/german-requirement-field";

describe("GermanRequirementField", () => {
  it("renders exactly the 4 real values, never a CEFR label", () => {
    render(<GermanRequirementField value="none" onChange={vi.fn()} name="germanRequirement" />);
    expect(screen.getByRole("radio", { name: "No German required" })).toBeChecked();
    expect(screen.getByRole("radio", { name: /basic/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /conversational/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /comfortable/i })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.queryByText(/A1|A2|B1|B2|C1|C2/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/employer-vacancies/german-requirement-field.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `GermanRequirementField`** as a `radiogroup` of 4
  labelled radio inputs sourced from
  `Object.entries(GERMAN_REQUIREMENT_LABELS)` (never a hand-written list,
  so the component structurally cannot drift from the real label source).

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Extend `schemas.ts` and `actions.ts`.** Write a failing
  test asserting `createDraftVacancyFormSchema.parse({ ...validInput,
  germanRequirement: "comfortable" })` succeeds and
  `germanRequirement: "b1"` fails (proves the schema rejects CEFR values),
  then implement.

- [ ] **Step 6: Wire into `VacancyDraftForm`, run the existing form test
  suite, then commit**

```bash
npx vitest run src/components/employer-vacancies src/lib/employer/vacancies
git add src/components/employer-vacancies/german-requirement-field.tsx src/components/employer-vacancies/german-requirement-field.test.tsx src/lib/employer/vacancies/schemas.ts src/app/employer/vacancies/actions.ts src/components/employer-vacancies/vacancy-draft-form.tsx
git commit -m "feat(employer-vacancies): add German-requirement control on the real 4-value domain"
```

### Task K: Vacancy create/edit — visual section grouping (single page, per Founder Ruling #2)

**Files:**
- Modify: `src/components/employer-vacancies/vacancy-draft-form.tsx`,
  `vacancy-draft-form.module.scss` (or equivalent existing stylesheet)
- Modify: `src/components/employer-vacancies/readiness-checklist.tsx` /
  its detail-page container (stronger visual emphasis only)

**Acceptance criteria:** the existing 3 fieldsets (Basics, Role details,
Salary) plus the German-requirement field from Task J gain clear visual
section headings and an orientation aid (e.g. a sticky in-page index
linking to each section's heading) **within the same single page** —
no new route, no new step, no `<form>` split into multiple submits, no
change to field order or validation. `LanguageRequirementsEditor` remains
exactly where and how it renders today (on the detail/manage page, after a
vacancy exists) — it is not pulled into the create form. The
detail/manage page's existing `ReadinessChecklist` and `Publish` button
gain stronger visual treatment (matching the design's "review and publish"
emphasis) without becoming a new page or step. Every existing
`vacancy-draft-form.test.tsx` assertion about field presence, order, and
validation continues to pass unmodified — this task changes markup/CSS
structure around the fields, never the fields, their order, or their
validation.

---

## 7. Responsive validation

Required widths: **360, 390, 430, 768, 1280, 1440** — identical set and
token system to P1/P2 (`$breakpoint-sm=480, $breakpoint-md=768,
$breakpoint-lg=1024, $breakpoint-xl=1280`). Employer surfaces currently have
minimal responsive treatment (`employer-vacancies.module.scss` and
`employer-onboarding.module.scss` each have exactly one `@media` block
today) — this is genuinely new SCSS work, not a restyle of an existing
responsive system, unlike most of P2's candidate-side responsive work which
extended patterns P1 had already established. Validate mobile widths first
at implementation time; the highest-risk regressions are the applications
list's three-group headers not overflowing at 360, and the vacancy detail
page's 15-item readiness checklist remaining scannable (not requiring
horizontal scroll) at 360.

## 8. Accessibility

- **Heading hierarchy** — every restyled page keeps exactly one `<h1>`;
  verify per-page nesting, not assumed, same discipline as P1/P2.
- **Focus** — every new interactive element (status-action buttons,
  confirm-dialog buttons, empty-state CTAs) has a visible `:focus-visible`
  state using existing tokens.
- **Keyboard** — status-action buttons and the confirm dialog must be fully
  keyboard-operable; the dialog must trap focus and return focus to the
  triggering button on cancel, matching standard dialog semantics (no
  existing employer dialog component to copy from — this is new, verify
  against WAI-ARIA dialog pattern at implementation time).
- **Status semantics** — never convey unseen/needs-review, or lifecycle
  state, by color alone; pair every colored indicator with literal text
  (the oxblood unseen pill, the lifecycle word per vacancy row).
- **Confirmation dialogs** — must be announced to screen readers on open
  (`role="alertdialog"` or `role="dialog"` with an accessible name tied to
  the heading, e.g. "Accept this application?").
- **Contrast** — check every new text-on-surface pairing against its real
  background token before shipping, particularly the readiness-card warm-
  neutral treatment and the oxblood unseen pill on both light backgrounds.
- **Reduced motion** — any new transition (bottom-sheet slide-in, dialog
  fade) must respect `prefers-reduced-motion` per the existing global rule.
- **Screen-reader names** — status-action button icons (if any) must be
  `aria-hidden` with adjacent real text, never the sole signal.
- **German-requirement radio group (Task J)** — a real `role="radiogroup"`
  with an accessible group name (e.g. via `aria-labelledby` pointing at the
  field's own label, "Minimum German level"), each option a native radio
  input with its own associated `<label>`, keyboard-operable via arrow keys
  (native radio-group behavior, not simulated).

## 9. Testing

```bash
npm run lint
npm run format:check
npx tsc --noEmit
npx vitest run
npx playwright test   # employer-specific specs to update/add, confirmed
                       # to exist today: e2e/employer-applicant-review-journey.spec.ts,
                       # e2e/employer-application-outcome-ui-journey.spec.ts,
                       # e2e/helpers/employer-application-fixture.ts,
                       # e2e/application-outcome-events-journey.spec.ts,
                       # e2e/admin-moderation.spec.ts
                       # cross-check against candidate-facing e2e that
                       # depends on employer actions:
                       # e2e/candidate-application-status-journey.spec.ts
npm run build
```

**Unit/component tests confirmed to exist and need updating for the
dropdown → discrete-buttons change (Task C):**
`application-list.test.tsx`, `application-list-filters.test.tsx`,
`application-detail.test.tsx`, `application-transition-form.test.tsx`
(likely superseded by `application-status-actions.test.tsx`, decide at
implementation time whether to delete or keep as a regression guard on the
underlying action), `application-status-history.test.tsx`,
`vacancy-list.test.tsx` (for withdrawn + grouping), `application-outcome-history.test.tsx`
(regression-only — outcome section is unchanged by this plan).

**New tests required (beyond what's inline in Section 6's tasks):** the two
additive RPC-projection changes each need their own migration test
confirming the new field appears in the RPC's return shape without changing
any existing returned field, plus a full rerun of every existing test that
calls either RPC, per the SQL-reconstruction-risk discipline in Global
Constraints. `vacancy-draft-form.test.tsx` needs a new case confirming the
German-requirement field defaults to `"none"` and rejects any non-real
value; existing cases must keep passing unmodified (Task J adds a field, it
does not touch existing ones).

## 10. Product decisions — RESOLVED (Founder rulings applied 2026-08-18)

All three original PRODUCT DECISION REQUIRED items and both query/data
flags are now resolved. Kept as a numbered list, unchanged numbering from
the original discovery pass, so every earlier cross-reference in this
document still resolves to the right item — each entry now states the
ruling that settled it instead of the open options.

1. **German-requirement control — RESOLVED (Founder Ruling #1): real
   4-value domain only, never CEFR.** The design proposed a 7-value CEFR
   scale; the real field is `none/basic/conversational/comfortable`,
   already used identically by matching and candidate onboarding, with no
   employer-facing control today. Built in Task J: a radio/segmented
   control using the design's visual treatment, the real 4 values, the
   existing `GERMAN_REQUIREMENT_LABELS` copy, wired to the existing
   `p_german_requirement` RPC parameter. No schema change.
2. **Vacancy create/edit section grouping + review step — RESOLVED
   (Founder Ruling #2): single-page architecture preserved, no new
   workflow.** The design's four-named-sections-plus-separate-review-step
   is not built. Built in Task K instead: the real single-page 3-fieldset
   form (plus Task J's field) gains visual section headings and an
   orientation aid within that one page; the decoupled
   `LanguageRequirementsEditor` stays exactly where it is; the existing
   detail/manage page's `ReadinessChecklist` gets stronger visual emphasis
   rather than being replaced by a new review page. No new route, step, or
   form state.
3. **"CV | Attached" field — RESOLVED (Founder Ruling #3): removed
   entirely.** Confirmed fabricated — no CV/resume field or feature exists
   anywhere in the product. Not built. No task in Section 6 adds it.
4. **`employer_seen_at` added to `get_current_employer_application`'s
   projection — RESOLVED (Founder Ruling #6): kept.** Satisfies the
   Founder's three-part test (existing UI can't show per-application
   unseen state without it; no new semantics; strictly plumbing for the
   already-shipped N4 feature) — full justification and exact RPC/file
   citations in "Query/data rulings" above. Additive `SELECT` change only.
5. **`employer_seen_at` added to `list_current_employer_applications`'s
   projection — RESOLVED (Founder Ruling #6): kept.** Same test, same
   justification, same column — see "Query/data rulings" above.
6. **New grouped-`COUNT` query for per-vacancy application counts —
   RESOLVED (Founder Ruling #7): deferred, not built.** No new query is
   added solely to power P3 presentation. The home mini-list, the
   vacancies list rows, and the home side card's application-count figures
   are dropped from scope; the UI is simplified rather than gaining new
   query scope (see "Query/data rulings" above and Section 11).
7. **Employer navigation reconciliation — RESOLVED (Founder Ruling #4):
   ship the real nav.** The design's "Home, Vacancies, Applications,
   Account" classification is rejected as factually wrong. Real nav
   (Home/Vacancies/Applications/Verification) ships unchanged; no Account
   nav item is added.

---

## 11. Deferred / non-P3 work

- Any change to employer IA, onboarding logic, verification rules, vacancy
  schema, vacancy lifecycle values/transitions, publish-readiness logic,
  the application state machine, allowed transitions, or
  unseen/read semantics.
- A notification center; realtime/global notifications.
- Any change to the matching RPC/schema, or introduction of positive
  candidate match-reason data (mirrors P2 Founder Ruling #1 for the
  employer side).
- Any change to Auth, transactional-email behavior, Production
  configuration, or anything touching Unit H/Sentry.
- A CV/resume upload feature (Founder Ruling #3 removes the design's
  fabricated field entirely; no real CV feature is proposed or built).
- A new grouped-`COUNT` query for per-vacancy application counts, and
  everything that would have consumed it: application-count figures on the
  home mini-list, the vacancies list rows, and the home side card's
  "N open applications" copy — deferred per Founder Ruling #7. If wanted
  later, revisit as its own small unit (a single grouped `COUNT(*) ...
  GROUP BY vacancy_id` query, no fan-out).
- The home "needs your action" side card's paused-with-open-applications
  reason — deferred alongside the count query above (Founder Ruling #7);
  P3 ships only the draft-with-missing-fields reason.
- Broadening employer access to candidate PII beyond the confirmed existing
  projection (no locality, no new fields).
- Deep-dive restyle plans for `/employer/onboarding` and
  `/employer/verification` beyond the copy-only correction noted in Section
  1 — not independently researched to the same depth as the other surfaces
  in this pass; a follow-up discovery note if the Founder wants them
  included in P3 proper rather than a later unit.
- Any new persistent "seen"/"unread" state beyond the existing
  `employer_seen_at` column (the two additive projection changes expose it
  more places; they do not add a new signal).
