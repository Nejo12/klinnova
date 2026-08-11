# M5 Berlin Private Beta Operating Plan

**Status:** Founder-approved operating direction; merged (PR #74)

**Date:** 2026-08-09

Related:

- M5 beta boundary and measurement: `docs/49-m5-beta-transition-and-measurement.md`
- Outcome contract proposal: `docs/50-m5-outcome-contract-proposal.md`
- Founder dashboard: `docs/14-founder-dashboard.md`

## 1. Objective

Run a controlled Berlin private beta that determines whether Stint can produce legitimate applications, completed-interview conversions, and confirmed hires without expanding into a broad marketplace or ATS.

M5 is operational and product-led. Engineering work is evidence-driven.

## 2. Staged cohorts

| Cohort | Participating employers | Legitimate vacancies | Candidates | Required outcome before expansion |
|---|---:|---:|---:|---|
| A — Proof | 3–5 | 10–20 | 20–30 | first completed-interview conversion |
| B — Validation | 8–10 | 30–50 | 60–100 | repeated completed-interview conversions + first confirmed hire |
| C — Full target | 20 | 100 | 200 | 10 completed-interview conversions + 3 confirmed hires |

Do not expand cohorts solely because registration numbers are reached. Trust/safety, vacancy legitimacy, candidate usability, and outcome quality remain gates.

Top-level metric definitions are authoritative in `docs/49`.

## 3. Geographic boundary

Berlin remains the only active market under D-004 and current anti-goals.

For M5:

- employer vacancies represent work in Berlin;
- candidate recruitment focuses on people seeking Berlin work;
- no Brandenburg/nationwide expansion is introduced merely to increase supply;
- travel-time sophistication remains deferred unless observed evidence shows the current Berlin-level boundary causes a material blocker.

## 4. Cohort A employer segment — approved

### Cleaning-first wedge

Cohort A should prioritize simple legitimate cleaning demand:

1. small/medium cleaning businesses;
2. property managers / managed-property operators with recurring cleaning needs;
3. selected shops/retail premises with legitimate cleaning requirements;
4. a small number of private household employers where verification and privacy handling remain straightforward.

A narrow exception permits **1–2 adjacent low-language-barrier employers** only when:

- founder access is strong; and
- the hiring model remains simple and compatible with the current Stint workflow.

Do not deliberately run a broad multi-sector Cohort A.

Rationale:

- cleaning is already an explicit initial use case;
- requirements are comparatively structured;
- limited-German candidates can plausibly match without a CV/document workflow;
- recurring demand can produce multiple legitimate vacancies per employer.

## 5. Candidate segment

Primary Cohort A candidate profile:

- legally allowed to work in Germany;
- based in Berlin / seeking Berlin work;
- limited German is a meaningful barrier;
- interested in the active employer/vacancy segment;
- willing to complete the lightweight Stint profile rather than requiring a CV-first workflow.

Candidate recruitment should prioritize channels where trust and direct feedback are possible rather than anonymous volume.

Potential channels:

- founder/referral network;
- Berlin migrant/newcomer community groups;
- language schools;
- employment-support NGOs/community organizations;
- permitted WhatsApp/Facebook/community groups;
- partner referrals;
- direct offline/community outreach.

Candidate profiles must never be scraped or imported from public groups.

## 6. Employer acquisition channels

Recommended order:

1. founder/direct network and warm introductions;
2. direct outreach to relevant Berlin cleaning employers;
3. property-management / cleaning-business introductions;
4. local business associations/community organizations;
5. inbound/referral from participating employers;
6. at most 1–2 founder-accessible adjacent low-language-barrier employers under the approved exception.

Do not use unrestricted job scraping as the M5 supply strategy.

## 7. Founder-assisted onboarding

Manual founder assistance is explicitly acceptable during M5.

The founder may:

- walk an employer through onboarding/verification;
- help structure a legitimate vacancy without fabricating facts;
- observe a candidate completing onboarding;
- explain the Stint workflow;
- collect usability feedback;
- help a user recover from an ordinary issue using supported flows.

The founder must not:

- bypass verification/publication rules through direct DB changes;
- impersonate users to manufacture activity;
- fabricate vacancies or outcomes;
- count test/demo data toward M5 metrics.

Manual assistance is evidence gathering, not evidence falsification.

## 8. Weekly operating cadence — approved

Run one structured M5 review per week.

### Review inputs

- cumulative participating employers / target;
- current active/safe employers;
- cumulative verified vacancies / target;
- current effective-public vacancy supply;
- completed-onboarding cohort candidates / target;
- raw registrations as diagnostic only;
- submitted applications;
- reviewed/shortlisted applications;
- completed-interview conversions;
- total completed interview rounds as diagnostic history;
- confirmed hires;
- employer recruitment pipeline;
- candidate recruitment pipeline;
- trust/safety incidents;
- technical incidents;
- repeated support requests;
- repeated usability blockers.

### Review output

Every observed problem goes into exactly one operating bucket:

1. **Operate manually** — founder can handle safely at current scale;
2. **Fix now** — material blocker, beta-measurement requirement, or security/privacy/accessibility issue;
3. **Watch** — plausible issue with insufficient evidence;
4. **Defer** — does not materially affect the beta thesis.

Normal beta engineering loop:

> Observe problem → confirm it matters → smallest fix → test → deploy → observe again.

Use heavier discovery/decision planning only for changes affecting schema/database, authorization/RLS, privacy, security, matching authority, employment/legal boundaries, or major architecture.

## 9. Feedback collection

Keep feedback lightweight and tied to actual events.

### Candidate prompts

After onboarding:

- What was confusing?
- Was anything important impossible to express?
- Did the jobs look relevant and understandable?

After application:

- Did you understand what was sent?
- Was any expected information missing?
- Would you have abandoned without founder help?

After interview/outcome:

- Did Stint accurately represent the opportunity?
- Was the employer/job consistent with expectations?

### Employer prompts

After vacancy publication:

- What was difficult to express?
- Were required fields appropriate?

After applicant review:

- Could you decide what to do next from the Stint profile?
- What information was truly missing?

After interview/hire:

- Was the candidate reasonably matched?
- What would have prevented the interview/hire?

Avoid long generic satisfaction surveys during Cohort A.

## 10. Blocker intake

Promote a blocker to engineering when at least one condition holds:

- a user cannot complete a core journey;
- data displayed/recorded is wrong or misleading;
- authorization/privacy/security is incorrect;
- accessibility prevents practical use;
- multiple real users encounter the same friction;
- founder workaround becomes unsafe or repeatedly expensive;
- beta measurement cannot be trusted without the change.

Otherwise record the evidence and classify it in the weekly review.

## 11. Moderation and safety procedure

The merged M4 operator controls are the default response surface.

### Priority incidents

Treat these as immediate review items:

- suspected scam/fraud;
- misleading pay or materially false vacancy information;
- discriminatory/abusive vacancy content;
- unsafe/private-location concern;
- employer identity/verification concern;
- candidate reports that a vacancy is not the work advertised;
- suspected compromised employer account.

### Response sequence

1. capture report/facts using the beta support channel;
2. assess immediate candidate risk;
3. if necessary, moderate the vacancy and/or suspend the employer using existing controls;
4. preserve the existing audit trail;
5. contact affected users where appropriate;
6. document whether the incident exposes a product/systemic gap;
7. decide whether engineering work is required.

Do not build a user-facing report intake system merely because founder-assisted intake is manual.

## 12. Account/privacy support

For export/deletion support:

- prefer the user's existing account export/deletion controls;
- never ask users for passwords or session tokens;
- never paste service-role credentials into support channels;
- if deletion fails, use documented privileged reconciliation procedures rather than ad-hoc table mutation;
- treat stale-JWT/authorization anomalies as security incidents.

## 13. Technical incident response

### Severity A — stop/contain

Examples:

- cross-user data exposure;
- authorization/RLS bypass;
- incorrect deletion/export privacy boundary;
- compromised secret;
- destructive data corruption;
- widespread production authentication failure.

Response:

1. stop affected beta flow / pause cohort activity where needed;
2. contain exposure;
3. preserve logs/evidence;
4. fix with security/privacy review;
5. prove locally/Preview before resuming affected traffic.

### Severity B — significant journey failure

Examples:

- applications cannot be submitted;
- employer cannot review candidates;
- effective-public vacancies disappear incorrectly;
- repeated server errors.

Response: smallest tested correction with expedited beta-fix PR.

### Severity C — usability/cosmetic

Record and review weekly unless accessibility or trust is materially affected.

## 14. Beta-readiness infrastructure

### Isolated Preview environment

Required before systematic external testing of iterative builds.

Plan:

- separate Preview Supabase project/environment;
- Preview-scoped browser-safe URL/key;
- no Production DB reuse;
- disposable/non-real fixtures;
- documented reset/teardown procedure;
- hosted destructive proof remains separately authorized.

Provisioned **2026-08-11** (M5.1 Unit F2) as a standalone Preview Supabase
project, satisfying the plan above — see
`docs/52-preview-environment-runbook.md` for the full record. (This
document's own originating PR did not configure Preview; that happened
later, via M5.1 Unit F.)

### Minimal Sentry — approved readiness requirement

Before intentional Cohort A external traffic, configure Sentry subject to the approved boundary:

- EU region where available on the selected plan;
- error monitoring only;
- no session replay;
- no request-body capture;
- no application/vacancy payload capture;
- scrub unnecessary email/user identifiers;
- separate Preview and Production environments;
- retention target 30 days or less where supported;
- no PostHog in Cohort A.

This PR does not configure Sentry.

### Production demo fixtures

Existing retained hosted Demo fixtures have a documented cleanup date of **2026-09-02**.

Operational requirement:

- remove them by that date; or
- explicitly re-authorize a new retention period with reason.

They never count toward M5 metrics.

### External-facing legal readiness — approved gate

The founder owns beta-readiness completion.

Intentional Cohort A external traffic is gated on qualified German legal review/finalization of:

- Impressum/business identity;
- Privacy notice reflecting actual processing;
- Terms suitable for the beta;
- support/contact channel;
- Sentry disclosure if required.

This is a readiness gate, **not** a claim of full GDPR compliance.

## 15. M5 measurement operating rules

### Participating employer

Count one unique employer when:

- onboarding is complete;
- employer is verified; and
- at least one employer-submitted vacancy became effective-public during M5.

Once counted, retain historical participation even if later paused, withdrawn, suspended, or verification changes.

Track current active/safe employer supply separately.

### Verified vacancy

Count one unique employer-submitted vacancy when it became effective-public at least once during M5 while employer verification was valid.

Do not count seed/demo vacancies or drafts that never became public.

Count once historically and track current effective-public supply separately.

### Candidate

Count one unique candidate when essential onboarding is complete.

Pre-existing completed candidates count only when explicitly enrolled into an M5 cohort.

Raw registrations are diagnostic only.

### Completed interview

Store each legitimate distinct completed interview round as an `interview_completed` event if/when the outcome contract is implemented.

For the top-level target, count **distinct applications with at least one active, non-voided interview-completed event**.

Multiple interview rounds on one application do not inflate the top-line target.

### Confirmed hire

Count an application once when it has an active, non-voided employer-recorded `hired` event.

`applications.status = accepted` never counts automatically.

## 16. Outcome correction and candidate/deletion behavior

Approved operating intent for future implementation:

- append-only outcome history;
- void/replacement corrections;
- no hard edit/delete of outcome history;
- candidate may read own active outcome type + occurred timestamp only;
- after candidate deletion, block new outcome events;
- preserve existing non-identifying historical outcome facts;
- allow `occurred_at` backdating up to 30 days;
- prohibit future dating except negligible fixed clock-skew tolerance;
- DB-generate immutable `recorded_at`.

No schema/runtime work is implemented by this PR.

## 17. Cohort advancement gates

### A → B

Minimum:

- at least one completed-interview conversion under the approved metric;
- no unresolved Severity A incident;
- no repeated blocker preventing candidate application or employer review;
- vacancy legitimacy/moderation process workable manually;
- outcome measurement implementation trusted if the interview is counted in-product;
- legal/Sentry/Preview readiness remains appropriate for the next traffic level.

### B → C

Minimum:

- repeated completed-interview conversions;
- first confirmed hire;
- acquisition channels show repeatability beyond a single founder relationship;
- support burden remains manageable or has evidence-backed fixes;
- monitoring/Preview/legal readiness is stable for larger cohort traffic.

## 18. Explicit non-goals during Cohort A

Do not introduce without evidence:

- chat;
- native apps;
- reviews/ratings;
- AI matching/embeddings/vector search;
- payments/payroll;
- subscriptions;
- full ATS;
- video interviewing;
- multi-city support;
- unrestricted scraping;
- CV upload;
- saved jobs;
- sophisticated analytics dashboards;
- PostHog/session replay.

## 19. Approval state

The founder has approved:

- cleaning-first Cohort A with 1–2 narrow adjacent-employer exceptions;
- all top-level M5 counting semantics;
- interview conversion counting capped at one per application;
- candidate-safe outcome visibility;
- append-only correction;
- deleted-candidate outcome freeze;
- 30-day timestamp backdating;
- minimal Sentry boundary;
- founder-owned qualified German legal-review gate;
- weekly `Operate manually / Fix now / Watch / Defer` cadence.

No additional M5.0 operating-plan decision remains open. PR #74 is merged; the next founder decisions are the M5.1 beta-readiness-closure items tracked in `docs/14-founder-dashboard.md`.
