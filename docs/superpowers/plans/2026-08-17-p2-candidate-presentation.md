# P2 Candidate Presentation Polish — Discovery + Implementation Plan

> **Status: APPROVED IN PRINCIPLE, amended per Founder rulings (2026-08-17).**
> All nine Product Decision Required items have been resolved by the Founder
> — see "Founder Rulings (applied)" immediately below. This document is now
> the binding scope for implementation. The original discovery-only
> classifications are preserved throughout (struck through where superseded)
> so the reasoning trail stays visible; every task in Section 6 reflects the
> rulings, not the original unresolved options.

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. Scope is now fixed by the Founder
> Rulings section below — do not implement anything the rulings explicitly
> deferred, omitted, or ruled out (positive match reasons, candidate-home
> restructuring, a Home nav item, "Saved automatically" wording, the
> employer-visibility sentence, operational/support-timing promises on
> accepted applications, or the per-application history-summary N+1 fetch).

## Founder Rulings (applied 2026-08-17)

The Founder reviewed the discovery plan and returned "APPROVED IN PRINCIPLE"
subject to these nine rulings. Each resolves the correspondingly numbered
"Product Decision Required" item from the original discovery pass (see
Section 2 for where each was first raised, now marked RESOLVED with a
cross-reference back here).

1. **Positive match reasons — DEFER.** Do not change matching RPCs/schema, do
   not revive the dormant TypeScript matcher, do not add a "Why this fits
   you" block to any live candidate route in this unit. Use only current
   real vacancy facts and the existing eligibility/missing-requirement data.
2. **Candidate home / IA — PRESERVE CURRENT ROUTING.** `/candidate` does
   **not** become a persistent post-onboarding dashboard in P2. No "Home" nav
   item is added. No routing/IA behavior changes. Incomplete candidates
   continue through `/candidate/onboarding`; completed candidates continue
   to redirect to `/candidate/matches`, exactly as today. P2 polishes the
   existing real routes; it does not create a new home architecture.
3. **"Saved automatically" — DO NOT USE.** Visual selected/current/completed
   feedback only. Never imply server persistence ahead of the existing
   save-then-redirect action actually completing.
4. **Employer visibility claim — OMIT.** Delete "Employers see this when you
   apply, never before" entirely. No scope is spent verifying or
   implementing it.
5. **Accepted-application operational copy — NEUTRAL ONLY.** No
   timing/support promises ("employer will contact you within X days",
   "contact Klinnova after one week"). Accepted must read as explicitly
   distinct from hired/employment-started/contract-signed, using only
   already-established product truth (accepted ≠ hired; `hired` is a
   separate outcome event, never a status).
6. **Application list timestamps — DO NOT implement the history-summary N+1
   fetch.** Task E (and the "Updated X ago" requirement it fed into Task I)
   is deleted from scope. The applications inventory list uses only
   `submitted_at`, already in its existing data contract. The real
   per-status history/timestamps remain exactly where they already work
   today — the application **detail** page — and that presentation is
   polished there, not duplicated onto the list.
7. **Application grouping — APPROVED as designed.** Active = submitted /
   reviewing / shortlisted. Closed = accepted / rejected. No withdrawn
   status or group.
8. **Candidate display label — APPROVED as designed.** Canonical `rejected`
   may display as "Not selected" on the candidate surface only. The
   canonical enum/value and the employer/internal label function are
   untouched.
9. **Shared vacancy fact chips — APPROVED as designed.** A small shared
   presentational fact-chip primitive is acceptable. No universal job-card
   abstraction.

**Goal:** Restyle and reorganize the presentation of the existing candidate
product (`/candidate`, `/candidate/onboarding`, `/candidate/matches`,
`/candidate/jobs/[vacancyId]`, `/candidate/applications`) so each screen
answers "what should I do next" clearly, using only data the product already
computes — without changing matching logic, onboarding rules, the
application state machine, or navigation structure beyond what research
proves is a genuine, narrowly-scoped, Founder-approved exception.

**Architecture:** No new routes. No new database tables/columns/RPCs unless a
specific item below is explicitly authorized by the Founder as an exception
(none are proposed as required — every task in this plan's "Tasks" section
works from data already returned by existing loaders/RPCs). Where an existing
pure function or RPC needs to be called more than once per page render (e.g.
per-vacancy or per-application), that is a same-page application-layer
composition, not a new persisted capability, and is called out explicitly per
task with its performance trade-off named.

**Tech Stack:** Next.js App Router (Server Components + Server Actions
already in place), React, TypeScript (strict, no `any`), SCSS Modules using
`src/styles/tokens.css` / `src/styles/breakpoints.scss` (identical token
system to P1 — already verified byte-for-byte reused, no new custom
properties needed), Vitest + Testing Library, Playwright.

**Spec:** The in-conversation "P2 Candidate Presentation Polish" brief
(Founder-approved rulings + design direction), reconciled against the
decoded design reference `/Users/olaniyiaborisade/Downloads/Klinnova
Candidate Polish.html` (a copy of the decoded HTML is saved at
`/private/tmp/claude-501/-Users-olaniyiaborisade-Codes-stint/f9882706-9e82-4e52-8285-93c4b4a193d9/scratchpad/p2-design.html`
for reference — not part of the repo).

## Global Constraints

- Base SHA: `7d46d23b40481796cd7fa97a595bebdd42c9814b` (verified: exact tip of
  `origin/main`, the P1 merge commit). Branch:
  `feat/p2-candidate-presentation`, created from that base.
- Canonical application statuses are exactly `submitted | reviewing |
  shortlisted | accepted | rejected`. No `withdrawn` status. Accepted ≠
  hired. `hired` exists only as a separate **outcome event type**
  (`OUTCOME_TYPE_CODES = ["interview_completed", "hired"]` in
  `src/lib/applications/outcome-type.ts`), never as an application status.
- No new "last-seen"/"unread" persistent state anywhere. Any "new X" count
  claim must either use a value that already exists with zero new
  persistence (e.g. a live total from an existing query), or be replaced
  with truthful non-counting copy ("View your matches").
- Positive match reasons are **deferred** per Founder Ruling #1 — no task in
  this plan adds a "Why this fits you" block anywhere. If a future unit
  revisits this, the match-reason vocabulary is exactly the 7
  `MatchReasonCode`s in `@/lib/matching/types` — never invent a new reason
  code, never add "work permission" as a reason (it does not exist in that
  union) — noted here only so the constraint survives into whatever unit
  eventually does that work.
- `/candidate` routing is **unchanged** per Founder Ruling #2 — no task in
  this plan touches `resolveCandidateHomeView`'s redirect behavior, adds a
  "Home" nav item, or builds a post-onboarding dashboard.
- No percentages, scores, AI ratings, hire-probability figures, or invented
  commute-time estimates anywhere.
- Salary/pay is never shown on candidate-facing vacancy cards — `PublicVacancy`
  (the type every candidate-facing vacancy surface uses) has no salary
  field, confirmed identical finding to P1.
- No district/neighbourhood value is shown anywhere it isn't real:
  `PublicVacancy.publicLocality` is real (matches/jobs, live data); the
  frozen `vacancy_snapshot` on an `applications` row only ever has
  `city: "Berlin"` (a literal), never a district — confirmed by
  `src/lib/applications/snapshot-schemas.ts`. Applications-surface cards
  must not show a district.
- No new CSS custom properties — every value must resolve to an existing
  token in `src/styles/tokens.css` or breakpoint in
  `src/styles/breakpoints.scss`.
- STOP BEFORE IMPLEMENTATION. This plan, once written, is committed and
  pushed on its own — no product code changes occur in this unit.

---

## 1. Current-state map

### `/candidate` (`src/app/candidate/page.tsx`, `resolve-candidate-home.ts`, `page.module.scss`, `page.test.tsx`)

- **Current files:** `page.tsx` (39 lines), `resolve-candidate-home.ts` (pure
  routing helper), `page.module.scss`, `page.test.tsx`.
- **Current data source:** `loadCandidateOnboarding` (profile + languages +
  computed `OnboardingProgress`) via `@/lib/onboarding/load-candidate`.
