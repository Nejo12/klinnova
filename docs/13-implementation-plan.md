# Stint Implementation Plan

## Objective

Deliver and validate the smallest production-capable version of Stint that allows a candidate to create a lightweight profile, receive suitable Berlin job matches, and submit an application, while allowing an employer to publish a verified vacancy and review applicants.

Product scope remains defined by `docs/04-mvp.md`. This plan defines delivery order and the current operating phase for a solo founder.

## Delivery rules

### Implementation phase (Slices 0–8)

- Build vertical slices, not frontend/backend layers and not micro-task checklists.
- Each slice includes the UI, data, validation, authorization, tests, and observability needed to ship.
- Prefer deterministic, explainable rules over opaque automation.
- Treat accessibility, privacy, authorization, and verification as core requirements.
- Do not add features because a framework or agent makes them easy.
- Park non-urgent ideas in `NOT_NOW.md` without changing product scope.
- Every pull request must leave the product deployable.

### M5 beta phase

M5 is operational and product-led. The default beta loop is:

> Observe problem → confirm it matters → smallest fix → test → deploy → observe again.

D-M5-23 replaces the blanket feature freeze with governed product development. New ideas move through discovery and are classified as **BUILD NOW**, **DESIGN / SPEC NOW**, **WAIT FOR BETA**, or **PARK / REJECT**. Only a bounded, explicitly Founder-approved work unit may enter implementation.

Use heavier discovery/decision planning for schema/database, authorization/RLS, privacy, security, matching authority, employment/legal boundaries, or major architecture changes. Founder-built work before the safe funding boundary must be labelled **Founder-developed / pre-funding / excluded from grant reimbursement**.

M5 boundary/measurement: `docs/49-m5-beta-transition-and-measurement.md`.
Outcome-contract proposal: `docs/50-m5-outcome-contract-proposal.md`.
Operating plan: `docs/51-m5-operating-plan.md`.
Current M5.1 execution/readiness state: `docs/53-m5.1-beta-readiness-closure.md`.

## Recommended stack

- Next.js App Router
- React and strict TypeScript
- SCSS Modules and CSS custom properties
- Supabase PostgreSQL, Auth, Storage, and Row Level Security
- React Hook Form and Zod
- Resend and React Email where evidence/approved scope requires it
- Vitest, Testing Library, MSW, and Playwright
- GitHub Actions and Vercel
- Minimal privacy-conscious Sentry error monitoring is approved for Cohort A readiness; PostHog/session replay remain deferred

## Vertical slices

Historical slice-specific contracts remain authoritative in their referenced discovery/build-plan/proposal/closure documents. This file keeps current high-level status rather than duplicating every merged PR detail.

### Slice 0 — Engineering foundation

**Outcome:** deployable, tested application shell with Stint design tokens and reproducible local setup.

**Status:** Complete — PR 0.1–0.4 merged.

### Slice 1 — Registration to persisted onboarding

**Outcome:** a candidate can register and complete essential onboarding with durable progress.

**Status:** Complete. Planning: `docs/16-slice-1-build-plan.md`, `docs/17-slice-1-schema-proposal.md`; D-018–D-025 Accepted.

### Slice 2 — Onboarding to seeded matches

**Outcome:** after essentials, a candidate sees deterministic, explainable matches against seeded vacancies.

**Status:** Complete — PR #26–#29; closure `docs/21-slice-2-closure.md`; D-026–D-033 Accepted.

Accepted narrowing remains authoritative: experience is excluded from current eligibility/matching; travel minutes are not an eligibility/ranking factor; Berlin is the hard geographic boundary; matching is deterministic and explainable.

### Slice 3 — Job detail to submitted application

**Outcome:** a candidate can evaluate a vacancy and apply through Stint.

**Status:** Complete — PR #33–#37; closure `docs/27-slice-3-closure.md`; D-035–D-045 Accepted.

Current product includes authenticated candidate job detail, profile-based atomic submit, reload-safe confirmation, duplicate safety, and application snapshots. Save/unsave and optional CV upload remain deferred under D-M5-6 and do not block Cohort A.

### Slice 4 — Employer registration to draft vacancy

**Outcome:** a private or organisation employer can register, create an employer profile, and save a structured draft vacancy.

**Status:** Complete — PR #41–#45; closure `docs/33-slice-4-closure.md`; D-046–D-054 Accepted.

### Slice 5 — Employer verification to public vacancy

