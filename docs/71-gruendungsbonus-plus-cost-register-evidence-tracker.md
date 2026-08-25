# GründungsBONUS Plus — Cost Register & Evidence Collection Tracker

**Status:** F6H working register — application preparation only

**Date:** 2026-08-25

**Authority:** Founder-authorized GründungsBONUS Plus preparation track. This record is a planning and evidence-control document only. It does not authorize application submission, procurement, contracts, spending, borrowing, hiring, external employer/candidate acquisition, paid campaigns, Production Sentry activation, hosted changes or other funded-project commencement.

Related durable records:

- `docs/61-gruendungsbonus-plus-cost-financing-plan.md`
- `docs/67-gruendungsbonus-plus-ibt-clarification-outcome.md`
- `docs/68-gruendungsbonus-plus-application-package-reconciliation.md`
- `docs/69-gruendungsbonus-plus-cost-evidence-quotation-architecture.md`
- `docs/70-gruendungsbonus-plus-financial-liquidity-tables.md`

## 1. Purpose

Convert the canonical EUR 40,000 project-cost architecture into a live application evidence register.

This register is the control point for each proposed cost line. Every line intended for the final application should eventually have:

- a defined project purpose;
- an evidence source;
- an amount basis;
- VAT treatment;
- timing within the funded period;
- procurement / Vorhabenbeginn status;
- eligibility confidence;
- financing treatment;
- final `INCLUDE`, `EXCLUDE`, `REDUCE`, or `PENDING` decision.

No cost remains in the final application merely because it appeared in an earlier planning document.

## 2. Canonical funding baseline

Current controlling base case:

- eligible project expenditure: approximately **EUR 40,000**;
- requested grant: approximately **EUR 20,000**;
- applicant share: approximately **EUR 20,000**;
- Founder remuneration: **EUR 0**;
- permanent employee: **none initially**;
- execution model: Founder-led with bounded contractors/specialists;
- external Cohort A acquisition: **HOLD until application submission**;
- historical/pre-application Klinnova expenditure: **EXCLUDED**.

Stretch corridor remains possible only if evidence and liquidity support it:

- EUR 45,000–50,000 eligible costs;
- EUR 22,500–25,000 requested grant.

The register should not be inflated merely to preserve the nominal EUR 40,000 target.

## 3. Evidence-status vocabulary

Use these statuses consistently:

- **PLANNED** — conceptual cost line only; no external evidence yet.
- **PUBLIC PRICE** — supported by current public vendor pricing.
- **NON-BINDING QUOTE** — provider supplied a non-binding offer/estimate.
- **SCOPE READY** — scope of work is defined and suitable for quote collection.
- **IBT/TAX PENDING** — treatment depends on programme or accounting/tax interpretation.
- **READY FOR FINAL REVIEW** — evidence exists and line can be assessed for final inclusion.
- **INCLUDE** — approved for final application package after all checks.
- **REDUCE** — retain only a lower evidenced amount.
- **EXCLUDE** — remove from application cost plan.

## 4. Eligibility-confidence vocabulary

This is internal planning confidence, not an IBT ruling:

- **HIGH** — category appears aligned with current programme cost classes and project purpose, subject to final application review.
- **MEDIUM** — plausible but exact attribution, evidence, VAT treatment or programme interpretation must be confirmed.
- **LOW** — weakly evidenced, ordinary overhead, speculative, or dependent on unresolved eligibility treatment.

## 5. Master EUR 40,000 cost register

