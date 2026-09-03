# M5 Beta Transition and Measurement

## Status

**M5.0 — Approved founder decisions recorded; merged (PR #74). M5 product-development freeze superseded by D-M5-23 (2026-09-03).**

M4 is complete. Slice 8 is complete. M5 — Berlin private beta — is the active milestone.

This document defines the initial M5 beta boundary and authoritative top-level counting semantics. It does not authorize product/schema/runtime implementation by itself.

## M5 objective

Operate Klinnova as a controlled Berlin private beta, validate whether the current product can create real employment outcomes, and selectively advance bounded Founder product work.

Overall M5 targets:

- 20 participating employers
- 100 verified vacancies
- 200 candidates
- 10 completed-interview conversions
- 3 confirmed hires

Feature expansion is frozen unless a change:

- is required to measure the beta;
- removes an observed blocker for a real user;
- fixes a bug, accessibility, security, or privacy problem; or
- is necessary for safe beta operation.

## Accepted founder decisions

### D-M5-1 — Beta scope freeze

**Status:** Approved

The merged M4 implementation is the minimum product boundary for the initial M5 Berlin private beta. Capabilities deliberately deferred during implementation do not block beta unless observed beta evidence shows they are required.

**Superseded in part by D-M5-23 on 2026-09-03.** The M4 implementation remains the minimum Cohort A baseline, but the blanket restriction on product discovery, design, and bounded Founder implementation no longer controls current work.

The initial beta does not require speculative expansion into chat, native applications, reviews/ratings, AI matching, embeddings/vector search, payments/payroll, subscriptions, full ATS functionality, video interviews, multi-city expansion, broad scraping, CV upload, saved jobs, or sophisticated analytics dashboards.

### D-M5-2 — Completed interview metric

**Status:** Approved

An interview is an outcome fact, not an application workflow status.

An `interview_completed` event may be stored for each distinct employer-recorded completed interview round on an application.

For the **top-level M5 target**, one application contributes at most one completed-interview conversion:

- an application contributes `1` once it has at least one active, non-voided `interview_completed` event;
- additional completed interview rounds remain historical events but do not increment the top-line target.

An invitation, proposal, or scheduled interview alone does not count.

This prevents multi-round interview processes from inflating the M5 target of 10 completed interviews.

### D-M5-3 — Confirmed hire metric

**Status:** Approved

A confirmed hire counts when the employer records that the candidate was hired for the vacancy.

Existing application status `accepted` must not automatically count as a confirmed hire.

Candidate confirmation may be considered later but is not required for the initial private beta.

### D-M5-4 — Outcome model direction

**Status:** Approved direction

Interview/hire outcomes are conceptually separate from the existing application workflow status.

M5.0 may investigate and propose the smallest trustworthy outcome contract, including authorization, history/audit behavior, candidate visibility, deletion behavior, and funnel integration.

No schema/runtime implementation is authorized by this decision alone.

### D-M5-5 — Monitoring boundary

**Status:** Approved direction

Before intentional Cohort A external beta traffic, plan a minimal, privacy-conscious Sentry setup:

- EU region where available on the selected plan;
- error monitoring only;
- no session replay;
- no request-body or application/vacancy payload capture;
- scrub unnecessary email/user identifiers;
- separate Preview and Production environments;
- retention target of 30 days or less where supported;
- no PostHog in Cohort A.

M5.0 does not configure Sentry.

### D-M5-6 — CV/save-job freeze

**Status:** Approved

Optional CV upload and save/unsave jobs remain longer-term product capabilities but do not block the initial Berlin private beta.

Reconsider them only with beta evidence that they remove a real blocker.

### D-M5-7 — Staged beta cohorts

**Status:** Approved

#### Cohort A — Proof

- 3–5 participating employers
- 10–20 legitimate vacancies
- 20–30 candidates
- target: first completed-interview conversion

#### Cohort B — Validation

- 8–10 participating employers
- 30–50 vacancies
- 60–100 candidates
- target: repeated completed-interview conversions and first confirmed hire

#### Cohort C — Full M5 target

- 20 participating employers
- 100 verified vacancies
- 200 candidates
- 10 completed-interview conversions
- 3 confirmed hires

### D-M5-8 — Participating employer counting

**Status:** Approved

Count one unique employer when all of the following became true during M5:

- employer onboarding is complete;
- employer is verified; and
- at least one employer-submitted vacancy became effective-public during M5.

Participation is a historical M5 fact. Once counted, the employer remains counted even if they later pause/withdraw their vacancy, are suspended, or lose verification.

Track **current active/safe employer supply separately** from the cumulative participating-employer metric.

Seed/demo employers do not count.

### D-M5-9 — Verified vacancy counting

**Status:** Approved

Count one unique employer-submitted vacancy when it became effective-public at least once during M5 while its employer was verified.

Do not count:

- seed/demo vacancies;
- drafts that never legitimately became public;
- duplicate public periods for the same vacancy.

The metric is historical/cumulative: each qualifying vacancy counts once even if later paused, withdrawn, filled, expired, moderated, or otherwise no longer public.

Track **current effective-public supply separately**.

### D-M5-10 — Candidate counting

**Status:** Approved

Count one unique candidate when authoritative essential onboarding is complete.

A candidate who completed onboarding before M5 counts only if explicitly enrolled into an M5 cohort.

Raw registrations do not count.

The cohort roster therefore determines whether a pre-existing completed profile enters M5 measurement; onboarding completion determines eligibility to count.

### D-M5-11 — Cohort A employer wedge

**Status:** Approved

Cohort A is cleaning-first.

The primary employer segment should be simple cleaning demand where language barriers are low and the current product fits the hiring workflow.

A narrow exception allows **1–2 adjacent low-language-barrier employers** when:

- founder access is strong; and
- the hiring model remains simple and compatible with the current Stint workflow.

Do not deliberately run a broad multi-sector Cohort A.

### D-M5-12 — Candidate visibility of outcomes

**Status:** Approved

Candidates may read their own **active** outcome events in candidate-safe form containing only:

- outcome type;
- occurred date/time.

Do not expose candidate-facing:

- actor IDs;
- void/correction metadata;
- operator details;
- internal audit implementation;
- internal notes.

### D-M5-13 — Outcome correction model

**Status:** Approved

Outcome history is append-only.

Corrections use void/replacement semantics.

Do not hard-edit or hard-delete an existing outcome event to rewrite history.

### D-M5-14 — Deleted-candidate outcome behavior

**Status:** Approved

After `candidate_profiles.account_deleted_at` is non-null for the application owner:

- no new outcome event may be recorded for that application;
- existing non-identifying historical outcome facts may remain with the preserved application/history under the current deletion model.

This mirrors the existing principle that a deleted candidate's application is historical/read-only rather than an active recruitment workflow.

### D-M5-15 — Outcome timestamp policy

**Status:** Approved

Employer-recorded `occurred_at`:

- may be backdated by at most 30 days;
- must not be future-dated except for negligible server/client clock-skew tolerance.

`recorded_at` is database-generated and immutable.

Any future implementation must define the exact negligible clock-skew tolerance as a fixed system-owned constant rather than a caller-selectable value.

### D-M5-16 — Sentry Cohort A readiness

**Status:** Approved

Minimal Sentry error monitoring is approved as a beta-readiness item under the D-M5-5 boundary.

Required configuration intent:

- EU region where available on the selected plan;
- error monitoring only;
- no session replay;
- no request-body capture;
- no application/vacancy payload capture;
- scrub unnecessary email/user identifiers;
- Preview and Production separated;
- retention target 30 days or less where supported;
- no PostHog in Cohort A.

This PR does not implement or configure Sentry.

### D-M5-17 — Legal readiness gate

**Status:** Approved

The founder owns beta-readiness completion.

Intentional Cohort A external traffic is gated on qualified German legal review/finalization of:

- Impressum/business identity;
- Privacy notice reflecting actual processing;
- Terms suitable for the beta;
- support/contact channel;
- Sentry disclosure if required by the final monitoring configuration.

Passing this gate is **not** a claim of full GDPR compliance or complete statutory fulfillment.

### D-M5-18 — Weekly operating cadence

**Status:** Approved

Run one structured M5 review per week.

Every observed issue is classified as one of:

- **Operate manually** — founder support solves it without product work;
- **Fix now** — material blocker, safety/privacy/security/accessibility issue, or beta-measurement requirement;
- **Watch** — plausible issue with insufficient evidence;
- **Defer** — does not materially affect current beta validation.

The default M5 engineering loop is:

> Observe problem → confirm it matters → smallest fix → test → deploy → observe again.

Heavier planning remains reserved for changes affecting schema/database, authorization/RLS, privacy, security, matching authority, employment/legal boundaries, or major architecture.

### D-M5-19 — Publication and matching integrity restoration (Unit A1)

**Status:** Approved

**Context:** the M5.1 Unit I baseline browser proof reproduced two core-journey blockers, subsequently traced to exact root cause by direct code/SQL investigation, not inferred:

1. `employer_vacancy_draft_readiness` (PR 4.3) and `_employer_vacancy_publish_missing` (PR 5.2) are two independently-authoritative "is this vacancy ready" functions that silently diverged — the publish gate requires `verification`, `workplace_type`, `work_frequency`, `cv_required`, `interview_english_ok`, and `expiry`, none of which the on-page readiness checklist has ever checked. An employer can see "Ready for a future publication step" and then have publish rejected for fields never shown as incomplete.
2. `src/components/employer-vacancies/vacancy-lifecycle-actions.tsx` renders every post-failure checklist row's status as the hardcoded literal string `"Missing"`, ignoring the correctly-computed `item.complete` value — so a failed publish attempt visually flips every previously-complete item to "Missing," contradicting the readiness panel shown moments earlier.
3. The original schema (`20260804120000_employer_owned_draft_vacancies.sql`) enforced `publication_state = 'draft' OR cardinality(employment_types) > 0` (and the equivalent for `shift_requirements`) — empty match-critical arrays were only ever permitted while a vacancy remained a draft. `20260805110000_verification_and_vacancy_publication.sql` silently replaced this with `source <> 'seed' OR cardinality(...) > 0`, which is trivially true for every employer-sourced vacancy in every publication state, permanently. This is a confirmed constraint-level regression, not intended behavior.
4. No employer-facing input for `employment_types`/`shift_requirements` has ever existed (confirmed since the form's creation, Slice 4/PR 4.4) — an always-existing gap, not a regression. `create_employer_vacancy_draft`/`update_employer_vacancy_draft` already accept both parameters; only the form-to-RPC wiring is missing.
5. The canonical matcher (`_evaluate_candidate_vacancy_eligibility`) is not defective: `unnest('{}'::text[])` deterministically produces zero rows, so an empty vacancy array correctly excludes every candidate under the schema's original, intended semantics. Making the matcher treat empty arrays as "no restriction" was explicitly considered and rejected — it would silently match candidates against requirements the employer never actually specified, a worse failure mode (false positive) than the current one (false negative).

**Decision:** implement the following as one coherent, additive correction, without changing matcher semantics:

- fix the hardcoded `"Missing"` render in `vacancy-lifecycle-actions.tsx` to reflect each item's actual `complete` state;
- bring `employer_vacancy_draft_readiness`'s checked field set into alignment with `_employer_vacancy_publish_missing`'s, so the on-page checklist and the publish gate never disagree;
- restore the `employment_types`/`shift_requirements` non-empty constraints to their original publication-state-based exemption (`publication_state = 'draft' OR cardinality(...) > 0`), applying to every employer-sourced vacancy, not only seed rows;
- add `employmentTypes`/`shiftRequirements` input controls to `VacancyDraftForm`, wired to the already-RPC-ready parameters;
- add both fields to `_employer_vacancy_publish_missing` so an incomplete vacancy can no longer reach `published` without them.

**Explicitly not changed:** the matcher's SQL predicates (`_evaluate_candidate_vacancy_eligibility` and its callers) remain exactly as written — an empty array continues to mean "excludes every candidate," never "no restriction." No candidate-facing behavior changes; this is entirely an employer-side data-completeness and readiness-accuracy correction.

**Required exit proof:** a real local browser journey — employer onboard → verify → vacancy readiness accurately reports every missing field → complete all requirements → publish; candidate onboard with compatible requirements → vacancy appears in Matches → inspect job → apply successfully — plus explicit negative proofs: incomplete workplace type/work frequency cannot report false readiness; empty `employment_types`/`shift_requirements` cannot reach `published`; a non-matching candidate does not receive the vacancy; readiness reflects reality immediately after a sub-form save; a failed publish attempt does not flip unrelated complete fields to "Missing."

**Consequences:** one additive migration (the 17th) containing the readiness-RPC alignment, the restored constraint, and the widened publish-gate field list; no change to any existing migration; the vacancy draft form and its RPC-calling Server Actions gain two new optional-until-publish fields; no change to `applications`, `candidate_profiles`, or any candidate-facing RPC.

#### Hosted Preview proof evidence (Unit A1, 2026-08-09)

Recorded on the disposable `hosted-proof/m5.1-preview-provisioning` branch (never merged to `main`), after PR #76 (containing D-M5-19's migration and code) was merged to `main` at `f602c15bca0519406f6e4e83d1c7f25a5d6c7cd8`.

**Isolated infrastructure used:**
- Supabase Preview branch `m5-1-unit-a1-hosted-proof` (project ref `hktsqjebxqasxuywstsl`), created ephemeral (`persistent: false`) and without Production data (`with_data: false`), parented to the `stint` Production project (`kvrzmzoszitdicjvrprt`) but never sharing data with it.
- All 17 migrations applied to this Preview branch only, via `supabase db push --db-url <preview-connection-string>` (never `--linked`), confirmed by dry-run showing exactly the expected 12 remaining migrations before applying, and by a post-apply count of `supabase_migrations.schema_migrations` = 17.
- A Vercel Preview deployment of the same commit, with `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` added to Vercel scoped to Preview + the `hosted-proof/m5.1-preview-provisioning` git branch only — Production's Vercel env vars were never modified.
- Vercel Deployment Protection (a pre-existing, not newly created, project setting) was bypassed for automated access using the project's pre-existing "Protection Bypass for Automation" secret, sent as an `x-vercel-protection-bypass` header.

**Auth configuration adjustment (Preview only):** the Preview branch's built-in mailer has a fixed anti-abuse send-rate quota that made real multi-account signup infeasible for this proof (confirmed directly via the Auth REST API: `over_email_send_rate_limit`). `mailer_autoconfirm` was temporarily set `true` on the Preview project only (recorded before: `false`; Production confirmed unchanged at `false` throughout and after) so registration could proceed through the real UI/session path without depending on real email delivery. **This proof therefore does not validate the real confirmation-email delivery path** — only everything from an authenticated session onward (onboarding, readiness, verification, publish, matching, application). `mailer_autoconfirm` was restored to `false` on the Preview project as part of teardown.

**Journey results, both green, no direct DB edits used to manufacture matchability** (employment_types/shift_requirements entered exclusively through the real hosted checkboxes in both cases):
- Positive: employer registers → onboards → creates a draft → readiness truthfully reports "not ready" while incomplete/unverified → completes every field including employment types/shift requirements via the real form → readiness reflects the save immediately with no reload → requests verification → a separately-provisioned operator account approves → readiness reports "ready" → publishes → a compatible candidate registers, onboards, sees the vacancy in Matches, opens the job detail page, and submits an application.
- Negative: same employer/publish flow; a candidate with incompatible employment type/shift does not see the vacancy in Matches.
- Confirmed by direct, read-only query against the Preview database after the run: 6 `auth.users` rows (2 employers, 2 operators, 2 candidates), 2 `employer_profiles` rows both `verified`, 2 `vacancies` rows both `published`, exactly **1** `applications` row (only the compatible candidate applied), 2 active `verification_operators` rows.

**Teardown performed same day:** `mailer_autoconfirm` restored to `false` on the Preview project; the ephemeral Supabase Preview branch deleted; the Vercel Preview env vars scoped to `hosted-proof/m5.1-preview-provisioning` removed; the Vercel Preview deployment removed. Production was not touched at any point in this exercise. The `hosted-proof/m5.1-preview-provisioning` branch itself was not merged.

### D-M5-20 — Candidate navigation and account IA consolidation (Unit B)

**Status:** Approved

**Context:** re-inspection of current `main` found five inconsistent header/navigation implementations across authenticated candidate pages, not the two originally assumed — `/candidate` (inline brand + sign-out, no dual-capability switcher), `CandidateMatchesPage` (brand + capability switcher + export + delete + sign-out, no link to Applications), the shared `CandidateApplicationsPageHeader` (brand + Applications link + capability switcher + sign-out, no link to Matches/export/delete), `CandidateJobDetailPage` (brand + sign-out only, no capability switcher, no other nav), and `/candidate/onboarding` (brand + sign-out only). `/candidate/account/delete` had no header or navigation at all. No page exposed a coherent set of destinations, and none is a security or data-integrity defect — this is an information-architecture gap.

**Decision:** consolidate every authenticated candidate surface onto one shared header (`CandidateAppHeader`/`CandidateNav`, `src/components/candidate-nav/`) exposing exactly four destinations — Matches, Applications, Profile (the existing `/candidate/onboarding?group=review` review/edit flow — no new profile editor), and Account (a new, minimal `/candidate/account` hub page listing the existing export, delete, and sign-out capabilities). Sign-out is deliberately removed from the shared header and lives only inside Account, so it cannot be an accidental primary-navigation destination. The existing, unmodified `DeleteAccountPanel` is unchanged and remains shared with the employer surface; only the surrounding page-level header was added around it (`/candidate/account/delete`), since the panel itself had no back-navigation logic to correct.

**Explicitly not changed:** deletion domain semantics, export schema/content, account-deletion migrations/RPCs, Auth soft-delete behavior, deletion reconciliation, service-role handling, the onboarding-review flow's own logic, employer/admin navigation (including the separately-tracked employer "Vacancies" duplicate-link finding, left untouched and still tracked under the UX/readiness backlog below — not a shared component this unit needed to touch).

**Label deviation:** the nav item for `/candidate/onboarding?group=review` is labelled "Profile" rather than "Profile / Preferences", to keep the nav's four labels short and non-wrapping at 360px; the fuller phrase remains accurate in prose elsewhere.

**Required exit proof:** a completed candidate reaches Matches, Applications, Profile, and Account through the real consolidated nav, each with accurate `aria-current`; Profile opens the existing review flow without resetting saved answers; Account exposes export/delete/sign-out without any destructive action firing merely by navigating there; no horizontal overflow and keyboard/focus-visible reachability at 360/390/430px and desktop. Proven in `e2e/candidate-navigation-ia.spec.ts` (7 tests, real UI, local Supabase) plus Vitest coverage on the new/changed components; five pre-existing E2E specs that asserted the old sign-out location were updated to the new Account-based path, not weakened.

**Consequences:** no schema/migration change (migration count unchanged at 17); no product/dependency change; new `src/components/candidate-nav/` component pair plus a new `/candidate/account` route; five existing candidate page/header components updated to render the shared header instead of their own inline markup; five pre-existing E2E specs updated for the new sign-out location.

### D-M5-21 — Password recovery (Unit C)

**Status:** Approved

**Context:** password recovery had never been implemented — no `resetPasswordForEmail`/`updateUser({password})` call, no `/forgot-password`/`/reset-password` route, and `/auth/confirm`'s allow-list explicitly excluded `type=recovery` (locked in by a pre-existing test asserting exactly that). Naively adding `recovery` to that allow-list would have been actively wrong: its success path always ends by ensuring a candidate profile and resolving a capability-based destination, which must never happen for a password-reset click.

**Callback mechanism, confirmed empirically against the installed local Supabase version, not assumed:** `resetPasswordForEmail`'s email link does not point directly at the app. It points at GoTrue's own `/auth/v1/verify?token=...&type=recovery&redirect_to=...` endpoint, which verifies the token server-side and 303-redirects to `redirectTo` carrying only a PKCE `code` — `type=recovery` is consumed by GoTrue and does not survive onto the app's route (confirmed identical for the existing signup flow too: the custom `confirmation.html` template's `{{ .ConfirmationURL }}` goes through the exact same GoTrue-verify-redirect shape, landing on `/auth/confirm` as a bare `?code=...`, always exchanged through the generic code path — the `token_hash`/`type`-keyed `verifyOtp` branch already in `confirm.ts` was, in practice, dead code for every real browser-driven Mailpit flow before this unit). Since `redirectTo` itself does survive the redirect (GoTrue appends `code` onto whatever was passed), `requestPasswordResetAction` marks it with its own `?intent=recovery` query parameter — that is the actual signal `confirmAuthCallback`'s recovery branch keys on. `token_hash`+`type=recovery` is also accepted, in case a differently configured Supabase project ever emails a direct OTP-hash link instead of the verify-redirect form.

**Decision:** implement the full bounded flow using only the existing Supabase Auth architecture — `/login`'s "Forgot password?" → `/forgot-password` (email request, enumeration-safe) → GoTrue verify-redirect → `/auth/confirm`'s new `intent=recovery` branch (never ensures a profile, never resolves a capability destination) → `/reset-password` (session-gated set-new-password) → explicit "Continue to sign in" (mirrors the account-deletion completed-state pattern, D-081/PART S: sign out the recovery session and land on `/login`, rather than silently continuing in it) → normal login with the new password.

**Enumeration safety:** `requestPasswordResetAction` returns the identical generic message ("If an account exists for that email, we've sent password reset instructions.") regardless of whether the address exists or `resetPasswordForEmail` itself errored; it never logs the submitted email.

**Invalid/expired handling:** a failed recovery verification (bad token, expired link, or a direct visit to `/reset-password` with no session) reaches the shared `/auth/error` page with a `reason=recovery`-specific message and a "Request another reset" link back to `/forgot-password` — never a raw Supabase error string, never a silent drop into onboarding.

**Explicitly not built:** MFA, magic-link redesign, email-address change, a general "change password while logged in" settings page (an already-authenticated visitor to `/reset-password` can use the same form to change their own password — a legitimate self-service action gated by their own valid session, not a new capability; Supabase does not expose a durable server-side flag distinguishing a recovery-established session from a normal one, so this is the smallest safe behavior rather than a second UI).

**Required exit proof:** a real local Supabase + Mailpit journey — register, confirm, log out, request reset, read the real recovery email, follow the real link, set a new password, confirm the old password now fails and the new one succeeds on the same account (no duplicate user, no onboarding reset) — plus an unknown-email request producing the identical generic response, and an invalid/malformed link reaching the safe retry state. Proven in `e2e/password-recovery-journey.spec.ts` (4 tests, real UI, local Supabase, gated behind `E2E_AUTH_JOURNEY` and wired into the Schema/RLS CI job exactly like Units A1/B), plus Vitest coverage across the new schemas, actions, components, and the `confirm.ts` recovery branch.

**Explicit caveat:** this unit proves the recovery mechanism against local Supabase's built-in mailer via Mailpit only. It does not configure custom SMTP and does not prove Production/hosted email deliverability — that remains a separate, later concern.

**Consequences:** no schema/migration change (migration count unchanged at 17); no new dependency; no Production/Preview/hosted mutation. New routes `/forgot-password` and `/reset-password`; `confirm.ts`'s `ConfirmSearchParams`/`ConfirmResult` gained an `intent` field and a `"recovery"` failure reason respectively; `/auth/error` gained a `reason=recovery` branch; `/login` gained a "Forgot password?" link.

### D-M5-22 — Outcome DB / RLS / RPC contract (Unit D)

**Status:** Approved

**Context:** M5's two business outcomes — completed interviews, confirmed hires — have no representation in the existing `applications.status` workflow (D-M5-4). `docs/50-m5-outcome-contract-proposal.md` had already resolved the founder policy questions (D-M5-12 candidate visibility, D-M5-13 append-only correction, D-M5-14 deleted-candidate behavior, D-M5-15 timestamp policy) but explicitly authorized discovery only, not implementation. The founder separately authorized this unit with eight additional binding behavioral rules (outcome-type allow-list limited to `interview_completed`/`hired`; interview multiplicity with single-conversion top-line counting; at most one active `hired` event per application with `status = 'accepted'` never implying hired; append-only correction via void + optional replacement, added only if proven necessary; employer-only writes with `auth.uid()`-derived actor and no candidate/operator write path; a narrow candidate-safe read; a 30-day backdating / negligible-future-skew window with DB-generated `recorded_at`; and continued enforcement of the existing deleted-candidate gate for any new outcome writes).

**Discovery findings:** re-inspection of `application_status_history`, `admin_audit_events`, and the Slice 7/8 append-only conventions found zero precedent anywhere in this schema for a row-to-row correction-link column (`replacement_for`/`supersedes`) — every existing correction pattern is "current-state + append-only history," never an explicit link between two history rows (verification revoke/re-request, employer suspension/unsuspend, vacancy moderation/restore all follow this shape). The partial unique index that enforces at-most-one-active-`hired` already guarantees a replacement hire can only be inserted once the mistaken one is voided, with no explicit link needed to prove the correction happened — so `replacement_for` is **omitted by design**, not deferred. `transition_current_employer_application_status` (D-070/D-087) established the exact precedent this unit reuses for both writes and voids: an unknown application, a cross-employer application, and a deleted candidate's application all collapse to one `unavailable` result inside a single ownership `EXISTS`, with no separate discriminant for "deleted" — applied identically here to `record_application_outcome` and, per the same D-087 reasoning, to `void_application_outcome` too (employer mutation access to a deleted candidate's application stops entirely, not only for new facts). No conflict was found between the eight founder rules, the existing deletion/RLS conventions, and the append-only history conventions already in place — implementation proceeded on that basis.

