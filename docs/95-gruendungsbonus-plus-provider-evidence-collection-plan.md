# GründungsBONUS Plus — Provider / Exact-Item Evidence Collection Plan

**Status:** preparation only — no provider outreach authorized

**Date:** 2026-08-31

**Authority:** Founder-approved GründungsBONUS Plus preparation track. This record reconciles the current F4-C/F4-D financing baseline with earlier market-evidence and RFQ records. It does not authorize provider contact, procurement, contracts, payment, grant-targeted work, paid campaigns, Cohort A external market entry, Production Sentry activation, hosted changes, or application submission.

## 1. Controlling baseline

Current Founder-frozen financing baseline:

- eligible project costs: **EUR 30,000 net**;
- requested grant: **EUR 15,000**;
- opening Founder-provided liquidity: approximately **EUR 2,000**;
- Founder contribution: **EUR 500/month during Years 1–2**;
- Founder remuneration: **EUR 0**;
- Year 1 revenue assumption: **EUR 0**;
- minimum modeled pre-reimbursement liquidity: approximately **EUR 4,100**;
- grant-targeted project activity: **not started**;
- supplier quotations: **none yet**.

The EUR 30,000 total is frozen as the current working envelope. The category mix remains evidence-dependent. Do not pad categories or preserve weak costs merely to reach EUR 30,000.

Controlling records:

- `docs/92-gruendungsbonus-plus-f4c-financing-baseline-freeze.md`;
- `docs/93-gruendungsbonus-plus-f4d-cost-evidence-reconciliation.md`;
- `docs/94-gruendungsbonus-plus-f4d-quote-collection-readiness.md`;
- `docs/82-gruendungsbonus-plus-cost-envelope-evidence-reconciliation.md`;
- `docs/91-gruendungsbonus-plus-liquidity-correction.md`.

## 2. Supersession / interpretation rule for earlier evidence records

Earlier C01/C03/C04/C05/C07 evidence records remain valid as **historical market-plausibility evidence and scope architecture**, but their old planning ceilings do not override F4-D.

Use these current working allocations:

| ID | Current F4-D working allocation |
|---|---:|
| C05 engineering support | **EUR 6,500** |
| C01 legal/privacy/platform review | **EUR 4,000** |
| C04 security/technical assurance | **EUR 3,500** |
| C03 UX/accessibility/user research | **EUR 3,000** |
| C07 market entry/acquisition | **EUR 5,500** |

Therefore:

- `docs/73` C01 EUR 4,000 remains current;
- `docs/74` C03 EUR 3,500 is historical; current working ceiling is EUR 3,000;
- `docs/75` C04 EUR 3,500 remains current;
- `docs/76` C05 EUR 7,000 is historical; current working ceiling is EUR 6,500;
- `docs/78` C07 EUR 6,000 is historical; current working ceiling is EUR 5,500;
- `docs/83` remains the reusable RFQ architecture, but any older C03/C05 figures and older collection sequence must be interpreted through `docs/93–95`.

No historical evidence document should be rewritten merely to erase the state that applied when it was created.

## 3. Current material-evidence order

Proceed in this planning order:

1. **C05 — engineering support — EUR 6,500**;
2. **C01 — legal/privacy/platform review — EUR 4,000**;
3. **C04 — security/technical assurance — EUR 3,500**;
4. **C03 — UX/accessibility/user research — EUR 3,000**;
5. **C07 — market entry/acquisition — EUR 5,500**.

Together: **EUR 22,500 / 75% of the current EUR 30,000 working envelope**.

This is an evidence-priority order, not an instruction to spend or contact providers.

## 4. C05 — engineering support

### Current evidence

`docs/76` establishes market plausibility and the key non-duplication rule: the Founder remains the primary developer, so C05 must fund future bounded specialist/capacity work rather than ordinary Founder development or historical MVP work.

### Quote-ready work-package architecture

Prefer separately priced packages such as:

- **WP-A — backend / authorization hardening:** selected Supabase/PostgreSQL/RLS/data-access review and remediation;
- **WP-B — critical E2E / test engineering:** funded-phase candidate/employer workflow regression coverage and reliability;
- **WP-C — specialist remediation:** implementation arising from later C01/C03/C04 findings;
- **WP-D — delivery / reliability:** bounded CI/deployment/environment reliability work demonstrably required for the funded phase.