**Outcome:** only verified employers can publish public vacancies.

**Status:** Complete — verification, operator review, lifecycle controls, public discovery, canonical candidate eligibility, and candidate discovery/application integration merged through PR #58; D-055–D-069 Accepted.

Preview was torn down after prior hosted proof and remains intentionally unconfigured until M5 beta-readiness work restores an isolated Preview environment.

### Slice 6 — Applicant review to status update

**Outcome:** an employer can review applicants and move applications forward; candidates see progress.

**Status:** Implementation complete locally — PR #59–#63 merged; D-070 Accepted; local exit proof `docs/39-slice-6-exit-proof.md`; hosted proof remains a separately authorized/deferred follow-up (`docs/40-slice-6-hosted-proof-runbook.md`).

Current workflow statuses are exactly:

- `submitted`
- `reviewing`
- `shortlisted`
- `accepted`
- `rejected`

Interview/hire outcomes are **not** encoded by these statuses. D-M5-2/D-M5-3/D-M5-4 make real-world interview/hire measurement a separate M5 outcome contract.

### Slice 7 — Admin moderation to audit event

**Outcome:** Stint can be operated safely for a controlled Berlin pilot.

**Status:** Complete locally — PR #64–#67 merged; D-071–D-075 Accepted; local closure `docs/44-slice-7-exit-proof.md`. Hosted Slice 7 proof has not been run and is not required for the accepted local closure.

Current M5 controls include operator authorization, employer suspension, vacancy moderation, audit events, legal placeholders, and deterministic pilot-funnel measurement. Full report intake, broad analytics, and transactional-email completeness remain evidence-dependent.

### Slice 8 — Account deletion to confirmed data removal

**Outcome:** candidates and employers can request export and deletion; removal can be confirmed.