**Decision:** add one additive migration (the 19th, `20260810020000_application_outcome_events_contract.sql`) containing:

- `public.application_outcome_events` — append-only: `id`, `application_id` (FK, `on delete cascade`), `outcome_type` (`interview_completed`/`hired` only), `occurred_at`, `recorded_at` (`clock_timestamp()` default, never RPC-accepted), `recorded_by`/`voided_by` (FKs to `auth.users`, no `ON DELETE` clause — safe because Slice 8 deletion soft-deletes `auth.users` via `deleteUser(id, true)`, never hard-deletes it), `voided_at`. A partial unique index enforces at most one active `hired` row per application; a plain index supports chronological reads. RLS enabled with **zero grant** to `anon`/`authenticated` — matching `application_status_history`/`admin_audit_events` exactly, purely grant-based immutability, no trigger. `_outcome_occurred_at_window_valid(occurred_at, recorded_at)` is a pure, `immutable`, now()-free two-argument SQL function reused as both a table `CHECK` and the RPC's own rejection path, avoiding the historical-instability problem a direct `now()`-referencing `CHECK` would create.
- `record_application_outcome(application_id, outcome_type, occurred_at)` — employer write. Identity from `auth.uid()` only; requires a completed, non-suspended, non-deleted employer profile; validates `outcome_type` and the 30-day/5-minute `occurred_at` window before insert; ownership + deleted-candidate gate proven in one `EXISTS` (D-070/D-087 pattern); a second active `hired` attempt is caught as `unique_violation` and reported as `already_hired`, never a raw constraint error.
- `void_application_outcome(outcome_event_id)` — employer correction, same gate as record. A repeat void reports `already_voided` (both via a pre-check and a race-safe re-check on the `UPDATE`'s own `WHERE voided_at is null`), never a silent no-op or a false `ok`. Original event columns are never modified — only `voided_at`/`voided_by` are ever set, once.
- `candidate_application_outcomes(application_id)` — candidate-safe read. Ownership via `applications.candidate_id = auth.uid()`; structurally excludes every privileged column via its `RETURNS TABLE (outcome_type, occurred_at)` shape — there is no raw-table grant a candidate could use to see more (D-M5-12).
- `employer_application_outcomes(application_id)` — employer read, bounded to one owned application (never cross-application/analytics). Includes voided events (so a future correction UI can show history and target the right event) but omits `recorded_by`/`voided_by` — always "the calling employer themselves" in this single-actor-per-account product.

Outcome events are **not** duplicated into `admin_audit_events`: that ledger is documented operator/admin-action history; the outcome table is itself the authoritative append-only business record (`docs/50` §9). No candidate PII is stored in the table (`application_id` + `outcome_type` + timestamps + auth actor ids only), so no export/deletion RPC required a change.

**Explicitly not changed:** `applications.status` and its transition RPC are untouched — recording `hired` never rewrites `status`, and setting `status = 'accepted'` never creates a hired event (proven in pgTAP and E2E). No new outcome types, no scheduling/invitation/offer/no-show/free-text/rejection-reason representation, no operator override, no automatic status coupling. `docs/50` §11 also describes an expected future direction for candidate/employer data export to include outcome facts; the founder's Unit D authorization scoped this unit to database/authorization/RPC/typegen/test-infra only (UI-adjacent work, including Unit E's outcome-recording UI, is explicitly out of scope here) — export integration is deferred as a named follow-up, not silently dropped.