### Evidence target

Collect, once separately authorized, at least one useful non-binding written estimate and preferably two comparable estimates where practical. Require:

- exact work package(s);
- deliverables;
- estimated days/hours;
- day/hour rate or fixed-price basis;
- net amount;
- VAT/gross treatment;
- duration;
- assumptions/exclusions;
- quotation validity;
- explicit future timing / no work start.

### Provider-search criteria

Prioritize Germany/EU providers or freelancers with demonstrable strength in several of:

- Supabase/PostgreSQL/RLS;
- Next.js/React/TypeScript;
- authorization/data-access security;
- E2E/test automation;
- CI/deployment reliability.

Avoid generic agencies proposing to rebuild or broadly redesign the platform.

## 5. C01 — legal/privacy/platform specialist review

### Current evidence

`docs/73` supports the EUR 4,000 ceiling through public specialist legal rates and defines a Klinnova-specific scope around operator/information duties, privacy, platform terms, AGG/discrimination, trust/safety and recruiting-platform/intermediary boundaries.

### Provider shortlist architecture

Public evidence already identifies plausible specialist sources/providers for later comparison, including:

- Böhmanwaltskanzlei — Berlin privacy-law consultation pricing;
- Anwaltskanzlei Harzewski — public privacy-law hourly rate;
- Kanzlei Höffner — Berlin commercial/IT-oriented hourly rate;
- Olaf Koglin / matterius marketplace reference — Berlin privacy specialist range;
- Kanzlei Sieling — published business legal-advice hourly rate.

These are **candidate evidence sources / potential providers only**, not selected counsel and not Klinnova quotations.

### Evidence target

Request a bounded fixed-fee or capped-hourly estimate covering agreed work packages, ideally including:

- operator / DDG / Impressum review;
- privacy/data-processing review against actual intended processing;
- candidate/employer terms/platform rules where appropriate;
- AGG/discrimination and employment-platform boundary review;
- prioritized written findings;
- one bounded follow-up/review round if quoted.

Do not request or imply a blanket "fully GDPR compliant" certification.

## 6. C04 — security / technical assurance

### Current evidence

`docs/75` contains unusually strong provider-specific public evidence:

- Berlin Cert — web-app pentest public range approximately EUR 3,000–7,000;
- Sodu Secure, Berlin — starting fixed price EUR 2,500 for a web/API application pentest;
- Hackeroo — Berlin/Germany manual pentest starting day rate EUR 1,160/day;
- A7 — 2026 day rate EUR 1,350 net/day and small web-app tests from around EUR 3,000.

These are public market references, not Klinnova-specific quotes.

### Quote-ready scope

Keep the request startup-scale and bounded:

- agreed critical candidate/employer flows;
- authentication/session handling;
- candidate/employer/operator authorization boundaries;
- selected API/server workflows;
- relevant OWASP Top 10 classes;
- prioritized findings and remediation guidance;
- one bounded retest, either included or separately priced.

Explicitly exclude assumptions of enterprise-wide source-code, cloud, network, social-engineering, certification or unlimited testing.

### Evidence target

C04 is the most immediately comparable specialist block. Once outreach is authorized, prioritize 2 comparable non-binding estimates if practical and preserve the existing public-price references as independent benchmark evidence.

If credible quotes support materially less than EUR 3,500, reduce C04 rather than filling the ceiling artificially.

## 7. C03 — UX / accessibility / user research

### Current evidence

`docs/74` supports commercial plausibility for independent UX/accessibility/user-research support, but its EUR 3,500 ceiling is historical. Current F4-D working ceiling: **EUR 3,000**.

### Current provider / exact-item research candidates

Fresh public research on 2026-08-31 identifies examples suitable for later comparison:

- Silberpuls, Berlin — accessibility audit including UX/UI design review and expert consultation;
- Berlin Bytes — accessibility/compliance audit and roadmap for digital products;
- BarriereFix — Berlin WCAG audit with manual assistive-technology/keyboard testing and prioritized report;
- TestingTime — participant recruitment with online target-group definition and price calculator.