**Status:** **Complete** — PR 8.1–8.5 all merged (#68–#73); D-076–D-090 Accepted; final local proof `docs/48-slice-8-exit-proof.md`.

Delivered scope includes role-scoped account export, whole-account deletion request/cancellation/confirmation, candidate/employer tombstoning, stale-JWT denial, isolated Auth soft-delete processing, durable deletion evidence, and D-090 stranded-processing lease recovery.

Final closure reference:

- merge commit `7a92e31fc25b3fe7d33d10fe7ffa5c5dd5a47789`
- migrations: 16
- pgTAP: 1441/1441 across 33 files
- Vitest: 983 passed / 3 skipped at closure
- broad E2E: 38/38 at closure

MVP account-data export/deletion controls are implemented and locally proven. This is not a blanket GDPR-compliance claim.

## Milestone mapping

| Milestone | Slices | Checkpoint | Status |
|---|---|---|---|
| M0 Foundation | 0 | Shell deploys with CI | Complete |
| M1 Candidate matching shell | 1–2 | Candidate reaches seeded matches | Complete |
| M2 Applications | 3 | Candidate applies and tracks status | Complete |
| M3 Employer flow | 4–6 | Verified employer publishes and reviews | Implementation complete; Slice 6 hosted proof remains separately deferred |
| M4 Trust and beta readiness | 7–8 | Ops and account-data/privacy basics work | **Complete** |
| M5 Berlin private beta | operate + design | Validate outcomes; governed product development | **Active** |

## M5 — Berlin private beta

### Overall targets

- 20 participating employers
- 100 verified vacancies
- 200 candidates
- 10 completed-interview conversions
- 3 confirmed hires

### Staged cohorts

| Cohort | Employers | Legitimate vacancies | Candidates | Outcome gate |
|---|---:|---:|---:|---|
| A — Proof | 3–5 | 10–20 | 20–30 | first completed-interview conversion |
| B — Validation | 8–10 | 30–50 | 60–100 | repeated completed-interview conversions + first confirmed hire |
| C — Full M5 | 20 | 100 | 200 | 10 completed-interview conversions + 3 confirmed hires |

### Approved M5 counting semantics

- **Participating employer:** count one unique employer once onboarding is complete, employer verification is `verified`, and at least one employer-submitted vacancy became effective-public during M5. Keep the historical count even if later paused/withdrawn/suspended/revoked; track current active/safe supply separately.
- **Verified vacancy:** count one unique employer-submitted vacancy once it became effective-public during M5 while its employer was verified. Exclude seed/demo and drafts that never became public; keep the historical count even if later inactive; track current effective-public supply separately.
- **Candidate:** count one unique candidate when authoritative essential onboarding is complete. A pre-existing completed candidate counts only when explicitly enrolled into an M5 cohort. Raw registrations are diagnostic only.
- **Completed interview:** the outcome model may preserve multiple distinct completed interview rounds, but the top-level M5 target counts distinct applications with at least one active, non-voided `interview_completed` event — max one top-line interview conversion per application.
- **Confirmed hire:** count a distinct application with an active employer-recorded `hired` event. `applications.status = accepted` never counts automatically.

### Approved outcome-contract direction

Interview/hire outcomes remain conceptually separate from application workflow status.

The M5.0-approved future implementation direction was required to follow the founder-approved constraints in `docs/49`/`docs/50`:

- employer-owned application outcome events;
- candidate read-only active outcome type + occurred date/time;
- append-only void/replacement correction;
- no new outcomes after candidate deletion;
- preserve non-identifying historical outcomes under the current deletion model;
- `occurred_at` may be backdated at most 30 days and may not be future-dated except negligible fixed clock-skew tolerance;
- immutable DB-generated `recorded_at`;
- no automatic coupling between outcome events and application status.

M5.0 itself did not authorize outcome schema/runtime implementation. Subsequent separately authorized M5.1 Units D/E implemented and locally/hosted-Preview-proved the outcome DB/RLS/RPC contract, employer record/void UI, candidate-safe projection, and funnel integration. Current execution status is recorded in `docs/53-m5.1-beta-readiness-closure.md`; `docs/49`/`docs/50` remain the historical decision/proposal records.

### Cohort A operating boundary

Cohort A is cleaning-first. Allow at most 1–2 adjacent low-language-barrier employers when founder access is strong and the hiring model remains simple. Do not deliberately run a broad multi-sector Cohort A.

### Cohort A readiness boundary

Before intentional Cohort A external traffic:

- ~~isolated Preview must be restored for systematic external testing~~ — complete through M5.1 F/F2; see `docs/52-preview-environment-runbook.md`;
- ~~minimal Sentry must be implemented and verified in Preview within the approved privacy boundary~~ — complete through M5.1 G1/G2; Production Sentry remains intentionally unwired pending the separate legal/privacy/activation decision;
- qualified German legal review/finalization must cover Impressum/business identity, Privacy notice, beta Terms, support/contact channel, and Sentry disclosure if required;
- founder owns the legal-readiness gate;
- retained Production Demo fixtures must be removed or explicitly re-authorized by 2026-09-02;
- remaining device/browser/accessibility/readiness closure and operational Cohort A preparation must be completed or explicitly dispositioned before the readiness verdict changes from BLOCKED.

Current Cohort A readiness is **BLOCKED**. See `docs/53-m5.1-beta-readiness-closure.md` for the authoritative current execution/readiness state.

This readiness gate is not a claim of full GDPR compliance.

### Weekly operating rule

Run one structured M5 review per week. Classify each issue as:

- Operate manually
- Fix now
- Watch
- Defer

This phase is operational and product-led. It should not trigger large feature expansion.

M5 activation or PR #74 alone does not authorize later product/schema work. Subsequent M5.1 units require their own bounded founder authorization; current execution state and next-unit selection are recorded in `docs/53-m5.1-beta-readiness-closure.md`.

## Historical planning vocabulary

The early domain-model list in prior planning documents is historical vocabulary, not a declaration that every named table exists or is required for Cohort A. Actual merged schema/migrations are authoritative.

## Pull-request policy

### Normal bounded M5 product change

A normal M5 PR should:

- cite the observed problem, product rationale, or approved design;
- state its BUILD NOW classification and funding treatment;
- implement the smallest coherent change;
- include tests appropriate to the risk;
- preserve strict TypeScript without `any`;
- contain no unrelated refactoring;
- update relevant documentation only where the source of truth changes;
- pass lint, type-check, tests, and production build.

### Decision-heavy change

For schema/database, authorization/RLS, privacy, security, matching authority, employment/legal boundaries, or major architecture:

- perform explicit discovery/audit first;
- record founder/decision approval;
- define business/security/privacy invariants before migration/runtime work;
- keep implementation decomposed and independently reviewable.

## Deferred work

Deferred and rejected capabilities are listed in `NOT_NOW.md`. Under D-M5-23, that file is a governed parking lot rather than a blanket freeze: an item moves only through explicit reclassification and Founder approval, with additional evidence required where risk or an accepted decision demands it.
