# M5 Beta Transition and Measurement

**Status:** M5.0 discovery / founder review

**Date:** 2026-08-09

**Authoritative base:** `main` at `7a92e31fc25b3fe7d33d10fe7ffa5c5dd5a47789` (PR #73 merge commit)

Related sources:

- MVP scope: `docs/04-mvp.md`
- Roadmap: `docs/09-roadmap.md`
- Decisions: `docs/10-decisions.md`
- Anti-goals: `docs/11-anti-goals.md`
- Implementation plan: `docs/13-implementation-plan.md`
- Founder dashboard: `docs/14-founder-dashboard.md`
- Slice 8/M4 closure proof: `docs/48-slice-8-exit-proof.md`
- M5 outcome-contract proposal: `docs/50-m5-outcome-contract-proposal.md`
- M5 operating plan: `docs/51-m5-operating-plan.md`

## 1. Transition state

PR 8.1 through PR 8.5 are merged. Slice 8 is complete. M4 — Trust and beta readiness — is complete. The active milestone is now **M5 — Berlin private beta**.

M5 is an operating/validation phase, not a new broad implementation milestone. The product boundary for Cohort A is the merged M4 application unless real beta evidence demonstrates that a change is required.

The overall M5 targets remain:

- 20 participating employers
- 100 verified vacancies
- 200 candidates
- 10 completed interviews
- 3 confirmed hires

## 2. Founder-approved M5 decisions

The following decisions were explicitly approved by the founder on 2026-08-09. They use an M5-specific decision namespace because they govern beta operation and measurement rather than reopening the implementation decisions D-001–D-090.

### D-M5-1 — Beta scope freeze

**Status:** Approved

The merged M4 implementation is the minimum product boundary for the initial M5 Berlin private beta. Capabilities deliberately deferred during implementation do not block beta unless observed beta evidence shows they are required.

A new capability may enter the active beta backlog only when it:

1. is required to measure the beta;
2. removes an observed blocker for a real beta user;
3. fixes a bug, accessibility, security, or privacy problem; or
4. is necessary for safe beta operation.

Normal beta fixes use the lightweight loop:

> Observe problem → confirm it matters → smallest fix → test → deploy → observe again.

Heavier discovery/decision work remains required for schema/database, authorization/RLS, privacy, security, matching authority, employment/legal boundaries, or major architecture changes.

### D-M5-2 — Completed interview metric

**Status:** Approved

An interview counts toward M5 only when an application-related interview is recorded by the employer as having **actually taken place**. An invitation, proposal, or scheduled interview alone does not count.

### D-M5-3 — Confirmed hire metric

**Status:** Approved

A confirmed hire counts when the employer records that the candidate was hired for the vacancy. Existing application status `accepted` must **not** automatically count as a confirmed hire.

Candidate confirmation may be considered later but is not required for the initial private beta.

### D-M5-4 — Outcome model direction

**Status:** Approved

Interview/hire outcomes are conceptually separate from application workflow status. M5.0 may investigate and propose the smallest trustworthy outcome contract, but it does not authorize a schema or runtime implementation.

### D-M5-5 — Error monitoring direction

**Status:** Approved

Plan minimal, privacy-conscious Sentry error monitoring before Cohort A external beta traffic. Do not introduce PostHog, session replay, or a broader observability platform as part of this decision.

### D-M5-6 — CV/save-job beta freeze

**Status:** Approved

Optional CV upload and save/unsave jobs do not block the initial Berlin private beta. They remain deferred product capabilities and may be reconsidered only with beta evidence.

This resolves the apparent ambiguity in `docs/04-mvp.md`: those capabilities remain longer-term MVP/product intent, but they are not part of the **initial M5 beta entry gate**.

### D-M5-7 — Staged beta cohorts

**Status:** Approved

Operate M5 through three staged cohorts rather than attempting the full target immediately.

| Cohort | Employers | Legitimate vacancies | Candidates | Outcome target |
|---|---:|---:|---:|---|
| A — Proof | 3–5 | 10–20 | 20–30 | first completed interview |
| B — Validation | 8–10 | 30–50 | 60–100 | repeated interviews + first confirmed hire |
| C — Full M5 | 20 | 100 | 200 | 10 completed interviews + 3 confirmed hires |

Cohort expansion is evidence-gated. Cohort B should not begin merely because a calendar date arrives; Cohort A should first demonstrate that the core journey can produce a completed interview without a critical unresolved trust, usability, privacy, or operational blocker.

## 3. Initial M5 feature freeze

The following are explicitly **not Cohort A work without beta evidence**:

- real-time chat or messaging
- native applications
- public reviews/ratings
- AI matching surfaces
- embeddings/vector search
- payroll/payments
- employer subscriptions/billing
- full ATS functionality
- video interviews
- multi-city expansion
- broad/unrestricted scraping
- optional CV upload
- save/unsave jobs
- sophisticated analytics dashboards
- PostHog/session replay

These are deferred, not necessarily rejected forever. Promotion requires beta evidence and the repository's normal scope/decision discipline.

## 4. Proposed M5 counting semantics — founder review required

The founder has approved the interview and hire definitions above. Three remaining top-line metrics still need exact counting semantics so the M5 dashboard cannot drift into vanity metrics.

### P-M5-1 — Participating employer

**Proposed definition:** count one unique employer profile when all of the following have occurred during M5:

1. employer onboarding is complete;
2. employer verification state is `verified` at the time of participation; and
3. the employer owns at least one employer-submitted vacancy that has reached effective-public visibility during M5.

Count a qualifying employer once for the M5 program even if they later pause/withdraw a vacancy or verification is later revoked. Safety/moderation state remains visible separately and must not be hidden by the historical participation count.

**Reason:** registration alone is not marketplace participation; this definition measures employers that supplied at least one legitimate public opportunity.

### P-M5-2 — Verified vacancy

There is no separate `vacancy_verification_state` in the merged model; verification belongs to the employer and public visibility is governed by the effective-public predicate.

**Proposed definition:** count one unique employer-submitted vacancy when it has been effective-public at least once during M5 while its employer was verified. A vacancy counts once, not once per publish/resume/renew cycle.

Do not count:

- seed/demo vacancies;
- drafts that never became effective-public;
- vacancies hidden by an unverified employer at first publication attempt;
- moderated/unsafe rows that never legitimately reached effective-public visibility.

If a previously-counted vacancy is later moderated or withdrawn, retain the historical unique-vacancy count but report current active/effective-public supply separately.

### P-M5-3 — Candidate

**Proposed definition:** count one unique candidate identity when essential onboarding reaches the authoritative completed state during M5, or when a pre-existing completed candidate explicitly participates in an M5 cohort and is included in the cohort roster.

Raw registrations do not count as M5 candidates.

**Reason:** the product only becomes useful for matching after essential onboarding. Counting uncompleted registrations would inflate the beta metric without representing a usable candidate participant.

### Completed interview

Approved D-M5-2 governs this metric. Proposed counting detail still requiring founder review:

- count each non-voided employer-recorded `interview_completed` outcome event;
- an application may therefore contribute more than one completed interview if multiple distinct interview rounds actually occurred.

Alternative: count at most one completed-interview conversion per application. See Remaining founder decisions below.

### Confirmed hire

Approved D-M5-3 governs this metric.

Proposed counting detail:

- at most one active confirmed-hire outcome per application;
- count the application once when the owning employer records `hired`;
- application status `accepted` remains analytically separate and cannot increment this metric by itself.

## 5. M5 funnel

The beta funnel should distinguish stock metrics from conversion/outcome metrics.

### Supply / participation

- participating employers
- verified employers currently active
- verified vacancies ever effective-public during M5
- vacancies currently effective-public

### Candidate funnel

- candidate registrations (diagnostic only)
- completed candidate onboarding (**M5 candidate count**)
- candidates with at least one current match
- candidates with at least one submitted application

### Recruitment funnel

- applications submitted
- applications reviewed (`reviewing` or later)
- applications shortlisted
- completed interview events
- confirmed hire events

The existing `proof:pilot-funnel` remains useful as deterministic local proof, but production M5 measurement must not silently redefine a metric simply because the existing script does not yet expose it. Outcome metrics are added only after an approved outcome contract exists.

## 6. M5 entry gates

### Cohort A may begin operational preparation now

Founder/employer/candidate recruitment preparation, outreach planning, manual onboarding preparation, and beta-process setup do not require new product implementation.

### Before systematic external Cohort A traffic

The beta-readiness plan must address:

- isolated Preview environment for systematic external testing;
- minimal privacy-conscious Sentry configuration;
- external-facing legal-page review/readiness;
- documented technical and moderation incident response;
- Production demo-fixture cleanup/re-authorization by 2026-09-02.

### Outcome measurement implementation

A separate implementation PR may be authorized only after founder review of `docs/50-m5-outcome-contract-proposal.md` and the remaining measurement decisions in this document.

## 7. Remaining founder decisions

The M5.0 discovery leaves these decisions open intentionally:

1. **Employer count:** approve/revise P-M5-1's requirement that a participating employer must have had at least one effective-public vacancy.
2. **Vacancy count:** approve/revise P-M5-2's “effective-public at least once” historical unique-vacancy definition.
3. **Candidate count:** approve/revise P-M5-3's completed-onboarding definition, including treatment of pre-existing candidates.
4. **Interview multiplicity:** should two completed interview rounds for one application count as two M5 completed interviews, or should the metric cap at one interview conversion per application?
5. **Cohort A employer wedge:** approve the proposed cleaning-first segment in `docs/51-m5-operating-plan.md` or deliberately broaden Cohort A.
6. **Sentry retention/region/config:** approve the minimal configuration proposed in `docs/51` before any integration PR.
7. **Legal readiness owner:** determine who reviews/finalizes Privacy/Terms/Impressum before external beta traffic and what constitutes the launch gate.

## 8. M5.0 exit

M5.0 is complete when:

- repository status reflects Slice 8 complete / M4 complete / M5 active;
- the approved M5 beta boundary and staged cohorts are recorded;
- M5 metric definitions are approved;
- the separate outcome-contract direction is approved or revised;
- the operating plan is approved;
- beta-readiness responsibilities are assigned;
- no product/schema implementation has been silently introduced by this discovery unit.
