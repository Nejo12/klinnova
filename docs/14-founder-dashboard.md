# Founder Dashboard

Operating view for the active phase. Keep this file concise and current.

Product scope: `docs/04-mvp.md`.
Delivery/phase plan: `docs/13-implementation-plan.md`.
M5 boundary/metrics: `docs/49-m5-beta-transition-and-measurement.md`.
M5 outcome proposal: `docs/50-m5-outcome-contract-proposal.md`.
M5 operating plan: `docs/51-m5-operating-plan.md`.
M5.1 execution/readiness closure: `docs/53-m5.1-beta-readiness-closure.md`.
K6 durable Production-cutover closure: `docs/56-k6-production-cutover-durable-closure.md`.
GründungsBONUS Plus post-submission control: `docs/100-gruendungsbonus-plus-post-submission-control.md`.
Deferred ideas: `NOT_NOW.md`.
Historical slice detail remains in the individual discovery/build-plan/closure documents.

## Current focus

| Field | Current state |
|---|---|
| Active milestone | **M5 — Berlin private beta** |
| Previous milestone | **M4 — Complete** (Slices 7–8 closed; PR #73 merged) |
| Product boundary | Merged M4 implementation under D-M5-1 feature freeze |
| Active work unit | **K6 COMPLETE / CLOSED.** Klinnova Production/public-domain cutover is complete through K6-6. `https://klinnova.com` is canonical Production. **Operational readiness remains ON HOLD.** GründungsBONUS Plus application assembly/submission is complete; post-submission control is active. See `docs/56-k6-production-cutover-durable-closure.md` and `docs/100-gruendungsbonus-plus-post-submission-control.md`. |
| PR | Post-submission funding-control documentation only; Founder manually merges. Never auto-merge. |
| Funding / admin | **GB9185/2026 SUBMITTED.** Electronic submission complete; signed original dispatched; correction notice for generated EUR 15.00 → intended EUR 15,000.00 next-year drawdown sent by email and post; IBB receipt/review pending. Provider evidence planning is outreach-ready for C05/C01/C04/C03/C07, but outreach/procurement/grant-targeted work remain **NOT AUTHORIZED**. |
| Product/schema implementation | M5.1 work proceeds only through explicitly approved bounded units; no funding submission event authorizes product/schema change |
| Preview | Persistent isolated Supabase Preview project remains available through Vercel-generated Preview deployment URLs. Custom `preview.klinnova.com` project-domain attachment is retired. See `docs/52-preview-environment-runbook.md` and `docs/56-k6-production-cutover-durable-closure.md`. |
| Monitoring | **Preview Sentry complete through G1/G2**. **Production Sentry remains OFF/unwired by deliberate Founder decision for Cohort A.** Funding submission does not activate it. |
| Production | **Canonical Production is `https://klinnova.com`.** `www.klinnova.com` permanently redirects to apex. `stint.company` permanently redirects to Klinnova and no longer serves the application directly. Production baseline after K6-4 merge: `0564a5e749b65f5589d1bd2dc32f926b848a5493`. |
| Cohort A readiness | **ON HOLD / NOT STARTED** — employer acquisition, candidate recruitment, founder-assisted onboarding, support/moderation preparation, and other operational work are preserved for later resumption. Funding submission does not start Cohort A. |
| Hosted destructive proof | Not authorized / not run |
| Demo fixture deadline | Remove or explicitly re-authorize retained Production Demo fixtures by **2026-09-02** |
| Legal readiness | Unit H is **CLOSED for current launch sequencing by Founder decision**. Current merged legal surfaces are accepted provisionally for this launch path; Founder will review/correct legal wording in the nearest future. No qualified legal-review, full legal-compliance, or GDPR-compliance claim is made. |

## GründungsBONUS Plus post-submission gate

- Application **GB9185/2026**: electronic submission complete.
- Signed original: dispatched by post; actual IBB receipt/processing evidence is pending.
- Correction notice: sent by email and post for the generated application display of `EUR 15.00`; controlling next-year grant drawdown is **EUR 15,000.00** and the EUR 30,000 / EUR 15,000 financing baseline is unchanged.
- Sensitive submission artifacts, identity evidence, bank identifiers, tax identifiers and signatures remain outside Git.
- Keep the grant-targeted project boundary closed until the legally relevant signed-original receipt / safe start boundary is evidenced or clarified by IBB.
- Provider outreach remains separately Founder-gated; no quote outreach, order, contract, deposit, procurement, paid campaign, Cohort A external market entry or funded work is authorized by submission alone.
- Current evidence-planning priority remains **C05 → C01 → C04 → C03 → C07**; `docs/95` is already outreach-ready and `docs/100` is the current administrative control record.

## K6 closure snapshot

- K6-0/K6-1 decision/discovery: complete via PR #135 and `docs/55-k6-production-cutover-discovery.md`.
- K6-2 repository Production-host conversion: complete via PR #136.
- K6-3 hosted Production cutover: complete; canonical `NEXT_PUBLIC_SITE_URL` and Supabase Auth Site URL are `https://klinnova.com`.
- K6-4 Production + Design acceptance: complete, including bounded legal-state remediation PR #137 and responsive remediation PR #138.
- K6-5 old public-domain retirement: complete — `www.klinnova.com` and `stint.company` use HTTP 308 to the canonical apex; custom `preview.klinnova.com` project attachment is retired; the rollback-era Supabase `https://stint.company/**` redirect allowance is removed.
- K6-6 durable closure: recorded in `docs/56-k6-production-cutover-durable-closure.md`.
- `auth.stint.company` remains transitional Auth sender infrastructure and was intentionally not migrated during K6.
- Mail DNS, Production Sentry, schema, application data, and internal Stint infrastructure names were not changed by K6-5/K6-6.

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

## Immediate beta-readiness queue after K6

This is a planning queue, **not automatic authorization**. Current execution status is authoritative in `docs/53-m5.1-beta-readiness-closure.md`, `docs/56-k6-production-cutover-durable-closure.md` and `docs/100-gruendungsbonus-plus-post-submission-control.md`.

### Product / measurement

1. Preserve workflow/outcome separation and the approved M5 counting semantics during beta operation.

### Infrastructure

1. Preserve the isolated Preview environment for controlled verification.
2. Keep Production Sentry OFF/unwired unless a later separately authorized Founder decision activates it.
3. Remove/re-authorize retained Production Demo fixtures by 2026-09-02 if still applicable under the current fixture record.

### Operations

1. Employer acquisition, candidate recruitment, founder-assisted onboarding, support/moderation operating preparation, and other Cohort A operational work remain **ON HOLD** until Founder resumes them and the applicable funding/start boundary is clear.
2. Preserve the existing plans and playbooks for later resumption; do not mark operational readiness complete.
3. Run one structured M5 review using `Operate manually / Fix now / Watch / Defer` when operations resume.

### Funding / administration

1. Retain private evidence of postal dispatch and the sent correction email.
2. Record the first IBB receipt acknowledgement, information request or decision when received.
3. Record Steuernummer / W-IdNr / USt-IdNr privately when issued; update IBB only where required.
4. Before any first funded expenditure, establish invoice → payment → cost-block → project-purpose evidence linkage.

## Cohort A readiness gates

Before intentional external Cohort A traffic, after Founder resumption:

- K6 Production/public-domain cutover is complete and verified;
- current merged legal surfaces remain provisionally accepted for this launch path; Founder will review/correct legal wording in the nearest future; no qualified legal-review, full legal-compliance, or GDPR-compliance claim is made;
- Preview Sentry remains complete; Production Sentry intentionally remains OFF/unwired unless separately authorized;
- isolated Preview remains available through Vercel-generated Preview deployments;
- technical/moderation/privacy support procedures are resumed and understood;
- demo-fixture cleanup/re-authorization obligations are satisfied as required;
- applicable GründungsBONUS project-start / procurement boundaries are clear before any grant-targeted Cohort A work;
- Cohort A employer/candidate acquisition and founder-assisted onboarding preparation are resumed and ready;
- Founder explicitly returns GO.

**Current verdict: K6 COMPLETE / OPERATIONAL READINESS ON HOLD / FUNDING APPLICATION UNDER POST-SUBMISSION CONTROL.**

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
| M5 Berlin private beta | **Active** | `docs/49`–`docs/56`; K6 Production/public-domain cutover complete; operational readiness remains ON HOLD; funding application is under post-submission control in `docs/100` |

## Decision discipline

Founder-approved M5 operating/measurement decisions remain recorded in `docs/49-m5-beta-transition-and-measurement.md` and durable project decisions remain in `docs/10-decisions.md`.

When current documentation and execution history conflict, merged Git/PR evidence determines implementation status; accepted hosted proof determines external-configuration status. Historical planning documents retain their original meaning unless explicitly superseded. `docs/53-m5.1-beta-readiness-closure.md` remains the durable M5.1 execution/readiness record; `docs/56-k6-production-cutover-durable-closure.md` is the durable K6 closure record; `docs/100-gruendungsbonus-plus-post-submission-control.md` is the current non-sensitive funding-administration control record.

Normal beta fixes use evidence-first lightweight delivery. Changes affecting schema/database, authorization/RLS, privacy, security, matching authority, employment/legal boundaries, or major architecture require explicit discovery and founder approval before implementation.