| ID | Cost block | Planning amount | Current evidence status | Eligibility confidence | VAT status | Timing / boundary | Final decision |
|---|---|---:|---|---|---|---|---|
| C01 | Legal/privacy/employment-platform specialist review | EUR 4,000 | SCOPE READY | HIGH/MEDIUM | PENDING | post-application only | PENDING |
| C02 | Accounting/tax/business setup/funding-administration support | EUR 2,500 | SCOPE READY | MEDIUM | PENDING | post-application only | PENDING |
| C03 | UX/accessibility/user-research specialist support | EUR 3,500 | SCOPE READY | HIGH/MEDIUM | PENDING | post-application; evidence-driven | PENDING |
| C04 | Security/technical assurance | EUR 3,500 | SCOPE READY | HIGH/MEDIUM | PENDING | post-application | PENDING |
| C05 | Targeted development/engineering support | EUR 7,000 | SCOPE READY | HIGH/MEDIUM | PENDING | post-application; future tasks only | PENDING |
| C06 | Hosting/database/email/monitoring/software infrastructure | EUR 5,000 | PUBLIC PRICE / IBT PENDING | MEDIUM | PENDING | future-period costs only | PENDING |
| C07 | Employer/candidate market-entry and acquisition | EUR 6,000 | PLANNED | HIGH/MEDIUM | PENDING | HOLD until application submitted | PENDING |
| C08 | Commercial/brand/content materials | EUR 2,000 | PLANNED | MEDIUM | PENDING | post-application | PENDING |
| C09 | Equipment/material investment | EUR 2,500 | PLANNED | MEDIUM | PENDING | no pre-application purchase | PENDING |
| C10 | Insurance/communications/general project operating costs | EUR 1,500 | PLANNED | LOW/MEDIUM | PENDING | future project-attributable only | PENDING |
| C11 | Planning contingency / quotation variance | EUR 2,500 | PLANNING ONLY | LOW | n/a | cannot remain vague in final plan | REDISTRIBUTE/EXCLUDE |
|  | **Total planning envelope** | **EUR 40,000** |  |  |  |  |  |

## 6. C01 — Legal/privacy/employment-platform specialist review

### Purpose

Independent qualified review of the future funded phase and operating model, with particular attention to legal/privacy/employment-marketplace risk and application-facing legal surfaces.

### Evidence to collect

- provider identity and qualifications;
- non-binding written scope;
- estimated hours/deliverables;
- price net/gross;
- VAT position;
- proposed project timing;
- confirmation that no work begins before the permitted boundary.

### Scope target

Potential deliverables:

- Impressum / information-duty review;
- privacy notice/process review against actual Klinnova processing;
- employer/candidate terms/policy review where appropriate;
- employment-platform/intermediary boundary review;
- risk memo on relevant operational flows.

### Control

Do not present as a promise of full legal/GDPR certification.

## 7. C02 — Accounting/tax/business setup and funding administration

### Purpose

Professional support for bookkeeping/tax setup, VAT treatment, evidence retention and funding-compliant accounting workflow.

### Evidence to collect

- accountant/tax-adviser or qualified provider scope;
- setup vs recurring service split;
- funding-specific support element;
- quoted amount and VAT;
- distinction between ordinary general administration and project-attributable work.

### Risk

Ordinary business administration may not be fully eligible. Final amount may need reduction.

## 8. C03 — UX/accessibility/user-research specialist support

### Purpose

Independent evidence-driven evaluation after external beta begins, including low-friction candidate access, responsive usability, accessibility and practical employer/candidate research.

### Evidence to collect

- research/review scope;
- target participant groups;
- expected deliverables;
- estimated days/hours;
- rate / total estimate;
- VAT;
- timing after application submission and after legitimate beta activity begins.

### Control

This line must be future work. Existing pre-application design work is not claimable.

## 9. C04 — Security / technical assurance

### Purpose

Independent production-oriented security/privacy technical review and bounded hardening work that complements, rather than duplicates, Founder-owned development.

### Evidence to collect

- review scope;
- deliverables such as threat review, dependency/configuration assessment, auth/data-flow review or bounded remediation support;
- provider rate/estimate;
- VAT;
- timing.

### Control

Production Sentry activation remains a separate Founder decision and is not automatically authorized by this line.

## 10. C05 — Targeted development / engineering support

### Purpose