These are research candidates only; no provider has been contacted or selected.

### Quote-ready structure

Separate professional fees from participant recruitment/incentives where applicable:

- expert review of critical candidate/employer journeys;
- mobile/responsive usability review;
- manual WCAG-oriented accessibility assessment;
- prioritized findings/remediation guidance;
- small user-research plan;
- optional moderation/synthesis support;
- participant recruitment/incentives as a distinct priced line.

Do not request a broad redesign.

## 8. C07 — market entry / acquisition

### Current evidence

`docs/78` establishes that C07 must be a staged Berlin market-entry test budget, not a generic advertising allowance. Its historical EUR 6,000 ceiling is superseded by the current **EUR 5,500** working allocation.

### Exact-unit evidence already available / refreshable

Current public platform evidence checked 2026-08-31:

- LinkedIn Jobs supports flexible daily or total sponsored-job budgets and publicly gives an example of EUR 10/day for 30 days = EUR 300;
- LinkedIn advertising can start from EUR 10/day and uses auction-based pricing;
- Indeed Sponsored Jobs uses flexible budgets determined by job/location/market conditions; many jobs may be posted free subject to current conditions, while sponsored minimums are dynamic.

Public sources:

- `https://business.linkedin.com/de/de/hire/jobs-101/pricing`;
- `https://business.linkedin.com/de/de/advertise`;
- `https://de.indeed.com/recruiting/preise`.

### Current evidence architecture

Build C07 from measurable units rather than one agency quote:

1. employer acquisition test units;
2. candidate acquisition test units;
3. sponsored-job / paid-channel units where justified;
4. community/offline partnership or field units where exact costs exist;
5. bounded campaign setup/management support if externally quoted;
6. measurement/reporting;
7. stage-gated reallocation only after observed performance.

Separate media spend from agency/management/creative fees. Prevent duplication with C08 commercial/content.

No paid campaign or external Cohort A activity is authorized before the safe funding boundary.

## 9. Standard evidence record for each provider / item

For every retained line record:

| Field | Requirement |
|---|---|
| Cost block | C01/C03/C04/C05/C07 |
| Provider / source | exact legal/business/source name |
| Scope / deliverable | explicit |
| Quantity / hours / days / units | explicit |
| Rate / unit basis | explicit |
| Net amount | explicit |
| VAT / gross | separate |
| Evidence date | explicit |
| Quote validity | where available |
| Proposed project timing | explicit |
| Payment schedule / milestones | explicit |
| Project attribution | future funded project only |
| Historical MVP separation | explicit |
| Duplication check | explicit |
| Binding status | NON-BINDING / PUBLIC PRICE ONLY |
| Private evidence locator | where original contains sensitive data |

## 10. Outreach-ready vs outreach-authorized

Current state after this plan:

- **C05 scope:** outreach-ready;
- **C01 scope:** outreach-ready;
- **C04 scope:** outreach-ready;
- **C03 scope:** outreach-ready;
- **C07 unit planning:** evidence-ready; agency quote optional and secondary to unit/channel evidence;
- **provider outreach:** NOT AUTHORIZED;
- **procurement / work start:** NOT AUTHORIZED.

When outreach is later authorized, use `docs/83` for the common non-binding request wording, but apply the current amounts and priority controls from `docs/93–95`.

Providers should not be told an internal category ceiling unless there is a specific reason. Ask them to price the defined scope independently.

## 11. Stop conditions

Return to Founder before proceeding if a provider:

- requires paid discovery merely to quote;
- requires acceptance/signature of terms;
- asks for a deposit or reservation fee;
- treats the request as an order;
- proposes immediate commencement;
- requests production credentials or sensitive data to prepare an estimate;
- materially changes the intended scope;
- produces a payment schedule that materially weakens the F4-C liquidity buffer.

## 12. Current verdict

**Provider-specific / exact-item evidence collection planning for the five material blocks: COMPLETE TO OUTREACH-READY LEVEL.**

No provider-specific quotation has yet been collected and no external outreach has occurred.

The next Founder-controlled gate is whether to authorize bounded non-binding quotation outreach for C05/C01/C04/C03 and continued exact-unit evidence refinement for C07.