**Production migration-rehearsal note:** this unit did not re-run the full synthetic-data 5→N Production-migration-compatibility rehearsal previously performed for the 5→17 gap. That rehearsal is a separate Production-readiness exercise; Unit D's migration was proven locally as a clean, purely additive 19th migration (`supabase db reset` from empty through all 19 migrations, zero errors) and follows the exact additive-only shape every migration since Slice 5 has used, but a dedicated 5→19 synthetic-data hosted rehearsal was not performed as part of this unit. (The intervening 18th migration is an unrelated baseline CI-determinism stabilization fix, `20260810010000_stabilize_deletion_claim_timestamp.sql`, merged separately before Unit D was synchronized onto it.)

**Required exit proof:** 48 pgTAP assertions in `supabase/tests/database/34_application_outcome_events_contract_test.sql` (schema/grants, authorization, interview multiplicity, hire uniqueness + void/replacement, temporal validity, void authorization/idempotency, deleted-candidate gate, candidate-safe reads, employer reads, accepted-vs-hired separation) — full suite 35 files / 1515 tests, all passing. `e2e/application-outcome-events-journey.spec.ts` (3 tests, real authenticated RPC calls against local Supabase, gated behind `E2E_AUTH_JOURNEY` and wired into the Schema/RLS CI job immediately after Units A1/B/C): the full record → void → replace → read journey across employer/candidate boundaries; unrelated-employer denial across record/void/read; the deleted-candidate gate exercised through the existing Slice 8 self-service deletion UI (no new service-role path), proving no new event can be recorded or voided post-deletion while the historical event remains employer-readable. Generated types regenerated and confirmed idempotent (no drift). `pilot-funnel.ts` minimally extended with an `outcome` domain (`interview_conversions`, `confirmed_hires`) matching the M5 measurement semantics table below exactly, proven both in Vitest and by running `pnpm proof:pilot-funnel` against local Supabase.

