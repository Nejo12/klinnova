# M5 Beta Transition and Measurement

## Status

**M5.0 — Approved founder decisions recorded; merged (PR #74).**

M4 is complete. Slice 8 is complete. M5 — Berlin private beta — is the active milestone.

This document defines the initial M5 beta boundary and authoritative top-level counting semantics. It does not authorize product/schema/runtime implementation by itself.

## M5 objective

Operate Stint as a controlled Berlin private beta and validate whether the current product can create real employment outcomes without broad feature expansion.

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

## Remaining founder decisions

All previously listed M5.0 founder-review decisions are resolved by D-M5-8 through D-M5-18.

The next founder decision should occur only when selecting the first post-M5.0 work unit — PR #74 is merged.
