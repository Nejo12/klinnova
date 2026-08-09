# Founder Dashboard

Operating view for the active phase. Keep this file concise and current.

Product scope: `docs/04-mvp.md`.
Delivery/phase plan: `docs/13-implementation-plan.md`.
M5 boundary/metrics: `docs/49-m5-beta-transition-and-measurement.md`.
M5 outcome proposal: `docs/50-m5-outcome-contract-proposal.md`.
M5 operating plan: `docs/51-m5-operating-plan.md`.
Deferred ideas: `NOT_NOW.md`.
Historical slice detail remains in the individual discovery/build-plan/closure documents.

## Current focus

| Field | Current state |
|---|---|
| Active milestone | **M5 — Berlin private beta** |
| Previous milestone | **M4 — Complete** (Slices 7–8 closed; PR #73 merged) |
| Product boundary | Merged M4 implementation under D-M5-1 feature freeze |
| Active work unit | M5.1 — beta readiness closure (Unit A1 merged: publication/matching integrity, PR #76/#77; Unit B: candidate navigation/account IA, PR pending merge) |
| PR | #74 — M5.0 merged |
| Product/schema implementation | M5.1 product/schema work proceeds only through explicitly approved bounded units (e.g. Unit A1, Unit B); Production changes remain separately authorized |
| Preview | Intentionally unconfigured; isolated Preview restoration is beta-readiness work before systematic external testing |
| Production | Existing production remains live; no M5.0 product/schema mutation |
| Hosted destructive proof | Not authorized / not run |
| Demo fixture deadline | Remove or explicitly re-authorize retained Production Demo fixtures by **2026-09-02** |
| Monitoring | Minimal privacy-conscious Sentry approved before intentional Cohort A external traffic; not configured in M5.0 |
| Legal readiness | Founder-owned qualified German legal review/finalization gate before intentional Cohort A external traffic |

## M5 targets and approved definitions

| Metric | Full M5 target | Approved top-level counting rule |
|---|---:|---|
| Participating employers | 20 | Unique employer with completed onboarding + verified state + at least one employer-submitted vacancy effective-public during M5; historical once counted |
| Verified vacancies | 100 | Unique employer-submitted vacancy effective-public at least once during M5 while employer verified; historical once counted |
| Candidates | 200 | Unique authoritative completed-onboarding candidate in cohort; pre-existing completed candidate requires explicit M5 cohort enrollment |
| Completed interviews | 10 | Distinct applications with >=1 active non-voided `interview_completed` event; additional rounds do not increment top-line target |
| Confirmed hires | 3 | Distinct applications with an active employer-recorded `hired` event; `accepted` status alone never counts |

Track current active/safe employers and current effective-public vacancies separately from the historical cumulative target metrics.

## Staged cohorts

| Cohort | Employers | Legitimate vacancies | Candidates | Outcome gate |
|---|---:|---:|---:|---|
| A — Proof | 3–5 | 10–20 | 20–30 | first completed-interview conversion |
| B — Validation | 8–10 | 30–50 | 60–100 | repeated completed-interview conversions + first confirmed hire |
| C — Full M5 | 20 | 100 | 200 | 10 completed-interview conversions + 3 confirmed hires |

## Cohort A wedge

Cleaning-first is approved.

Allow only **1–2 adjacent low-language-barrier employers** when founder access is strong and the hiring model remains simple. Do not deliberately run a broad multi-sector Cohort A.

## M5 scope freeze

Do not introduce without beta evidence:

- chat/messaging;
- native apps;
- reviews/ratings;
- AI matching surfaces;
- embeddings/vector search;
- payroll/payments;
- subscriptions/billing;
- full ATS functionality;
- video interviewing;
- multi-city expansion;
- unrestricted scraping;
- CV upload;
- save/unsave jobs;
- sophisticated analytics dashboards;
- PostHog/session replay.

A change may enter active work only when it is required to measure the beta, removes an observed blocker, fixes a bug/accessibility/security/privacy problem, or is necessary for safe beta operation.

## M5.0 deliverables

- [x] Slice 8 marked complete
- [x] M4 marked complete
- [x] M5 marked active
- [x] Beta scope freeze recorded
- [x] Staged Cohorts A/B/C recorded
- [x] Participating-employer definition approved
- [x] Verified-vacancy definition approved
- [x] Candidate definition approved
- [x] Completed-interview top-line counting approved
- [x] Confirmed-hire definition approved
- [x] Separate outcome-model direction approved
- [x] Candidate-safe outcome visibility approved
- [x] Append-only void/replacement correction approved
- [x] Deleted-candidate outcome freeze approved
- [x] 30-day outcome backdating policy approved
- [x] Cleaning-first Cohort A wedge approved
- [x] CV/save-job Cohort A freeze approved
- [x] Minimal-Sentry boundary approved
- [x] Founder-owned legal-readiness gate approved
- [x] Weekly operating cadence approved
- [x] M5 operating plan drafted
- [x] Outcome data-contract proposal drafted
- [x] Final founder review of updated PR #74
- [x] Merge PR #74

## Immediate beta-readiness queue after M5.0 merge

This is a planning queue, **not automatic authorization**.

### Product / measurement

1. Select and explicitly authorize the smallest outcome-measurement implementation unit if founder chooses it as the next work item.
2. Preserve workflow/outcome separation and the approved M5 counting semantics.

### Infrastructure

1. Restore an isolated Preview environment before systematic external testing.
2. Configure approved minimal Sentry before intentional Cohort A external traffic.
3. Remove/re-authorize retained Production Demo fixtures by 2026-09-02.

### Operations

1. Prepare cleaning-first employer acquisition with the 1–2 adjacent-employer exception only where justified.
2. Prepare candidate recruitment channels.
3. Complete founder-owned qualified German legal review/finalization gate.
4. Establish support/contact channel and founder-assisted onboarding.
5. Run one structured weekly M5 review using `Operate manually / Fix now / Watch / Defer`.

### UX / readiness backlog (not folded into Unit A1)

1. `/employer` renders two exact-text "Vacancies" links (the shared `EmployerVacancyPageHeader` nav link and the employer-home body button, both introduced/renamed by PR #75) — deeper gated E2E specs (`E2E_AUTH_JOURNEY=1`) that select by exact accessible name hit a strict-mode ambiguity. Not yet a demonstrated user-facing blocker; not a publication/matching integrity issue. Address alongside Unit B or Unit I remediation — do not rename UI solely to satisfy the selector, and do not weaken the affected tests with an arbitrary `.first()`; target the intended nav region/link context instead. Discovered because this was the first session run of the full gated E2E suite — these specs are not part of CI's own `pnpm test:e2e` (smoke-tier only), so this predates M5.1 and was previously unobserved.

## Cohort A readiness gates

Before intentional external Cohort A traffic:

- qualified German legal review/finalization of Impressum/business identity, Privacy notice, beta Terms, support/contact channel, and Sentry disclosure if required;
- minimal Sentry configured within the approved privacy boundary;
- isolated Preview available for systematic external testing of iterative builds;
- technical/moderation/privacy support procedures understood;
- demo-fixture cleanup deadline tracked.

This gate does not establish or claim full GDPR compliance.

## Baseline engineering state at M4 closure

| Proof | Closure result |
|---|---|
| Migrations | 16 |
| pgTAP | 1441/1441 across 33 files |
| Vitest | 983 passed / 3 skipped |
| Broad E2E | 38/38 |
| Build | PASS |
| Generated DB types | no drift |
| Slice 8 local exit proof | PASS — `docs/48-slice-8-exit-proof.md` |

Do not optimize M5 for larger test counts. The primary M5 numbers are participating employers, legitimate vacancies, completed candidate onboarding, applications, completed-interview conversions, and confirmed hires.

## Completed implementation milestones

| Milestone | Status | Evidence |
|---|---|---|
| M0 Foundation | Complete | Slice 0 |
| M1 Candidate matching shell | Complete | Slices 1–2 |
| M2 Applications | Complete | Slice 3 |
| M3 Employer flow | Implementation complete | Slices 4–6; Slice 6 hosted proof remains separately deferred |
| M4 Trust and beta readiness | **Complete** | Slices 7–8; `docs/44`, `docs/48`; PR #73 |
| M5 Berlin private beta | **Active** | `docs/49`–`docs/51`; PR #74 M5.0 merged; M5.1 beta-readiness closure in progress |

## Decision discipline

D-001–D-090 remain in `docs/10-decisions.md`.
Founder-approved M5 operating/measurement decisions D-M5-1–D-M5-20 are recorded in `docs/49-m5-beta-transition-and-measurement.md`.

Normal beta fixes use evidence-first lightweight delivery. Changes affecting schema/database, authorization/RLS, privacy, security, matching authority, employment/legal boundaries, or major architecture require explicit discovery and founder approval before implementation.