- **Current behavior — the single most important structural finding of this
  research:** `resolveCandidateHomeView` **redirects to `/candidate/matches`
  the moment `onboardingCompletedAt !== null`.** `/candidate` today only ever
  renders content for the *incomplete-onboarding* state — a heading, one
  paragraph, an "X of Y sections saved" line, and one CTA link. There is no
  "profile complete" home state today; the destination for a completed
  candidate is a different route entirely.
- **Presentation weakness:** the incomplete-state page is plain prose with no
  visual hierarchy, no progress bar, no destination shortcuts.
- **Proposed presentation change — RESOLVED by Founder Ruling #2 (preserve
  current routing):** the Design's "complete, applications live" home state
  is **not built** — a completed candidate never sees `/candidate` render
  content at all, exactly as today. Only the *incomplete-onboarding* state
  (the only state this page ever renders) is polished: real progress bar,
  clearer heading/CTA hierarchy, same redirect-to-matches behavior on
  completion, same "X of Y sections saved" fact, no new destination cards,
  no applications preview, no avatar, no nav changes.

### `/candidate/onboarding` (`src/app/candidate/onboarding/page.tsx`, `src/components/onboarding/**`)

- **Current files:** `page.tsx`; six group form components
  (`languages-group-form.tsx`, `work-authorisation-group-form.tsx`,
  `location-group-form.tsx`, `categories-group-form.tsx`,
  `availability-group-form.tsx`, `employment-group-form.tsx`);
  `onboarding-progress.tsx` (`OnboardingProgressNav`); `onboarding-review.tsx`
  (`OnboardingReview`); `group-nav.tsx`; `onboarding.module.scss`;
  `src/app/candidate/onboarding/actions.ts` (6 save actions +
  `completeOnboardingAction`).
- **Current data source:** `loadCandidateOnboarding` (same as home);
  `computeOnboardingProgress` from `src/lib/onboarding/progress.ts`; 6 groups
  from `ONBOARDING_GROUPS`/`ONBOARDING_GROUP_LABELS` in
  `src/lib/onboarding/allow-lists.ts`.
- **Presentation weakness:** `OnboardingProgressNav` already renders a
  vertical numbered list with complete/current/upcoming states (real data,
  functional) but no horizontal rail. `OnboardingReview` never shows the
  candidate's actual saved *values* — only group names as links when
  incomplete, or a generic confirmation paragraph when complete. There is no
  "review table" of saved answers anywhere today. Every save action
  `redirect()`s to the next group immediately on success — there is no
  in-page pause where a "saved" confirmation could be observed;
  `OnboardingActionState.message` exists in the type but is **never set to a
  non-null value or rendered anywhere** — dead code today.