Bounded post-application engineering capacity for evidence-backed work that exceeds Founder bandwidth or benefits from specialist implementation.

### Evidence to collect

- future task classes, not pre-existing backlog;
- provider/day rate or hourly rate;
- estimated days/hours;
- explicit deliverables;
- project period;
- VAT;
- non-binding quote where possible.

### Strong justification

The Founder remains primary developer. External engineering is used only where specialist expertise or delivery capacity produces measurable project value.

### Exclude

- historical MVP work;
- general codebase maintenance already performed;
- unrelated feature backlog;
- work started before the permissible project boundary.

## 11. C06 — Hosting / database / email / monitoring / SaaS

### Purpose

Future project-period digital infrastructure required to operate the funded Berlin market-entry and validation phase.

Possible components:

- Vercel/hosting;
- Supabase/database/auth;
- transactional email;
- Sentry/monitoring if later activated;
- domain/service tooling where genuinely attributable;
- other directly project-related SaaS.

### Evidence to collect per service

| Field | Required |
|---|---|
| Vendor/service | yes |
| Current plan | yes |
| Public monthly/annual price | yes |
| Expected funded-period tier | yes |
| Expected months | yes |
| Net/gross/VAT treatment | yes |
| Existing account before application? | yes |
| Future invoices only? | yes |
| Project attribution | yes |
| Final eligibility treatment | pending |

### Current programme uncertainty

IBT did not specifically confirm the treatment of future invoices on accounts that existed before application.

Therefore:

- historical invoices: **EXCLUDE**;
- future-period costs: **candidate only**;
- final inclusion requires conservative attribution and final review.

## 12. C07 — Employer/candidate market-entry and acquisition

### Purpose

Controlled Berlin market establishment after application submission.

Possible evidence categories:

- paid campaign estimates;
- community/event participation costs;
- outreach tools;
- printed/digital acquisition materials;
- employer-facing campaign assets;
- candidate-channel experiments.

### Current operating boundary

**External beta/acquisition remains on HOLD until application submission.**

Research, budgeting and non-binding price collection may continue.

### Evidence to collect

- channel;
- target audience;
- objective;
- expected spend;
- planned duration;
- measurable output;
- VAT;
- evidence that execution starts only after the permitted boundary.

### Control

Do not include generic marketing spend without a Berlin market-entry objective and measurable rationale.

## 13. C08 — Commercial / brand / content materials

### Purpose

Future employer/candidate-facing commercial communication needed for market entry.

Potential items:

- employer sales materials;
- candidate information materials;
- campaign creative;
- bounded content/translation support;
- professional copy/design where justified.

### Evidence to collect

- scope/deliverables;
- provider or service;
- quoted amount;
- VAT;
- timing;
- relationship to market-entry plan.

### Risk

Avoid duplicating C07 advertising/acquisition costs.

## 14. C09 — Equipment / material investment

### Purpose

Only business equipment demonstrably necessary for execution of the funded project.

### Evidence to collect

- exact item/specification;
- business necessity statement;
- current market price or quote;
- VAT;
- acquisition timing;
- confirmation that item is not already owned or purchased pre-application.

### Control

No equipment line should be used merely to fill the project envelope.

Unrelated or convenience hardware must be excluded.

## 15. C10 — Insurance, communications and general project operating costs

### Purpose

Only future operating costs directly attributable to the funded project and acceptable under programme rules.

Possible candidates:

- project-specific business insurance;
- communications costs;
- directly attributable operating services.

### Current treatment

This is a lower-confidence block.

Before final inclusion, each item requires:

- specific service;
- price evidence;
- project attribution;
- VAT treatment;
- confirmation that it is not merely ordinary private/general overhead.

Expected outcome may be `REDUCE` or `EXCLUDE` if evidence is weak.

## 16. C11 — Contingency / quotation variance

The current EUR 2,500 contingency is **not a final eligible-cost category**.

Final handling:

1. reallocate only into evidenced, justified categories where real quotations support a higher amount; or
2. reduce the total eligible project envelope.

Do not submit a vague contingency line merely to maintain EUR 40,000.

## 17. Evidence record schema

For each final cost item create a record with:

| Field | Requirement |
|---|---|
| Cost ID | mandatory |
| Cost block | mandatory |
| Provider/vendor | mandatory when known |
| Evidence type | public price / non-binding quote / calculation |
| Evidence date | mandatory |
| Scope/deliverable | mandatory |
| Quantity/time basis | mandatory |
| Net amount | pending VAT resolution |
| VAT amount/rate | pending tax/accounting review |
| Gross amount | mandatory once VAT basis known |
| Application amount proposed | mandatory |
| Funded-period timing | mandatory |
| Existing pre-application relationship/account | disclose |
| Binding commitment made? | must be NO before permitted boundary unless separately cleared |
| Eligibility confidence | high / medium / low |
| Final decision | include / reduce / exclude / pending |
| Notes | rationale / risks |

## 18. VAT control

VAT treatment is not yet frozen.

The final application workbook must use one consistent treatment across:

- quotations;
- expenditure plan;
- financing plan;
- liquidity plan;
- portal fields.

Before final freeze, obtain accounting/tax confirmation on whether application costs should be presented net or gross for the Founder’s actual tax/VAT position.

Do not mix net and gross figures across cost blocks.

## 19. Evidence-storage rule

Repository documents may contain:

- vendor names;
- public pricing references;
- sanitized quote metadata;
- scope summaries;
- evidence dates;
- decision status.

Do not commit confidential provider offers, bank data, tax IDs, private addresses, identity documents, signatures or other sensitive attachments to the public repository.

Store sensitive application attachments outside Git and record only status/metadata here.

## 20. Financing interaction

Every cost ultimately marked `INCLUDE` must also appear consistently in:

- the expenditure plan;
- the 3-year financial/liquidity model;
- the grant request calculation;
- financing/closed-financing proof;
- application portal fields.

If final evidenced eligible cost falls below EUR 40,000, the grant request should fall proportionally rather than inventing additional expenditure.

At a 50% grant rate:

`requested grant = final eligible cost × 0.50`, subject to final programme approval and limits.

## 21. Collection priority

### Priority 1 — highest-value external evidence

1. C01 legal/privacy/employment-platform review;
2. C04 security/technical assurance;
3. C05 bounded engineering support;
4. C03 UX/accessibility/user research;
5. C02 accounting/tax/funding administration.

### Priority 2 — current vendor/public price evidence

6. C06 infrastructure/SaaS;
7. C07 market-entry/acquisition channel costs;
8. C08 commercial/content support.

### Priority 3 — include only if genuinely justified

9. C09 equipment;
10. C10 insurance/general operating costs.

C11 contingency is not collected as a standalone cost.

## 22. F6H completion definition

F6H architecture is complete when this register is merged and becomes the controlling evidence tracker.

The **final cost register is not complete** until each proposed application line has real evidence and a final decision.

Current state after this document:

- cost architecture: COMPLETE;
- evidence schema: COMPLETE;
- canonical baseline: LOCKED;
- quote/public-price collection: NOT YET COMPLETE;
- VAT treatment: PENDING;
- final eligible-cost total: PENDING;
- final grant request amount: PENDING evidence, with EUR 20,000 remaining the current base target;
- application submission: NOT AUTHORIZED.

## 23. Next work

The next funding units should proceed in this order:

1. collect non-binding/public-price evidence for Priority 1 and Priority 2 cost blocks;
2. reconcile VAT treatment;
3. populate this register with actual evidence amounts;
4. revise the 3-year liquidity model with evidence-backed numbers;
5. return to Founder CV/final profile when ready;
6. freeze the Businessplan and application package;
7. perform final official-rule/current-form check;
8. submit only after explicit Founder GO.