**Consequences:** migration count 18 → 19. New table `application_outcome_events` and four new RPCs (`record_application_outcome`, `void_application_outcome`, `candidate_application_outcomes`, `employer_application_outcomes`). `pilot-funnel.ts`/`pilot-funnel.test.ts`/`pilot-funnel-static-security.test.ts` updated for the new `outcome` domain (5 → 6 metric-query blocks, 16 → 18 total documented metrics). No UI, no new dependency, no Production/Preview/hosted mutation, no service-role secret added. Outcome-recording/void UI remains Unit E's scope.

## M5 measurement semantics summary

| Metric | Top-level counting rule |
|---|---|
| Participating employers | Unique employer whose onboarding completed, verification was verified, and at least one own employer-submitted vacancy became effective-public during M5; historical once counted |
| Verified vacancies | Unique employer-submitted vacancy that became effective-public at least once during M5 while employer verified; historical once counted |
| Candidates | Unique completed-onboarding candidate in the M5 cohort; pre-existing completed candidates require explicit cohort enrollment |
| Completed interviews | Unique applications with at least one active, non-voided `interview_completed` event |
| Confirmed hires | Unique applications with at least one active, non-voided `hired` event |

Current active/safe employers and current effective-public vacancies are operational supply metrics and must not replace the cumulative beta target metrics.