- **Proposed presentation change:** restyle `OnboardingProgressNav` into a
  horizontal dot/segment rail (same data); build a new `OnboardingReviewTable`
  presentational component showing real saved values per group with "Edit"
  links (new component, existing data — with corrections vs. the Design
  artifact: all 6 groups, no fabricated district, and the employer-visibility
  sentence omitted entirely per Founder Ruling #4); restyle each group
  form's options to ≥48px selectable rows with a visual selected/current cue
  only — never "Saved automatically" wording, per Founder Ruling #3.

### `/candidate/matches` (`src/app/candidate/matches/page.tsx`, `resolve-matches-view.ts`, `src/components/candidate-matches/**`)

- **Current files:** `page.tsx`; `resolve-matches-view.ts`;
  `candidate-matches-page.tsx`; `match-list.tsx`; `match-card.tsx`;
  `match-count.tsx`; `match-reasons.tsx` (defined, unused in production —
  see below); `matches-empty-state.tsx`; `matches-error-state.tsx`;
  `work-authorisation-notice.tsx`; `candidate-matches.module.scss`.
- **Current data source:** `loadCurrentCandidateMatches` →
  Supabase RPC `list_current_candidate_vacancy_matches()` → returns
  `PublicVacancy[]` (the exact same type P1's public homepage/`/jobs` use —
  **no employment type, no shift, no German requirement, no salary, no match
  reason fields**). The RPC's own migration comment states eligibility is
  pre-filtered server-side in SQL: *"Returns only currently effective-public
  vacancies the candidate is eligible for... eligible/missing_requirements
  are included for contract completeness (always eligible=true,
  missing_requirements={} for included rows)."* There is no "soft match with
  one limitation" tier — a vacancy is either in this list (fully eligible) or
  not in it at all.
- **Presentation weakness:** cards show category/locality/workplace/frequency
  chips only. No "why this fits you" block is rendered anywhere on this page
  today, despite `MatchReasons`/`MatchReason`/`presentMatchReasons` existing
  in the codebase as tested, working code — **confirmed via full-repo grep:
  the only production caller of `presentMatchReasons` is P1's
  `public-hero.tsx` (illustrative, synthetic data). The candidate matches
  page has never rendered it.** `candidate-matches.module.scss` already
  contains unused `.reasonsHeading`/`.reasons`/`.reason` CSS classes —
  scaffolding left over from an earlier plan, never activated.
- **Proposed presentation change:** the reason block is **deferred in full
  per Founder Ruling #1** — not added anywhere in this unit. Card-family
  unification with `/jobs`/`PublicJobCard` (title, employer, district,
  verified badge, fixed chip order) is implementable independently and is
  the only presentation change this route gets (Task F).

### `/candidate/jobs/[vacancyId]` (`src/app/candidate/jobs/[vacancyId]/page.tsx`, `resolve-job-detail-view.ts`, `src/components/candidate-job-detail/**`)

- **Current files:** `page.tsx`; `resolve-job-detail-view.ts`;
  `candidate-job-detail-page.tsx`; `application-preview-section.tsx`;
  `application-submit-form.tsx`; `job-detail-unavailable.tsx`;
  `missing-requirements-list.tsx`; `candidate-job-detail.module.scss`.
- **Current data source:** `loadCurrentCandidateVacancyDetail` →
  Supabase RPC `resolve_current_candidate_vacancy_match(p_vacancy_id)` →
  returns `{ status, eligible: boolean, missing_requirements: text[] }`,
  joined with `get_effective_public_vacancy`/`get_effective_public_vacancy_languages`
  for display content. **Confirmed: this RPC's contract (defined in
  `supabase/migrations/20260806000000_candidate_eligibility_contract.sql`)
  never returns positive match reasons — only a boolean and an array of
  negative "missing requirement" codes.** There is a *separate*,
  fully-dormant TypeScript matcher path (`resolveCandidateVacancyMatch` in
  `src/lib/matching/resolve-candidate-vacancy-match.ts`, calling
  `matchCandidateToVacancy`/`buildMatchReasons`) that reads raw
  `vacancies`/`candidate_profiles`/`candidate_languages` tables directly and
  *does* compute a real `MatchReason[]` — **confirmed via grep: this path has
  zero production callers, only its own tests.** It bypasses the
  "effective public vacancy" RPC contract that the live loader deliberately
  uses instead (per that file's own doc comment: *"No direct table read, no
  TypeScript matcher"*).
- **Presentation weakness:** when eligible, the page shows the apply form
  with no positive explanation of *why* the candidate is eligible. When
  ineligible, `MissingRequirementsList` already renders the 6
  `MissingRequirementCode`s with candidate-safe labels (`category`,
  `employment_type`, `shift`, `german`, `language`, `availability`) — this
  part is real and already live.
  `WorkAuthorisationNotice`/`WORK_AUTHORISATION_NOTICE` copy is also already
  real and rendered.
- **Proposed presentation change:** card-family unification (shared spine)
  is implementable now. The ineligible-state "limitation" block can be
  restyled (softer visual language, matching the Design's "neutral grey
  circle, never a red warning") using the exact existing
  `MissingRequirementCode` data — no new data needed. The eligible-state
  positive reason block is **deferred per Founder Ruling #1** — not built in
  this unit.

### `/candidate/applications` (`src/app/candidate/applications/page.tsx`, `resolve-inventory-view.ts`, `src/components/candidate-applications/**`)

- **Current files:** `page.tsx`; `resolve-inventory-view.ts`;
  `application-inventory-list.tsx`; `application-inventory-card.tsx`;
  `applications-empty-state.tsx`; `applications-error-state.tsx`;
  `candidate-applications-page-header.tsx`.
- **Current data source:** `loadCandidateApplicationInventory` → direct
  `applications` table read (RLS-scoped, `candidate_id = auth.uid()`) →
  `{ id, vacancy_id, status, submitted_at, snapshot_version,
  vacancy_snapshot }[]`, ordered `submitted_at desc, id asc`. **No
  `updated_at`/"last status change" field is selected in this query.**
- **Presentation weakness:** flat list, no active/closed grouping, no
  process-rail visualization, plain status label only
  (`applicationStatusLabel`, the same function shared with the employer
  surface).
- **Proposed presentation change:** derive active/closed grouping from the
  existing `status` field (zero new queries, Founder Ruling #7). Add a
  4-node process rail using the canonical status order. **"Updated X ago" is
  not implemented per Founder Ruling #6** — the list continues to show only
  `submitted_at`, already in its existing data contract; no per-application
  history fan-out is added. The real per-status timestamps stay exactly
  where they already work: the application detail page.

### `/candidate/applications/[applicationId]` (`src/app/candidate/applications/[applicationId]/page.tsx`, `resolve-confirmation-view.ts`, `src/components/candidate-application-confirmation/**`)

- **Current files:** `page.tsx`; `resolve-confirmation-view.ts`;
  `application-confirmation-page.tsx`; `application-status-timeline.tsx`;
  `application-outcome-timeline.tsx`; `application-confirmation.module.scss`.
- **Current data source:** `loadCandidateApplicationConfirmation` (snapshot +
  status) + **`loadCandidateApplicationHistory`, which already returns a
  full array of `{ to_status, occurred_at }` — one real timestamp per status
  transition** (via RPC `list_current_candidate_application_status_history`,
  candidate-safe, scoped to the caller's own application) + separately
  `loadCandidateApplicationOutcomes` → `{ outcome_type: "interview_completed"
  | "hired", occurred_at }[]` (a genuinely distinct real-world-event
  timeline, not conflated with `status`).
- **Presentation weakness:** `ApplicationStatusTimeline` and
  `ApplicationOutcomeTimeline` already render this exact data today, as
  plain vertical lists (status label + formatted date, one row per entry) —
  functionally equivalent to the Design's dot-rail timeline, just styled
  differently.
- **Proposed presentation change:** **this is the one candidate surface
  where the Design's dated-timeline concept is already 100% real, live data
  today** — restyle only, matching Founder Ruling #2's "if existing history
  supports the Design direction, reuse it." Per-status timestamps do not
  need a Product Decision — the design artifact's own "Product decision
  required: per-status timestamps" item is **already resolved** by this
  research: the data exists.

### Candidate navigation (`src/components/candidate-nav/**`)

- **Current files:** `candidate-app-header.tsx` (`CandidateAppHeader`),
  `candidate-nav.tsx` (`CandidateNav`), `candidate-nav.module.scss`.
- **Current real destinations:** `CandidateNav` exposes exactly **Matches,
  Applications, Profile (→ onboarding review), Account** — four items. There
  is no distinct "Home" nav item (the brand wordmark links to `/candidate`,
  which is not a nav *item* with a label) and no "Jobs" nav item (browsing
  all Berlin jobs happens on the public `/jobs` route, not a
  candidate-namespaced one).
- **Presentation weakness:** none identified — this is a working, tested,
  accessible nav component (`aria-current`, single shared header across
  every authenticated candidate page per its own doc comment).
- **Proposed presentation change: none.** The Design assumed a 4-tab
  "Home / Jobs / Applications / Profile" IA that does not literally match
  today's "Matches / Applications / Profile / Account," and its own handoff
  section incorrectly classified navigation as "KEEP, already right"
  without having verified the real labels — surfaced to the Founder as
  exactly the kind of IA discrepancy the brief requires flagging rather than
  silently redesigning. Resolved by Founder Ruling #2: `CandidateNav` is
  unchanged, real labels stay Matches/Applications/Profile/Account.

---

## 2. Design reconciliation

Every meaningful visual element from the Design artifact, classified.

### 01 · Candidate home

| Design element | Classification | Notes |
|---|---|---|
| "Hello, {name}" / "Berlin" | IMPLEMENTABLE AS-IS | `displayName` real; city is always `"Berlin"` (real constant). Kept — appears on the one real home state (incomplete onboarding) already. |
| Next-action card, incomplete state ("Add your availability" / "Continue") | IMPLEMENTABLE WITH EXISTING DATA | `progress.firstIncompleteGroup` + `ONBOARDING_GROUP_LABELS` + `continueHref` already computed in `page.tsx`. This is the **only** next-action-card state built in P2. |
| Next-action card, complete state ("4 new matches for you" / "See matches") | **RESOLVED — OUT OF SCOPE (Founder Ruling #2)** | Moot: `/candidate` never renders content once onboarding is complete (redirect preserved), so this state is never built, independent of the last-seen-timestamp question that would otherwise have applied to it. |
| Profile progress card (bar + real chips + dashed "Availability missing" chip) | IMPLEMENTABLE WITH EXISTING DATA | Kept, but only on the incomplete-onboarding state. `completeCount`/`totalGroups` real; per-group chip values reuse Task A's review-value helpers; "missing" chip derives from `incompleteGroups`. |
| Three destination rows (Matches / Browse jobs / Applications) with real substate text | **RESOLVED — OUT OF SCOPE (Founder Ruling #2)** | These rows exist only in the Design's complete-state mockup, which is not built. |
| Applications preview card (2 most recent + status chips), complete-home variant | **RESOLVED — OUT OF SCOPE (Founder Ruling #2)** | Same reason. |
| Avatar initials circle ("AK") | **RESOLVED — OUT OF SCOPE (Founder Ruling #2)** | No header/nav changes in P2; the avatar was only ever paired with the complete-state layout in the Design. |
| Bottom tab bar (mobile) / top nav (desktop): **Home / Jobs / Applications / Profile** | **RESOLVED — OUT OF SCOPE (Founder Ruling #2)** | No "Home" nav item is added; `CandidateNav` stays exactly Matches/Applications/Profile/Account. |

### 02 · Onboarding and review

| Design element | Classification | Notes |
|---|---|---|
| Progress rail (horizontal, current step highlighted, number secondary) | IMPLEMENTABLE AS-IS (RESTYLE) | Same data as today's `OnboardingProgressNav`. |
| Option rows ≥48px, border+fill+check selection, no color-only signal | IMPLEMENTABLE AS-IS (RESTYLE) | Same radio/checkbox data across all 6 group forms. |
| "Saved automatically" appearing after first change, not on load, never a toast | **RESOLVED — DO NOT USE (Founder Ruling #3)** | No "Saved"/persistence-implying copy anywhere. Implement as a purely visual selected/current-state cue on the option itself (border + fill + check, already required by the row above) — no accompanying text claiming a save occurred. |
| Review = table of saved answers, each with an inline "Edit" link | IMPLEMENTABLE WITH EXISTING DATA | All 6 groups' values are already loaded (`profile`, `languages`) — new component, see Task A. |
| Review table shows only 5 of 6 groups (German level, Work permission, Location, Interests, Availability — **Employment types/shifts is missing**) | **DESIGN CORRECTION REQUIRED** | Not a Founder decision — a factual omission. `ONBOARDING_GROUPS` has 6 entries; the review table shows all 6. |
| Review row "Location: Wedding, Berlin" | **VISUAL SUBSTITUTE REQUIRED** | The `location` group only ever captures `city` (always `"Berlin"`) and `travelRadiusMinutes` (one of 15/30/45/60). No district field exists anywhere in the schema. Real substitute: `"Berlin · up to {N} minutes travel"`. |
| Review row "Interests: Cleaning, kitchen, logistics" | VISUAL SUBSTITUTE REQUIRED (copy only) | Illustrative Design text uses a non-real category label. Use only real `JOB_CATEGORY_OPTIONS` labels. |
| "Employers see this when you apply, never before" | **RESOLVED — OMITTED (Founder Ruling #4)** | Deleted from the review table entirely. No verification work performed or required. |

### 03 · Matches and jobs (card family)

| Design element | Classification | Notes |
|---|---|---|
| Shared spine: title, employer, verified badge | IMPLEMENTABLE AS-IS | Real on all three surfaces already (P1 confirmed `source === "employer"` truthfully implies verification, since publish-readiness gates on it). |
| District in the chip row ("Mitte") | IMPLEMENTABLE AS-IS on matches/jobs (`PublicVacancy.publicLocality`, real, live) | **OUT OF SCOPE / not shown** on applications-surface cards (snapshot has no district, see Current-State Map). |
| Fact chip: language requirement | IMPLEMENTABLE AS-IS | Real (`languages`/`language_requirements`, existing label helpers). |
| Fact chip: "work pattern" (e.g. "Part time, mornings") | **OUT OF SCOPE** | `PublicVacancy` has no employment-type/shift field (confirmed identical finding to P1's homepage research). Substitute with the real `workplaceType`/`workFrequency` chips `PublicJobCard`/`MatchCard` already render. |
| Fact chip: pay ("14.50 €/h") | **OUT OF SCOPE** | No salary field on `PublicVacancy`, confirmed identical to P1. Never shown, per Founder ruling and P1 precedent — omit, never substitute with "competitive". |
| "Why this fits you" reason block (matches only) | **RESOLVED — DEFERRED (Founder Ruling #1)** | Not built in this unit. No RPC/schema change, no revival of the dormant TypeScript matcher. Cards use only real vacancy facts (category, workplace type, work frequency, district, language) plus the existing eligibility/missing-requirement data where already surfaced (job detail, ineligible state only). |
| "Limitation" block with one named mismatch reason inside an otherwise-shown match card, softened CTA "View details" | **OUT OF SCOPE as literally specified** | The matches list RPC only ever returns fully-eligible vacancies (hard pre-filter, confirmed via migration comment) — there is no "eligible but with one caveat" tier today. Achievable only on the **job detail page**'s existing ineligible state (a full block, not a softened single-limitation note) — and even there, per Ruling #1, gets no new positive-reason content, only a restyle of the existing `MissingRequirementsList`. |
| Jobs/public: plain requirement chips, no reason block | IMPLEMENTABLE AS-IS | Already exactly how `PublicJobCard`/`candidate-job-detail-page.tsx` work. |

### 04 · Applications and status

| Design element | Classification | Notes |
|---|---|---|
| Active / Closed grouping | **APPROVED (Founder Ruling #7)** | Pure derivation from `status` (`active` = submitted/reviewing/shortlisted; `closed` = accepted/rejected). Zero new queries. No withdrawn status or group. |
| 4-node process rail per list card (Submitted → Reviewing → Shortlisted → Decision) | IMPLEMENTABLE WITH EXISTING DATA | Canonical status order + current `status`; "Decision" is presentation text for the 4th node, not a new status value. |
| "Updated X ago" on list cards | **RESOLVED — NOT IMPLEMENTED (Founder Ruling #6)** | No per-application status-history fan-out. The list shows only `submitted_at`, already in its existing data contract. |
| Rejected → "Not selected" wording | **APPROVED (Founder Ruling #8)** | Candidate-surface-only display label; canonical `applicationStatusLabel` and the employer-side label function are untouched. |
| Closed group collapses to a single reduced-emphasis row | IMPLEMENTABLE AS-IS | Styling only. |
| Detail: Accepted olive banner + "nothing signed" explanation | IMPLEMENTABLE AS-IS | `status === "accepted"`, real; wording states plainly that nothing is signed and that accepted is not hired/not an employment start — neutral, no operational promises (Founder Ruling #5). |
| Detail: dated 4-node timeline (28 July / 31 July / 6 August / 14 August) | **IMPLEMENTABLE AS-IS — already live today**, restyle only | `loadCandidateApplicationHistory` already returns one real timestamp per status transition. This is the one candidate surface that keeps its per-status dates, per Founder Ruling #6 — polished here, not duplicated onto the list. |
| "What happens now" body copy (employer will contact you, contact us within a week) | **RESOLVED — REMOVED (Founder Ruling #5)** | No timing/support promises anywhere. Replaced with neutral product-truth copy only (what "accepted" means, that it is not hired, nothing more). |
| "Hired never appears as an application status" | ALREADY TRUE — no change needed | Confirmed: `hired` exists only as a real, separate `OUTCOME_TYPE_CODES` value, already rendered via the existing `ApplicationOutcomeTimeline`, never as a `status`. |

### 05 · Empty states

| Design element | Classification | Notes |
|---|---|---|
| "No matches yet" (profile complete, nothing published this week) | IMPLEMENTABLE WITH EXISTING DATA | Restyle of the existing `MatchesEmptyState`; CTA to public `/jobs` is a copy/link change only. |
| "No applications yet" | IMPLEMENTABLE AS-IS | Restyle of existing `ApplicationsEmptyState`. |
| "Finish your profile first" (onboarding incomplete, shown as an empty state rather than a redirect) | **RESOLVED — OUT OF SCOPE (Founder Ruling #2)** | Routing is preserved: an incomplete-onboarding candidate continues to be *redirected* to `/candidate/onboarding` from matches/applications, exactly as today. No in-page empty state replaces that redirect. |
| "No jobs open right now" (public jobs, zero published) | IMPLEMENTABLE AS-IS | This is P1's existing `PublicJobsEmptyState` on `/jobs` — not a new candidate-specific state. |
| "Nothing matches your filters" (Mornings / Near me filter chips) | **OUT OF SCOPE** | The filter chip row shown in the Design ("All 9 / Mornings / Near me") does not correspond to any real filtering capability on `/candidate/matches` today — there is no client-side or server-side filter UI at all. Building one is new interactive functionality, not presentation polish of existing behavior, and stays out of scope; not raised again with the Founder since P2's other rulings already establish a bias toward preserving current behavior. |

### 06 · Desktop 1280

All elements are layout/breakpoint restyles of components already covered
above — IMPLEMENTABLE AS-IS. The desktop **home** mockup in this Design
section shows the complete-state layout, which is out of scope per Founder
Ruling #2; the desktop restyle work in P2 covers the real incomplete-state
home, onboarding, matches, job-detail, and applications screens only, at the
same six required widths.

### 07 · Navigation and IA (Design's own handoff section)

| Design element | Classification | Notes |
|---|---|---|
| "Navigation and IA. Home, Jobs, Applications, Profile is already right" (Design's own KEEP classification) | **RESOLVED — no nav change (Founder Ruling #2)** | The Design's premise was inaccurate (real nav is Matches/Applications/Profile/Account, not Home/Jobs/Applications/Profile), but the Founder's ruling reaches the same practical outcome as the Design's own "KEEP" intent: `CandidateNav` is unchanged. |

---

## 3. Product-truth reconciliation

Proof, with file:line-level evidence gathered during this research pass, of
what existing code/API actually supports each claim category the Design
artifact and brief ask about:

- **Profile progress** — `computeOnboardingProgress` in
  `src/lib/onboarding/progress.ts` (pure function, already tested) returns
  `completeCount`, `totalGroups`, `completeGroups`, `incompleteGroups`,
  `firstIncompleteGroup`, `essentialsValid`, all derived from persisted
  `candidate_profiles`/`candidate_languages` columns. Real, no changes
  needed.
- **Match reasons** — **not supported for any live candidate route today.**
  `list_current_candidate_vacancy_matches()` and
  `resolve_current_candidate_vacancy_match()` (the two RPCs powering
  `/candidate/matches` and `/candidate/jobs/[vacancyId]` respectively) both
  return only boolean eligibility + negative missing-requirement codes
  (confirmed directly against
  `supabase/migrations/20260806000000_candidate_eligibility_contract.sql`).
  The `MatchReason`/`buildMatchReasons`/`presentMatchReasons`/`MatchReasons`
  chain is real, tested, working TypeScript — but is not connected to any
  production data path (confirmed via exhaustive grep: zero non-test,
  non-P1-homepage callers).
- **Job facts** (category, workplace type, work frequency, languages,
  CV/interview flags) — real, via `PublicVacancy`/`PublicVacancyLanguage`
  and their existing label helpers in `@/lib/public-jobs/labels`. No salary,
  no employment type, no shift, confirmed absent from this type (identical
  finding to P1).
- **Application statuses** — real, canonical, single source of truth in
  `src/lib/applications/status.ts` (`APPLICATION_STATUS_CODES`,
  `applicationStatusLabel`). Confirmed: employer surface has its own
  parallel `src/lib/employer/applications/status.ts` — precedent already
  exists in this codebase for surface-specific label functions over the same
  canonical vocabulary.
- **Status history/timestamps** — real, per-transition, via
  `loadCandidateApplicationHistory` →
  `list_current_candidate_application_status_history` RPC. Confirmed
  candidate-safe (RLS-scoped to the caller's own application; returns empty
  array rather than an error for an unowned/unknown id).
- **Application outcomes ("hired"/"interview completed")** — real, separate
  from status, via `loadCandidateApplicationOutcomes` →
  `candidate_application_outcomes`-backed RPC. Already rendered by
  `ApplicationOutcomeTimeline`, already correctly excluded from the status
  vocabulary.
- **Employer verification labels** — real, by the same inference P1 used and
  documented: `readiness.ts`'s publish-readiness gate requires the
  `verification` checklist item before any employer vacancy can be
  published, so `source === "employer"` on a live `PublicVacancy` truthfully
  implies a verified employer. No new field needed.
- **Candidate empty states** — three of five map to real existing components
  (`MatchesEmptyState`, `ApplicationsEmptyState`, P1's
  `PublicJobsEmptyState`); one (`Finish your profile first`) currently
  manifests as a redirect, not an in-page state, and stays a redirect per
  Founder Ruling #2; one (`Nothing matches your filters`) has no backing
  feature at all (out of scope, no real filters exist).

---

## 4. Component strategy

**Decision: mostly restyle existing route-specific components in place; add
a small number of new, narrowly-scoped presentational components; do not
build a "universal card" that spans public/candidate contexts.**

- **Card family (`/jobs`, `/candidate/matches`, `/candidate/jobs/[id]`):**
  Reuse the exact pattern P1 already established for `PublicJobCard` (an
  optional prop for context-specific behavior — precedent: P1's
  `headingLevel` prop added to `PublicJobCard` without touching its default
  behavior). `MatchCard` (candidate-matches) and the job-detail page's own
  meta rendering already share the same underlying fields
  (`jobCategoryLabel`, `workplaceTypeLabel`, `workFrequencyLabel`,
  language labels) via the same `@/lib/public-jobs/labels` module — the
  "shared spine" the Design asks for is **already substantially shared at
  the data/label-formatting layer**, just not via one shared React
  component. Recommend: extract the common chip-row rendering (category +
  workplace + frequency + district, in that fixed order) into one small
  presentational component (`VacancyFactChips` or similar) consumed by
  `PublicJobCard`, `MatchCard`, and `candidate-job-detail-page.tsx` alike —
  this is a safe, mechanical refactor (identical output, same props already
  available on `PublicVacancy` everywhere) and directly serves "Investigate
  whether candidate jobs and matches can share/refactor toward a coherent
  card family." Do **not** force `PublicJobCard` itself (title + demo label
  + full card chrome) into the matches/job-detail contexts — those already
  have their own applied-state badges and application CTAs that don't
  belong on the public card. No reason-block slot is reserved anywhere —
  Founder Ruling #1 defers that work entirely, not just its content.
- **Applications list/detail process rail:** one new small presentational
  component (e.g. `ApplicationStatusRail`), taking `status:
  ApplicationStatus` and rendering the 4-node dot rail — used by both the
  list card (compact) and, restyled, by the existing
  `ApplicationStatusTimeline` on the detail page (which already has the
  dated per-node data; the rail becomes the visual language, the existing
  timeline keeps the dates).
- **Onboarding review table:** one new component (`OnboardingReviewTable`),
  reading the same `profile`/`languages` already loaded by
  `loadCandidateOnboarding`, with per-group value-formatting helpers placed
  in `src/lib/onboarding/` alongside the existing `allow-lists.ts`/`labels`
  pattern.
- **Home page destination rows / applications preview / profile snapshot
  card:** **not built** — Founder Ruling #2 preserves current routing, so
  `/candidate` never reaches a "complete" state to render these in. The home
  page's only change is a restyle of the one state it already renders
  (incomplete onboarding), reusing the same profile-progress presentation
  as Task A/G, not a new component family.
- **Explicitly avoided:** a single "universal job/match card" component
  spanning public, matches, and job-detail contexts with a giant prop union
  — this is exactly the "premature universal component" the brief warns
  against; the three contexts have different action affordances (Apply vs.
  View and apply vs. plain browse) and different available data (public has
  no application state; matches/detail do).

---

## 5. Scope

**No database, schema, Auth, email, or Supabase configuration changes.**
Every file below is `src/`-only, matching the brief's constraint.

Scope is now fixed by the Founder Rulings above: no reason block (Ruling
#1), home page keeps redirecting and gets no new components (Ruling #2),
no per-application history fan-out (Ruling #6).

**Modified files:**
- `src/app/candidate/page.tsx`, `page.module.scss` (restyle the one state
  this page renders — incomplete onboarding — only; routing unchanged)
- `src/components/onboarding/onboarding-progress.tsx`,
  `onboarding-review.tsx`, `onboarding.module.scss`, all 6 group-form
  components (option-row restyle only, no logic change),
  `work-authorisation-group-form.tsx` through `employment-group-form.tsx`
- `src/components/candidate-matches/match-card.tsx`,
  `candidate-matches.module.scss`, `candidate-matches-page.tsx`
- `src/components/candidate-job-detail/candidate-job-detail-page.tsx`,
  `missing-requirements-list.tsx`, `candidate-job-detail.module.scss`
- `src/components/candidate-applications/application-inventory-card.tsx`,
  `application-inventory-list.tsx`
- `src/components/candidate-application-confirmation/application-status-timeline.tsx`,
  `application-confirmation.module.scss`
- `src/components/public-jobs/public-job-card.tsx` (extract shared chip-row
  component; default behavior unchanged, mirrors the P1
  `headingLevel`-prop precedent)
- `src/lib/onboarding/allow-lists.ts` or a new sibling file (review-table
  value-formatting helpers)
- `src/lib/applications/status.ts`-adjacent: a new candidate-display-label
  module (does not modify the canonical function)

**New files:**
- `src/components/candidate-applications/application-status-rail.tsx` (+
  `.test.tsx`)
- `src/components/onboarding/onboarding-review-table.tsx` (+ `.test.tsx`)
- `src/components/public-jobs/vacancy-fact-chips.tsx` (+ `.test.tsx`)
- `src/lib/applications/candidate-status-labels.ts` (+ `.test.ts`) —
  "Not selected" etc., candidate-surface-only

**Files deleted:** none. (The discovery draft of this plan proposed
`src/lib/applications/load-candidate-application-history-summary.ts` for a
per-application history fan-out — removed entirely per Founder Ruling #6,
never created.)

---

## 6. Tasks

> Every Product Decision Required item is now resolved (see Founder Rulings
> above) and the scope list is final. Tasks are written to full signatures
> and real test code for every piece of *logic*; clear structural/visual
> requirements (not vague "make it nice" language) for every *restyle*
> piece, since exact visual values get a design pass at implementation time
> against the approved Design artifact. **Task E has been removed in full
> per Founder Ruling #6 — do not implement it.** Task L (candidate-home
> restructure) has been removed in full per Founder Ruling #2.

### Task A: Onboarding review table — real values, all 6 groups, corrected location wording

**Files:**
- Create: `src/lib/onboarding/review-values.ts` (pure formatting functions)
- Test: `src/lib/onboarding/review-values.test.ts`
- Create: `src/components/onboarding/onboarding-review-table.tsx`
- Test: `src/components/onboarding/onboarding-review-table.test.tsx`
- Modify: `src/components/onboarding/onboarding-review.tsx` (render the new
  table in the `essentialsValid`/`onboardingCompleted` branches; no
  behavioral change to the incomplete branch)

**Interfaces:**
- Produces: `formatReviewRow(group: OnboardingGroupId, profile:
  ProgressProfile, languages: readonly ProgressLanguage[]): { label: string;
  value: string }` — one row per group, **all 6**, using only
  `ONBOARDING_GROUP_LABELS` for the label and real field values for the
  value (German comfort via `GERMAN_COMFORT_OPTIONS`, work authorisation via
  a literal "Yes"/"Not sure"/"Not answered", location via `"Berlin · up to
  {N} minutes travel"` — never a district — categories via
  `JOB_CATEGORY_OPTIONS` labels joined, availability via the ISO date
  formatted, employment via `EMPLOYMENT_TYPE_OPTIONS` +
  `SHIFT_PREFERENCE_OPTIONS` labels joined).
- Consumes: `ProgressProfile`, `ProgressLanguage` types from
  `@/lib/onboarding/progress`; `ONBOARDING_GROUPS`,
  `ONBOARDING_GROUP_LABELS`, `GERMAN_COMFORT_OPTIONS`,
  `JOB_CATEGORY_OPTIONS`, `EMPLOYMENT_TYPE_OPTIONS`,
  `SHIFT_PREFERENCE_OPTIONS` from `@/lib/onboarding/allow-lists`.

- [ ] **Step 1: Write the failing test for `formatReviewRow`**

```ts
import { describe, expect, it } from "vitest";

import { formatReviewRow } from "@/lib/onboarding/review-values";

const profile = {
  germanComfort: "basic",
  workAuthorisationDeclared: true,
  city: "Berlin",
  travelRadiusMinutes: 30,
  jobCategories: ["cleaning", "logistics"],
  availableFrom: "2026-09-01",
  employmentTypes: ["part_time"],
  shiftPreferences: ["morning", "weekend"],
};

describe("formatReviewRow", () => {
  it("formats all 6 groups with real labels, never a district", () => {
    expect(formatReviewRow("languages", profile, [])).toEqual({
      label: "Languages and German comfort",
      value: "I can understand and use some basic German",
    });
    expect(formatReviewRow("work_authorisation", profile, [])).toEqual({
      label: "Work authorisation",
      value: "Yes",
    });
    expect(formatReviewRow("location", profile, [])).toEqual({
      label: "Berlin and travel time",
      value: "Berlin · up to 30 minutes travel",
    });
    expect(formatReviewRow("categories", profile, [])).toEqual({
      label: "Job categories",
      value: "Cleaning, Logistics",
    });
    expect(formatReviewRow("employment", profile, [])).toEqual({
      label: "Employment types and shifts",
      value: "Part time · Morning, Weekend",
    });
  });

  it("never renders a district — location value never contains a comma-separated place name beyond Berlin", () => {
    const row = formatReviewRow("location", profile, []);
    expect(row.value).not.toMatch(/wedding|mitte|kreuzberg|neuk[oö]lln/i);
  });

  it("reports work authorisation as not answered when null, never fabricating a status", () => {
    expect(
      formatReviewRow(
        "work_authorisation",
        { ...profile, workAuthorisationDeclared: null },
        [],
      ),
    ).toEqual({ label: "Work authorisation", value: "Not answered" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/onboarding/review-values.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `formatReviewRow`**

Implement using the real option arrays named above. Every branch must use a
label from an existing `*_OPTIONS`/`*_LABELS` constant — never a
hand-written string duplicating an allow-list value (keeps this file
structurally unable to drift from the allow-lists it reads).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/onboarding/review-values.test.ts`
Expected: PASS.

- [ ] **Step 5: Build `OnboardingReviewTable` and wire it into `OnboardingReview`**

The table renders all 6 rows (via `ONBOARDING_GROUPS.map(formatReviewRow)`),
each with an "Edit" link to `onboardingGroupHref(group)` (existing helper).
Write a component test asserting: all 6 group labels present (including
"Employment types and shifts" — the row the Design artifact itself omitted),
no district string present, and each row's Edit link has the correct href.

- [ ] **Step 6: Run the full onboarding test suite, then commit**

```bash
npx vitest run src/lib/onboarding src/components/onboarding
git add src/lib/onboarding/review-values.ts src/lib/onboarding/review-values.test.ts src/components/onboarding/onboarding-review-table.tsx src/components/onboarding/onboarding-review-table.test.tsx src/components/onboarding/onboarding-review.tsx
git commit -m "feat: add real-value onboarding review table (all 6 groups, no fabricated district)"
```

### Task B: Application status rail component

**Files:**
- Create: `src/components/candidate-applications/application-status-rail.tsx`
- Test: `src/components/candidate-applications/application-status-rail.test.tsx`

**Interfaces:**
- Produces: `ApplicationStatusRail({ status: ApplicationStatus })` — renders
  4 nodes labelled via a fixed display sequence `["Submitted", "In review",
  "Shortlisted", "Decision"]` (the canonical `applicationStatusLabel` for
  `submitted`/`reviewing`/`shortlisted`, plus the literal, non-status word
  "Decision" for the 4th node — never "Accepted" or "Rejected" as a node
  label, matching the Design's own explicit reasoning: *"the rail describes
  the process, not a promised outcome"*), with the node index driven by
  `APPLICATION_STATUS_CODES.indexOf(status)`, clamped so `accepted`/
  `rejected` both light the 4th node (their differing meaning is carried by
  the separate status chip elsewhere on the card, never by the rail alone —
  satisfies "neither works alone, colour is never the only signal").
- Consumes: `ApplicationStatus`, `APPLICATION_STATUS_CODES` from
  `@/lib/applications/status`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationStatusRail } from "@/components/candidate-applications/application-status-rail";

describe("ApplicationStatusRail", () => {
  it("marks exactly the 3rd node current for shortlisted, 4th node text is Decision not Accepted", () => {
    render(<ApplicationStatusRail status="shortlisted" />);
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("In review")).toBeInTheDocument();
    expect(screen.getByText("Shortlisted")).toBeInTheDocument();
    expect(screen.getByText("Decision")).toBeInTheDocument();
    expect(screen.queryByText("Accepted")).not.toBeInTheDocument();
    expect(screen.queryByText("Rejected")).not.toBeInTheDocument();
  });

  it("lights the 4th node for both accepted and rejected, never renders those words as the node label", () => {
    render(<ApplicationStatusRail status="accepted" />);
    expect(screen.getByText("Decision")).toBeInTheDocument();
    expect(screen.queryByText("Accepted")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/candidate-applications/application-status-rail.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `ApplicationStatusRail`**

A `<ol>` of 4 `<li>` nodes; current-node index derived purely from
`APPLICATION_STATUS_CODES.indexOf(status)` capped at 3 (0-indexed 4th
position) for `accepted`/`rejected`. Visual state (filled dot vs. outline)
must never be the sole signal — pair with the literal node text always
rendered (satisfies the accessibility requirement below: status semantics
never color-only).

- [ ] **Step 4: Run test to verify it passes; commit**

```bash
npx vitest run src/components/candidate-applications/application-status-rail.test.tsx
git add src/components/candidate-applications/application-status-rail.tsx src/components/candidate-applications/application-status-rail.test.tsx
git commit -m "feat: add ApplicationStatusRail — process rail, Decision node never claims an outcome"
```

### Task C: Candidate-surface status display labels ("Not selected")

**Files:**
- Create: `src/lib/applications/candidate-status-labels.ts`
- Test: `src/lib/applications/candidate-status-labels.test.ts`

**Interfaces:**
- Produces: `candidateStatusDisplayLabel(status: ApplicationStatus):
  string` — identical to `applicationStatusLabel` for
  `submitted`/`reviewing`/`shortlisted`/`accepted`, but returns `"Not
  selected"` for `rejected`. Does not modify `applicationStatusLabel` itself
  (the canonical function other surfaces, and this codebase's tests for it,
  continue to return `"Rejected"` unchanged).
- Consumes: `ApplicationStatus`, `applicationStatusLabel` from
  `@/lib/applications/status`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { candidateStatusDisplayLabel } from "@/lib/applications/candidate-status-labels";
import { applicationStatusLabel } from "@/lib/applications/status";

describe("candidateStatusDisplayLabel", () => {
  it("matches the canonical label for every status except rejected", () => {
    expect(candidateStatusDisplayLabel("submitted")).toBe(
      applicationStatusLabel("submitted"),
    );
    expect(candidateStatusDisplayLabel("reviewing")).toBe(
      applicationStatusLabel("reviewing"),
    );
    expect(candidateStatusDisplayLabel("shortlisted")).toBe(
      applicationStatusLabel("shortlisted"),
    );
    expect(candidateStatusDisplayLabel("accepted")).toBe(
      applicationStatusLabel("accepted"),
    );
  });

  it("renders rejected as Not selected, candidate-surface only", () => {
    expect(candidateStatusDisplayLabel("rejected")).toBe("Not selected");
    expect(applicationStatusLabel("rejected")).toBe("Rejected");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/applications/candidate-status-labels.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `candidateStatusDisplayLabel`**

```ts
import { applicationStatusLabel, type ApplicationStatus } from "@/lib/applications/status";

export function candidateStatusDisplayLabel(status: ApplicationStatus): string {
  if (status === "rejected") {
    return "Not selected";
  }
  return applicationStatusLabel(status);
}
```

- [ ] **Step 4: Run test to verify it passes; commit**

```bash
npx vitest run src/lib/applications/candidate-status-labels.test.ts
git add src/lib/applications/candidate-status-labels.ts src/lib/applications/candidate-status-labels.test.ts
git commit -m "feat: add candidate-surface status label (Not selected), canonical label untouched"
```

### Task D: Active/closed grouping for the applications inventory

**Files:**
- Modify: `src/app/candidate/applications/resolve-inventory-view.ts`
- Modify: `src/app/candidate/applications/resolve-inventory-view.test.ts`

**Interfaces:**
- Produces: `InventoryPageView`'s `"success"` variant gains
  `active: ApplicationInventoryRow[]` and `closed: ApplicationInventoryRow[]`
  (derived, in addition to the existing flat `applications` array — kept for
  callers that don't need grouping, e.g. a future count) — `active` =
  status in `submitted|reviewing|shortlisted`, `closed` = status in
  `accepted|rejected`, both preserving the existing `submitted_at desc, id
  asc` order the loader already guarantees. Pure function, zero new queries.

- [ ] **Step 1: Extend the failing test**

Add a case asserting a mixed-status fixture array splits correctly into
`active`/`closed`, preserving input order within each group, with terminal
statuses (`accepted`, `rejected`) both landing in `closed`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/candidate/applications/resolve-inventory-view.test.ts`
Expected: FAIL on the new case.

- [ ] **Step 3: Implement the grouping**

```ts
const ACTIVE_STATUSES = new Set<ApplicationStatus>([
  "submitted",
  "reviewing",
  "shortlisted",
]);

function splitActiveClosed(applications: ApplicationInventoryRow[]) {
  const active = applications.filter((a) => ACTIVE_STATUSES.has(a.status));
  const closed = applications.filter((a) => !ACTIVE_STATUSES.has(a.status));
  return { active, closed };
}
```

Wire into the `"ready"` branch of `resolveInventoryPageView`.

- [ ] **Step 4: Run test to verify it passes; commit**

```bash
npx vitest run src/app/candidate/applications/resolve-inventory-view.test.ts
git add src/app/candidate/applications/resolve-inventory-view.ts src/app/candidate/applications/resolve-inventory-view.test.ts
git commit -m "feat: derive active/closed application grouping, zero new queries"
```

### Task E — REMOVED (Founder Ruling #6)

The discovery draft of this plan proposed a batched per-application
status-history fan-out (`loadCandidateApplicationHistorySummary`, N
sequential RPC calls) to show "Updated X ago" on inventory list cards. The
Founder ruled this out explicitly: **do not implement.** The applications
inventory list continues to show only `submitted_at`, already in its
existing data contract — no new file, no new query, no wiring change to
`/candidate/applications/page.tsx` beyond what Task D (grouping) and Task I
(restyle) already touch. The real per-status timestamps remain exactly
where they already work today — the application **detail** page — polished
by Task J.

### Task F: Shared vacancy fact-chip component

**Files:**
- Create: `src/components/public-jobs/vacancy-fact-chips.tsx`
- Test: `src/components/public-jobs/vacancy-fact-chips.test.tsx`
- Modify: `src/components/public-jobs/public-job-card.tsx`,
  `src/components/candidate-matches/match-card.tsx`,
  `src/components/candidate-job-detail/candidate-job-detail-page.tsx`
  (consume the shared component; no change to any prop contract those files
  already expose to their own callers)

**Interfaces:**
- Produces: `VacancyFactChips({ vacancy: PublicVacancy })` — renders the
  fixed-order chip row (category, district if `publicLocality !== null`,
  workplace type if not null, work frequency if not null) using the exact
  existing label functions (`jobCategoryLabel`, `workplaceTypeLabel`,
  `workFrequencyLabel` from `@/lib/public-jobs/labels`) — a pure extraction,
  output must be byte-identical to what each of the three call sites
  currently renders for the same vacancy (verified by each site's existing
  snapshot/role-based tests continuing to pass unmodified).

- [ ] **Step 1: Write the failing test** for `VacancyFactChips` directly
  (fixture vacancy with all fields present, then one with `publicLocality:
  null`/`workplaceType: null` to confirm chips are omitted, never rendered
  empty).

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement `VacancyFactChips`**, extracting the existing chip
  JSX from `public-job-card.tsx` verbatim (same conditionals, same label
  calls, same order).

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Replace the inline chip-row JSX in all three consumers with
  `<VacancyFactChips vacancy={vacancy} />`.** Run each consumer's existing
  test file unmodified and confirm it still passes — this is the
  regression proof that the extraction is behavior-preserving.

```bash
npx vitest run src/components/public-jobs/public-job-card.test.tsx src/components/candidate-matches src/components/candidate-job-detail
```

- [ ] **Step 6: Commit**

```bash
git add src/components/public-jobs/vacancy-fact-chips.tsx src/components/public-jobs/vacancy-fact-chips.test.tsx src/components/public-jobs/public-job-card.tsx src/components/candidate-matches/match-card.tsx src/components/candidate-job-detail/candidate-job-detail-page.tsx
git commit -m "refactor: extract VacancyFactChips shared across public/matches/job-detail cards"
```

### Tasks G onward (restyle-only, structural requirements given, exact code deferred to implementation time)

The following are genuine tasks with concrete acceptance criteria, but are
intentionally not given full SCSS/JSX in this document — their exact visual
values get a design pass against the approved Design artifact at
implementation time. Their *scope* (what they do and do not touch) is fully
fixed by the Founder Rulings above and not open to further interpretation:

- **Task G — Onboarding progress rail restyle.** Acceptance criteria:
  same `OnboardingProgress` data; rail is horizontal; current step visually
  distinct by more than color alone (e.g. size + fill, matching the Design's
  own "never colour alone" rule already applied elsewhere in this plan);
  the numeric "X of Y" caption is retained, demoted to secondary; all
  existing `onboarding-progress.test.tsx` assertions continue to pass
  (structure change, not data change).
- **Task H — Onboarding option-row restyle (all 6 group forms).**
  Acceptance criteria: every option row is ≥48px tall (real touch-target
  token: `--touch-target-min`, 44px currently — confirm/raise to a token
  meeting 48px if the Design's exact figure is required, otherwise use the
  existing token and note the 4px gap as a deliberate, documented deviation);
  selection state shown via border weight + fill + a checkmark icon, never
  color alone. **No "Saved automatically" text or any other persistence
  claim anywhere (Founder Ruling #3)** — the border/fill/check state is the
  entire feedback; nothing else is rendered on change. Zero change to any
  `name`/`value`/`required` attribute or server action wiring.
- **Task I — Applications list restyle: Active/Closed sections + rail per
  card.** Consumes Task D (grouping) + Task B (rail) + Task C (candidate
  status labels). Acceptance criteria: two `<section>`s with `aria-label`s
  "Active applications"/"Closed applications" (or equivalent, finalized
  with real heading text at implementation time); closed section rows
  render at reduced visual emphasis (opacity/typography weight, not solely
  color); zero applications in a group hides that group's heading entirely
  (no "Active · 0"). Each card continues to show `submitted_at` only — **no
  "Updated X ago" text (Founder Ruling #6, Task E removed)**.
- **Task J — Application detail restyle: accepted banner + dated timeline
  visual language.** Consumes the existing `ApplicationStatusTimeline`
  (unchanged data contract) restyled to the dot-rail visual; accepted-status
  banner uses `--color-support`/`--color-support-subtle` tokens (olive
  family, already used elsewhere for success-adjacent states). Banner copy
  is **neutral product-truth only, per Founder Ruling #5**: states that the
  application is accepted, that accepted is distinct from hired/employment
  started/contract signed (consistent with the existing accepted ≠ hired
  product truth), and nothing else — no timing promise ("will contact you
  within X days"), no support-contact instruction ("contact us after a
  week"). Exact final sentence is a copy pass at implementation time within
  that constraint, not a Founder decision point anymore.
- **Task K — Matches/job-detail card restyle + ineligible-state softening.**
  Consumes Task F (`VacancyFactChips`). Acceptance criteria: verified badge
  always present when `source === "employer"`; ineligible-state
  `MissingRequirementsList` restyled with a neutral (not red/alarm) visual
  treatment, matching the Design's "neutral grey circle" language. **No
  positive reason block anywhere — deferred in full per Founder Ruling #1,
  not part of this or any task in this plan.**
- **Task M — Candidate home (`/candidate`) incomplete-state restyle.**
  Files: `src/app/candidate/page.tsx`, `src/app/candidate/page.module.scss`,
  `src/app/candidate/page.test.tsx`. This is the one gap between Section 5's
  declared scope and Tasks A–K: the home page's own progress line ("X of Y
  sections saved," currently plain text, not the `OnboardingProgressNav`
  component Task G restyles) needs its own visual pass — a real progress
  bar reusing the same visual language Task A/G establish (segment bar,
  never color-only), and a clearer heading/CTA hierarchy for the single
  "Continue onboarding" / "Review and confirm essentials" action. Acceptance
  criteria: `resolveCandidateHomeView`'s redirect behavior is untouched
  (Founder Ruling #2 — verified by `page.test.tsx`'s existing assertions
  continuing to pass unmodified); `progress.completeCount`/`totalGroups`
  remain the only data driving the bar (no new query); no destination cards,
  no applications preview, no avatar (all out of scope per Ruling #2).

**Task L — removed (Founder Ruling #2).** The discovery draft proposed a
candidate-home restructure contingent on `/candidate` becoming a persistent
post-onboarding dashboard. The Founder ruled to preserve current routing in
full; there is no home-restructure task. The home page's only P2 change is
folded into Tasks A/G's restyle work (real progress bar, clearer heading/CTA
hierarchy) applied to the one state `/candidate` already renders.

---

## 7. Responsive validation

Required widths: **360, 390, 430, 768, 1280, 1440** — identical set to P1,
same token/breakpoint system (`$breakpoint-sm=480`, `$breakpoint-md=768`,
`$breakpoint-lg=1024`, `$breakpoint-xl=1280`). Candidate experience is
mobile-first per the brief; validate mobile widths first at implementation
time, then confirm the two desktop widths don't regress — in particular the
applications list's Active/Closed sections at narrow widths, where the
process rail must not overflow horizontally, and the onboarding review
table's Edit-link row at narrow widths.

## 8. Accessibility

Explicit validation required at implementation time for:
- **Heading hierarchy** — every restyled page keeps exactly one `<h1>`;
  card titles inside lists stay `<h2>`/`<h3>` consistent with each page's
  existing (already-correct) nesting — verified per-page, not assumed.
- **Focus** — every new interactive element (Edit links in the review
  table, rail nodes if they become interactive, group toggles) has a
  visible `:focus-visible` state using the existing `--focus-ring-width`/
  `--color-focus-ring` tokens, matching every existing component in this
  codebase.
- **Keyboard** — the review table's Edit links and the applications list's
  View links must be reachable and operable via keyboard alone; no
  click-only `<div>`s.
- **Status semantics** — the `ApplicationStatusRail` (Task B) must never
  convey the current step by color alone (already enforced by its own test:
  literal node text always present) and must not misuse `aria-current` for
  a non-navigational, non-current-page element (use `aria-current="step"`,
  matching `OnboardingProgressNav`'s existing precedent for the same ARIA
  value).
- **Progress semantics** — the profile-progress bar (home + onboarding)
  should use `role="progressbar"` with `aria-valuenow`/`aria-valuemin`/
  `aria-valuemax` set from real `completeCount`/`totalGroups`, or an
  equivalent accessible-name pattern if a native `<progress>` element is
  used instead — decided at implementation time, not before.
- **Expandable/disclosure behavior** — none of the tasks in Section 6
  introduce a new disclosure widget; `CandidateNav` is unchanged per Founder
  Ruling #2, so there is no nav restyle to apply P1's
  `display:none`/`display:flex` pattern to in this unit.
- **Contrast** — every new/changed text-on-surface pairing must be checked
  against its real background token before shipping (P1's own contrast
  miss — clay-500 on the dark inverse background computing to 4.37:1, just
  under AA — is a documented cautionary precedent; this plan's accepted
  banner (olive-on-light) and closed-application reduced-opacity rows are
  the two highest-risk new pairings to check explicitly).
- **Reduced motion** — no new animation is proposed by any task above; if
  a restyle task adds one (e.g. a rail-fill transition), it must respect
  `prefers-reduced-motion` per the existing global rule in
  `src/styles/globals.scss`.
- **Screen-reader names** — every icon (checkmarks, chevrons, avatar
  circles) must either be `aria-hidden="true"` with adjacent real text
  conveying the same information, or have an explicit accessible name —
  never an icon as the sole source of meaning, matching the brief's chip/
  card discipline section.

## 9. Testing

Exact commands, matching what P1 established (including the lesson learned
mid-P1 about `format:check` never having been run locally):

```bash
npm run lint
npm run format:check
npx tsc --noEmit
npx vitest run
npx playwright test   # candidate-specific specs: e2e/matches-journey.spec.ts,
                       # e2e/job-detail-journey.spec.ts,
                       # e2e/candidate-application-status-journey.spec.ts,
                       # e2e/candidate-navigation-ia.spec.ts (already exist —
                       # confirm each still passes unmodified after every
                       # restyle task; do not assume, run them)
npm run build          # if CI requires it — confirm against this repo's
                       # actual CI workflow at implementation time
```

Every task above (A through F) includes its own focused unit/component test
written TDD-first. Tasks G through L (restyle-only) must not reduce existing
test coverage — every existing `*.test.tsx` for a file they touch must be
re-run and pass unmodified, since restyle work changes markup/classes, not
props/behavior contracts.

## 10. Stop conditions

**One genuine stop condition was found and is not silently worked around —
now formally resolved as DEFER, per Founder Ruling #1:**

- **Design requires data the product does not currently expose:** a
  truthful "why this fits you" positive match-reason block, for either
  `/candidate/matches` or `/candidate/jobs/[vacancyId]`, requires either
  (a) extending the `list_current_candidate_vacancy_matches`/
  `resolve_current_candidate_vacancy_match` RPC contracts to additionally
  return which criteria matched (an API/schema-adjacent change), or (b)
  reviving the currently-dormant, direct-table-reading TypeScript matcher
  path in production, bypassing the "effective public vacancy" RPC contract
  the live loaders deliberately use instead. Both are outside "presentation
  polish, not feature expansion" and outside this plan's file scope. **Not
  implemented in P2, and not scheduled — Ruling #1 is a deferral, not a
  request for further options.** No task in Section 6 adds this block.

Every other item raised in the discovery pass has been resolved by a
Founder ruling (see "Founder Rulings" above) rather than left open: per-status
timestamps and the "hired is not a status" question were resolved by
research alone (the data already exists); the candidate-home/IA question,
the "Saved automatically" wording, the employer-visibility sentence, the
accepted-application operational copy, and the application-list N+1
timestamp fetch were each resolved by an explicit Founder ruling. None of
those remain open, and none block Section 6's tasks.
