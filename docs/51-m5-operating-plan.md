# M5 Berlin Private Beta Operating Plan

**Status:** Proposed — founder review

**Date:** 2026-08-09

Related:

- M5 beta boundary and measurement: `docs/49-m5-beta-transition-and-measurement.md`
- Outcome contract proposal: `docs/50-m5-outcome-contract-proposal.md`
- Founder dashboard: `docs/14-founder-dashboard.md`

## 1. Objective

Run a controlled Berlin private beta that determines whether Stint can produce legitimate applications, completed interviews, and confirmed hires without expanding into a broad marketplace or ATS.

M5 is operational and product-led. Engineering work is evidence-driven.

## 2. Staged cohorts

| Cohort | Employers | Legitimate vacancies | Candidates | Required outcome before expansion |
|---|---:|---:|---:|---|
| A — Proof | 3–5 | 10–20 | 20–30 | first completed interview |
| B — Validation | 8–10 | 30–50 | 60–100 | repeated completed interviews + first confirmed hire |
| C — Full target | 20 | 100 | 200 | 10 completed interviews + 3 confirmed hires |

Do not expand cohorts solely because target registration numbers are reached. Trust/safety, vacancy legitimacy, candidate usability, and outcome quality remain gates.

## 3. Geographic boundary

Berlin remains the only active market under D-004 and the current anti-goals.

For M5:

- employer vacancies must represent work in Berlin;
- candidate beta recruitment focuses on people seeking work in Berlin;
- no Brandenburg/nationwide expansion is introduced merely to increase supply;
- travel-time sophistication remains deferred unless observed candidate evidence shows the current Berlin-level eligibility boundary creates a material problem.

## 4. Cohort A employer segment — proposed founder decision

### Recommended wedge: cleaning-first

Cohort A should prioritize employers that can generate legitimate cleaning vacancies with relatively low hiring-process complexity:

1. small/medium cleaning businesses;
2. property managers / managed-property operators with recurring cleaning needs;
3. selected shops/retail premises with legitimate cleaning requirements;
4. a small number of private household employers where verification and privacy handling remain straightforward.

Rationale:

- cleaning is already an explicit initial private-employer use case;
- vacancy requirements are comparatively structured;
- limited-German candidates can plausibly match roles without Stint needing a CV/document workflow;
- recurring employer demand can generate more than one legitimate vacancy per employer, making the 100-vacancy M5 target more realistic.

Do not broaden Cohort A simultaneously across cleaning, hospitality, logistics, warehousing, food production, moving, and retail unless founder evidence/recruitment access makes that necessary.

## 5. Candidate segment

Primary Cohort A candidate profile:

- legally allowed to work in Germany;
- based in Berlin / seeking Berlin work;
- limited German is a meaningful barrier;
- interested in the active employer/vacancy segment;
- willing to complete the lightweight Stint profile rather than requiring a CV-first workflow.

Candidate recruitment should prioritize channels where trust and direct feedback are possible rather than maximizing anonymous registrations.

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
2. direct outreach to relevant Berlin employers;
3. property-management / cleaning-business introductions;
4. local business associations/community organizations;
5. inbound/referral from participating employers.

Do not use unrestricted job scraping as the M5 supply strategy. Employer-submitted or manually curated/verified vacancies remain preferred.

## 7. Founder-assisted onboarding

Manual founder assistance is explicitly acceptable during M5.

The founder may:

- walk an employer through onboarding/verification;
- help structure a legitimate vacancy without fabricating facts;
- observe a candidate completing onboarding;
- explain Stint workflow;
- collect usability feedback;
- help a user recover from an ordinary product issue using supported flows.

The founder must not:

- bypass verification/publication rules through direct DB changes;
- impersonate users to manufacture activity;
- write candidate application content on their behalf without consent;
- fabricate vacancies or outcomes;
- count founder-created test/demo data toward M5 metrics.

Manual assistance is evidence gathering, not evidence falsification.

## 8. Weekly operating cadence

Recommended cadence: one structured M5 review each week.

### Review inputs

- participating employers / target;
- verified/effective-public vacancies / target;
- completed candidate onboarding / target;
- submitted applications;
- reviewed/shortlisted applications;
- completed interviews;
- confirmed hires;
- employer recruitment pipeline for the next cohort;
- candidate recruitment pipeline;
- trust/safety incidents;
- technical incidents;
- repeated support requests;
- repeated usability blockers.

### Review output

Every observed problem is placed in one of four buckets:

1. **Operate manually** — founder can handle safely at current scale;
2. **Fix now** — real blocker/security/privacy/accessibility defect;
3. **Watch** — one-off or low-confidence friction; collect more evidence;
4. **Defer** — useful but not required for beta thesis.

Normal beta engineering work then follows:

> Observe → confirm → smallest fix → test → deploy → observe.

## 9. Feedback collection

Keep feedback lightweight and event-linked.

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

A blocker should be promoted to engineering only when at least one condition holds:

- user cannot complete a core journey;
- data displayed/recorded is wrong or misleading;
- authorization/privacy/security is incorrect;
- accessibility prevents practical use;
- multiple real users encounter the same friction;
- founder manual workaround is becoming unsafe or repeatedly expensive;
- beta measurement cannot be trusted without the change.

For ordinary feature requests, record the evidence and defer until the weekly review.

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

1. capture the report/facts outside public product surfaces using the beta support channel;
2. assess immediate candidate risk;
3. if necessary, moderate the vacancy and/or suspend the employer using existing operator controls;
4. preserve the existing audit trail;
5. contact affected users where appropriate;
6. document whether the incident exposes a product/systemic gap;
7. only then decide whether engineering work is required.

Do not build a user-facing report intake system merely because moderation currently uses founder-assisted intake. Promote it only if manual intake becomes a demonstrated blocker.

## 12. Account/privacy support

For export/deletion support:

- prefer the user's own existing account export/deletion controls;
- never ask users to send passwords or session tokens;
- never paste service-role credentials into support channels;
- if deletion fails, capture the request context without exposing internal secrets and use the documented privileged reconciliation process only through authorized internal maintenance procedures;
- do not perform ad-hoc direct production table mutation as a support shortcut;
- treat any stale-JWT/authorization anomaly as a security incident, not a normal support issue.

## 13. Technical incident response

### Severity A — stop/contain

Examples:

- cross-user data exposure;
- authorization/RLS bypass;
- incorrect deletion/export privacy boundary;
- compromised secret;
- destructive data corruption;
- production authentication failure affecting many users.

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

### Severity C — usability / cosmetic

Record and review weekly unless accessibility or trust is materially affected.

## 14. Beta-readiness infrastructure

### Isolated Preview environment — required before systematic external testing

Plan:

- separate Preview Supabase project/environment;
- Preview-scoped browser-safe URL/key;
- no Production database reuse;
- disposable/non-real fixtures;
- documented reset/teardown procedure;
- hosted destructive proof remains separately authorized.

Preview restoration should not block founder recruitment conversations or operating-plan preparation, but it should precede systematic external testing of iterative builds.

### Minimal Sentry — approved direction, implementation not authorized here

Before Cohort A external traffic, propose a minimal setup with:

- error monitoring only;
- no session replay;
- no PostHog/product analytics;
- no request-body/user-content capture by default;
- scrub email/identifiers where not necessary for diagnosis;
- avoid storing application/vacancy snapshot payloads in error context;
- short, explicit retention configuration where the selected Sentry plan supports it;
- environment tags separating Preview and Production.

Founder approval is still required for the exact Sentry region/retention/PII settings before implementation.

### Production demo fixtures

Existing retained hosted Demo fixtures have a documented cleanup date of **2026-09-02**.

Operational requirement:

- remove them by that date; or
- explicitly re-authorize a new retention period with reason.

They never count toward M5 employer/vacancy/candidate/outcome metrics.

### External-facing legal pages

Current Privacy/Terms/Impressum surfaces are structural placeholders with legal-review-required language.

Before Cohort A external beta traffic is treated as intentional product use, assign an owner for legal/business-identity review and define the minimum readiness gate for:

- Privacy information;
- Terms;
- Impressum/business identity;
- contact/support channel;
- any Sentry disclosure required by the chosen monitoring configuration.

This operating plan does not claim GDPR compliance or substitute for legal advice.

## 15. Cohort advancement gates

### A → B

Recommended minimum:

- at least one completed interview under the approved metric definition;
- no unresolved Severity A incident;
- no repeated blocker preventing candidate application or employer review;
- vacancy legitimacy/moderation process workable manually;
- outcome measurement contract implemented and trusted if the interview is to count in-product.

### B → C

Recommended minimum:

- repeated completed interviews;
- first confirmed hire;
- acquisition channels show repeatability rather than one-off founder network only;
- support burden remains manageable or has evidence-backed fixes;
- monitoring/Preview/legal readiness is stable enough for the larger cohort.

## 16. Explicit non-goals during Cohort A

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

## 17. Remaining founder approvals

Before M5.0 closes, founder review should resolve:

1. Cohort A cleaning-first employer wedge vs a broader multi-sector cohort;
2. exact participation/vacancy/candidate count semantics in `docs/49`;
3. interview multiplicity and outcome-contract details in `docs/50`;
4. exact Sentry region/retention/PII configuration;
5. legal-page review owner/readiness gate;
6. whether the recommended weekly review cadence is adopted as written.