## Beta feature boundary

The broader product direction remains documented in `docs/04-mvp.md`, `docs/09-roadmap.md`, and `NOT_NOW.md`.

Starting M5 does not mean those capabilities were permanently rejected. It means they do not block Cohort A unless beta evidence changes the decision.

## Implementation authorization boundary

This M5.0 unit authorizes **documentation/discovery only**.

It does not authorize:

- outcome schema/migrations/RPCs/UI;
- Sentry configuration;
- Preview environment setup;
- Production mutation;
- legal-text publication;
- broader product expansion.

Any product/schema implementation must be selected explicitly after this PR's final founder review/merge.

### D-M5-23 — Governed product-development unfreeze

**Status:** Approved

**Accepted:** 2026-09-03

**Context:** The Founder explicitly ended the blanket M5 feature freeze so the post-submission waiting period can be used for product discovery, UX architecture, Figma design, prioritisation, and selective implementation. The GründungsBONUS Plus project-start boundary remains closed independently.

**Decision:** D-M5-1 and D-M5-6 remain historical records of the initial Cohort A entry boundary, but no longer impose a blanket product-development freeze. New ideas are classified as **BUILD NOW**, **DESIGN / SPEC NOW**, **WAIT FOR BETA**, or **PARK / REJECT**. Design/specification may proceed without implying implementation. A BUILD NOW item still requires a bounded issue or work unit and explicit Founder approval; it is not authorized merely because it was proposed or designed.

Accepted anti-goals, security/privacy/legal constraints, narrower implementation contracts, and production/hosted-change gates remain authoritative until separately revised. High-risk capabilities such as full realtime chat, public bilateral reviews, identity-document verification, payments/payroll, staffing-agency operations, native applications, and broad analytics remain evidence- or decision-gated rather than automatically promoted.

This decision does **not** authorize provider outreach, procurement, paid campaigns, Cohort A external market entry, grant-targeted external work, Production Sentry activation, hosted mutations, or any expenditure intended for grant reimbursement. Until the safe funding boundary is evidenced or clarified, personally implemented product work must be recorded in its issue/PR as **Founder-developed / pre-funding / excluded from grant reimbursement** and must not later be represented as an external funded deliverable.

**Consequences:** Product work may now move through discovery → classification → Figma → bounded GitHub issue → implementation → Founder-reviewed PR. Durable repository docs change only when a lasting decision changes. No feature receives automatic implementation priority from this unfreeze.

## Remaining founder decisions

All previously listed M5.0 founder-review decisions are resolved by D-M5-8 through D-M5-18.

The next founder decision should occur only when selecting the first post-M5.0 work unit — PR #74 is merged.
