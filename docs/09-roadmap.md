# Roadmap

The roadmap is organised by validated capability, not speculative dates.

## Stage 0 — Product foundation

- finalise product specification
- finalise design tokens and core components
- confirm architecture and data model
- configure repository standards
- configure CI/CD and environments
- define analytics events
- define legal and moderation checklist

Exit condition: the team can begin the first vertical slice without unresolved architectural or scope ambiguity.

## Stage 1 — Candidate discovery slice

- authentication
- essential onboarding
- candidate preferences
- curated job data
- matching v1
- job cards and job details
- save job

Exit condition: a new candidate can register and receive understandable, relevant opportunities.

**Delivery note (2026-08):** Vertical Slice 2 delivered matching job cards without detail/save. Accepted Slice 3 contracts (D-035–D-045) place job detail + apply next and defer save/unsave. Under D-M5-6, save/unsave remains deferred and does not block the initial M5 private beta. This stage remains capability roadmap, not PR order.

## Stage 2 — Application slice

- candidate profile summary
- profile-based application
- optional CV upload
- application confirmation
- candidate application timeline
- email notifications

Exit condition: a candidate can apply successfully and see the resulting status.

**Delivery note (2026-08):** Accepted Slice 3 contracts (D-035–D-045) narrowed first delivery to profile-based submit + confirmation + Applied state; later slices added candidate application inventory/status history. Under D-M5-6, optional CV upload remains deferred and does not block the initial M5 beta.

## Stage 3 — Employer slice

- employer registration for private and organisation employers
- employer profile (company profile only for organisation employers)
- type-specific employer verification
- vacancy creation and publishing with privacy-safe public location
- applicant list and candidate profile
- application status updates
- interview invitation

Exit condition: a verified private or organisation employer can post a legitimate job, review an applicant, and move the application forward.

**Delivery note (2026-08):** Employer onboarding, verification, publication, applicant review, and application status progress are implemented through M4. Interview/hire outcome measurement remains separate from the five-state application workflow and is the M5.0 measurement-contract investigation (`docs/50-m5-outcome-contract-proposal.md`).

## Stage 4 — Trust and administration

- moderation dashboard
- reports
- vacancy expiry
- stale-job removal
- audit events
- account suspension
- funnel analytics

Exit condition: Stint operators can maintain marketplace quality without direct database intervention.

**Status:** M4 is complete as of merged PR #73. The accepted implementation deliberately narrowed some broad Stage 4 items; current moderation/suspension/audit/pilot-funnel controls are sufficient for the initial controlled beta under D-M5-1 unless real beta evidence exposes an operating blocker.

## Stage 5 — Closed Berlin pilot

**Status:** Active as M5 — Berlin private beta.

- onboard initial employers manually
- publish verified/legitimate vacancies
- recruit a limited candidate cohort
- observe onboarding and application sessions
- measure completed interviews and confirmed hires
- fix critical trust and usability problems
- freeze speculative feature expansion

Overall targets:

- 20 participating employers
- 100 verified vacancies
- 200 candidates
- 10 completed interviews
- 3 confirmed hires

Operate through staged cohorts:

| Cohort | Employers | Vacancies | Candidates | Outcome gate |
|---|---:|---:|---:|---|
| A — Proof | 3–5 | 10–20 | 20–30 | first completed interview |
| B — Validation | 8–10 | 30–50 | 60–100 | repeated interviews + first confirmed hire |
| C — Full M5 | 20 | 100 | 200 | 10 completed interviews + 3 confirmed hires |

Founder-approved metric boundaries:

- completed interview = employer records an application-related interview that actually took place; invitation/scheduling alone does not count;
- confirmed hire = employer records that the candidate was hired for the vacancy; application status `accepted` does not automatically count;
- interview/hire outcomes are conceptually separate from application workflow status.

Detailed beta boundary/counting proposals: `docs/49-m5-beta-transition-and-measurement.md`.
Outcome-contract proposal: `docs/50-m5-outcome-contract-proposal.md`.
Operating plan: `docs/51-m5-operating-plan.md`.

## Stage 6 — Public beta

- incorporate private-beta evidence
- improve matching explanations where evidence warrants it
- strengthen employer and vacancy verification where evidence warrants it
- finalise legal launch requirements
- publish/operate public landing and job pages for wider traffic
- establish candidate and employer support procedures at public-beta scale

Do not enter Stage 6 merely because M5 target dates elapse. M5 outcome evidence and operating readiness are the gate.

## Later, only after validation

- real-time messaging
- candidate references and verified work history
- employer subscriptions
- placement fees
- additional interface languages
- permitted job-feed integrations
- additional German cities
- mobile applications
- compliant on-demand shift partnerships
