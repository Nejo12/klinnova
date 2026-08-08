# Founder Dashboard

Operating view for the active phase. Keep this file concise and current.

Product scope: `docs/04-mvp.md`.
Delivery/phase plan: `docs/13-implementation-plan.md`.
M5 boundary/metrics: `docs/49-m5-beta-transition-and-measurement.md`.
M5 outcome proposal: `docs/50-m5-outcome-contract-proposal.md`.
M5 operating plan: `docs/51-m5-operating-plan.md`.
Deferred ideas: `NOT_NOW.md`.
Historical slice detail remains in the individual discovery/build-plan/closure documents rather than this dashboard.

## Current focus

| Field | Current state |
|---|---|
| Active milestone | **M5 — Berlin private beta** |
| Previous milestone | **M4 — Complete** (Slices 7–8 closed; PR #73 merged) |
| Product boundary | Merged M4 implementation under D-M5-1 feature freeze |
| Active work unit | M5.0 — beta transition + measurement contract + operating plan (docs/discovery only) |
| Product/schema implementation | **Not authorized by M5.0** |
| Preview | Intentionally unconfigured; isolated Preview restoration is beta-readiness work before systematic external testing |
| Production | Existing production remains the live environment; no M5.0 product/schema mutation |
| Hosted destructive proof | Not authorized / not run |
| Demo fixture deadline | Remove or explicitly re-authorize retained Production Demo fixtures by **2026-09-02** |
| Monitoring | Minimal privacy-conscious Sentry planned before Cohort A external traffic; no PostHog/session replay |
| Legal readiness | Privacy/Terms/Impressum require external-facing beta readiness review/ownership |

## M5 targets

| Metric | Full M5 target | Current definition status |
|---|---:|---|
| Participating employers | 20 | Proposed precise definition in `docs/49`; founder approval pending |
| Verified vacancies | 100 | Proposed precise definition in `docs/49`; founder approval pending |
| Candidates | 200 | Proposed precise definition in `docs/49`; founder approval pending |
| Completed interviews | 10 | Approved: employer records that an application-related interview actually took place |
| Confirmed hires | 3 | Approved: employer records candidate hired for vacancy; `accepted` status alone never counts |

## Staged cohorts

| Cohort | Employers | Legitimate vacancies | Candidates | Outcome gate |
|---|---:|---:|---:|---|
| A — Proof | 3–5 | 10–20 | 20–30 | first completed interview |
| B — Validation | 8–10 | 30–50 | 60–100 | repeated interviews + first confirmed hire |
| C — Full M5 | 20 | 100 | 200 | 10 completed interviews + 3 confirmed hires |

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

## Current M5.0 deliverables

- [x] Slice 8 marked complete
- [x] M4 marked complete
- [x] M5 marked active
- [x] Beta scope freeze recorded
- [x] Staged Cohorts A/B/C recorded
- [x] Completed-interview definition recorded
- [x] Confirmed-hire definition recorded
- [x] Separate outcome-model direction recorded
- [x] CV/save-job Cohort A freeze recorded
- [x] Minimal-Sentry direction recorded
- [x] M5 operating plan drafted
- [x] Outcome data-contract proposal drafted
- [ ] Founder approves employer/vacancy/candidate counting semantics
- [ ] Founder approves interview multiplicity rule
- [ ] Founder approves Cohort A employer wedge
- [ ] Founder approves outcome correction/candidate-visibility details
- [ ] Founder approves Sentry retention/region/PII settings
- [ ] Founder assigns legal-page readiness owner/gate

## Immediate beta-readiness queue after M5.0 approval

This is a planning queue, not automatic authorization.

### Product / measurement

1. Approve exact top-line M5 counting semantics.
2. Approve the separate interview/hire outcome contract.
3. If authorized, implement only the smallest outcome-measurement contract and UI necessary to trust M5 interview/hire metrics.

### Infrastructure

1. Restore an isolated Preview environment before systematic external testing.
2. Add minimal privacy-conscious Sentry error monitoring before Cohort A external traffic.
3. Remove/re-authorize retained Production Demo fixtures by 2026-09-02.

### Operations

1. Approve Cohort A employer segment.
2. Prepare employer/candidate recruitment channels.
3. Assign legal-page readiness responsibility.
4. Establish founder-assisted onboarding/support channel.
5. Run weekly funnel/blocker review during active cohorts.

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

Do not optimize M5 for larger test counts. The primary M5 numbers are employers, legitimate vacancies, completed candidate onboarding, applications, completed interviews, and confirmed hires.

## Completed implementation milestones

| Milestone | Status | Evidence |
|---|---|---|
| M0 Foundation | Complete | Slice 0 |
| M1 Candidate matching shell | Complete | Slices 1–2 |
| M2 Applications | Complete | Slice 3 |
| M3 Employer flow | Implementation complete | Slices 4–6; Slice 6 hosted proof remains separately deferred |
| M4 Trust and beta readiness | **Complete** | Slices 7–8; `docs/44`, `docs/48`; PR #73 |
| M5 Berlin private beta | **Active** | `docs/49`–`docs/51` |

## Decision discipline

D-001–D-090 remain in `docs/10-decisions.md`.
Founder-approved M5 operating/measurement decisions D-M5-1 onward are recorded in `docs/49-m5-beta-transition-and-measurement.md` during the beta phase.

Normal beta fixes use evidence-first lightweight delivery. Changes affecting schema/database, authorization/RLS, privacy, security, matching authority, employment/legal boundaries, or major architecture require explicit discovery and founder approval before implementation.
