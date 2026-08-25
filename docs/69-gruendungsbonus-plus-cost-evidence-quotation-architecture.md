# GründungsBONUS Plus — Cost Evidence & Quotation Architecture

**Status:** F6F working evidence architecture — application preparation only

**Date:** 2026-08-25

**Authority:** Founder-authorized GründungsBONUS Plus preparation track. Documentation/readiness control only. This record does not authorize application submission, procurement, spending, contracts, borrowing, hiring, Production Sentry activation, external employer/candidate outreach or Cohort A external traffic.

Related durable records:

- `docs/61-gruendungsbonus-plus-cost-financing-plan.md`
- `docs/66-gruendungsbonus-plus-application-evidence-checklist.md`
- `docs/67-gruendungsbonus-plus-ibt-clarification-outcome.md`
- `docs/68-gruendungsbonus-plus-application-package-reconciliation.md`

## 1. Purpose

Convert the canonical EUR 40,000 project-cost architecture into an evidence collection plan that can support the application without creating premature commitments or accidentally starting the funded project.

The goal is not to maximize the budget. The goal is to ensure every material cost block has:

1. a defined funded-project purpose;
2. a defensible amount;
3. a non-binding evidence source where possible;
4. a clear post-application execution boundary;
5. a fallback treatment if IBT rejects the category.

## 2. Canonical funding baseline

Current controlling baseline:

- eligible project expenditure: approximately **EUR 40,000**;
- requested grant: approximately **EUR 20,000**;
- applicant share: approximately **EUR 20,000**;
- stretch corridor only if evidence and liquidity justify it: EUR 45,000–50,000 eligible / EUR 22,500–25,000 grant;
- Founder remuneration: **EUR 0**;
- permanent employee at project start: **none**;
- Founder-led execution with bounded external specialists.

## 3. Evidence principles

### 3.1 Evidence must not become procurement

Before submission, prefer:

- public pricing pages;
- written non-binding quotations;
- indicative proposals clearly marked non-binding;
- rate cards;
- scope estimates;
- screenshots/PDFs of current vendor pricing;
- comparable market-price evidence.

Avoid before the safe boundary:

- signed supplier contracts;
- purchase orders;
- deposits;
- paid reservations;
- activation of paid project-specific services;
- commitments that require cancellation or create performance obligations.

### 3.2 Historical costs are excluded

Do not use:

- historical MVP development spend;
- historical subscriptions already incurred;
- already-paid domains/equipment;
- historical legal/accounting costs;
- existing private equipment purchased before the project.

### 3.3 Existing supplier account does not equal confirmed eligibility

For Vercel, Supabase, transactional mail, Sentry and similar recurring services, the account may already exist while future funded-period expenditure remains a candidate cost. IBT did not provide a specific written eligibility ruling on this point.

Therefore:

- collect the future-period cost basis;
- distinguish historical spend from future invoices;
- do not present eligibility as confirmed;
- keep the category adjustable in the final cost plan.

## 4. EUR 40,000 evidence matrix

| Cost block | Planning amount | Evidence target | Pre-submission action | Risk level |
|---|---:|---|---|---|
| Legal/privacy/employment-platform review | EUR 4,000 | 1–2 non-binding specialist quotations or documented hourly/day rates + proposed scope | Request indicative proposal only; no engagement letter | Medium |
| Accounting/tax/business setup/funding administration | EUR 2,500 | non-binding tax/accounting proposal or published fee basis plus scoped estimate | Obtain indicative cost range | Medium |
| UX/accessibility/user research | EUR 3,500 | specialist quotation/rate card with defined deliverables | Request non-binding scoped estimate | Low–Medium |
| Security/technical assurance | EUR 3,500 | security review/pentest/technical assurance quotation | Request non-binding estimate | Low–Medium |
| Targeted development/engineering support | EUR 7,000 | contractor rate evidence plus bounded future work-package estimates | Record day/hour ranges; no contractor booking | Medium |
| Hosting/database/email/monitoring/software infrastructure | EUR 5,000 | current public plan pricing + usage assumptions + 24-month projection | Capture pricing evidence; no upgrade solely for funding | Medium–High eligibility uncertainty |
| Employer/candidate market-entry and acquisition | EUR 6,000 | channel cost assumptions, media/event/tool pricing, measurable campaign model | Research only; no campaigns/outreach before submission | Medium |
| Commercial/brand/content materials | EUR 2,000 | design/content/printing/tool rate cards or non-binding estimates | Collect public/indicative prices | Low–Medium |
| Equipment/material investment | EUR 2,500 | 2–3 market-price comparisons for specific necessary equipment | Identify only; do not purchase | Medium |
| Insurance/comms/general project operating costs | EUR 1,500 | public quotes/tariffs for business-specific items | Research candidate costs only | Medium–High eligibility uncertainty |
| Contingency / allocation buffer | EUR 2,500 | no standalone eligibility claim | Hold internally and reallocate only into evidenced eligible categories before final submission | High if presented as generic contingency |
| **Total** | **EUR 40,000** |  |  |  |

## 5. Priority evidence sequence

### Priority 1 — strongest application value

Collect evidence first for:

1. legal/privacy/employment-platform specialist review;
2. security/technical assurance;
3. targeted development/engineering support;
4. UX/accessibility/user research;
5. accounting/tax/funding administration.

These categories are easier to connect directly to the future funded phase and can be evidenced through non-binding scope/rate proposals.

### Priority 2 — quantified operating/project costs

Next collect:

1. hosting/database/email/monitoring/SaaS future-period pricing;
2. market-entry/acquisition cost assumptions;
3. commercial/content cost assumptions;
4. equipment market prices.

### Priority 3 — keep flexible

Treat these conservatively until exact eligibility/tax treatment is clearer:

- generic business insurance/admin;
- existing recurring SaaS where account predates the application;
- broad contingency;
- ordinary bookkeeping not directly attributable to the funded project.

## 6. Evidence record format per cost item

For every cost item that survives into the final application, record:

- internal cost ID;
- category;
- provider/source;
- scope/deliverable;
- quoted or evidenced amount;
- net/gross/VAT status where known;
- evidence date;
- evidence type: public price / non-binding quote / rate card / market comparison;
- intended project month/quarter;
- why the cost belongs to the future funded phase;
- why it is not historical;
- whether an existing supplier account already exists;
- whether any contract/order has been signed;
- final eligibility treatment: confirmed / candidate / removed;
- link or local evidence filename outside sensitive Git content where appropriate.

## 7. External specialist scopes to request

### 7.1 Legal/privacy/employment-platform review — EUR 4,000 planning block

Indicative future scope:

- legal review of platform operator presentation;
- privacy notice and processing structure review;
- employer/candidate platform terms and information duties;
- employment-platform/intermediary boundary review;
- review of trust/safety and employer verification approach;
- launch-market compliance questions arising from Berlin operations.

Request only a non-binding estimate or rate-based proposal before the safe procurement boundary.

### 7.2 Accounting/tax/funding administration — EUR 2,500

Indicative future scope:

- bookkeeping/tax setup for the sole proprietorship;
- VAT treatment advice for grant cost planning;
- grant-compliant cost-record/evidence process;
- reimbursement-document preparation support;
- separation of private withdrawals from business/project expenditure.

### 7.3 UX/accessibility/user research — EUR 3,500

Indicative future scope:

- post-application usability review based on controlled beta evidence;
- accessibility review;
- candidate-language/accessibility workflow assessment;
- employer workflow review;
- prioritized implementation findings.

### 7.4 Security/technical assurance — EUR 3,500

Indicative future scope:

- application/security architecture review;
- authentication/authorization review;
- production security testing appropriate to scope;
- privacy-oriented technical findings;
- prioritized remediation report.

### 7.5 Engineering support — EUR 7,000

Evidence should be based on realistic contractor rates and bounded future work packages rather than a generic developer budget.

Possible funded-phase work packages:

- evidence-driven improvements arising from beta use;
- accessibility remediation;
- security remediation;
- employer/candidate workflow refinements;
- analytics/outcome-measurement improvements;
- scaling/performance work tied to market establishment.

Founder remains primary developer. Do not outsource ordinary existing MVP ownership merely to create eligible spend.

## 8. Infrastructure/SaaS evidence — EUR 5,000

Create a 24-month future-period estimate for candidate services such as:

- Vercel/hosting;
- Supabase/database/auth/storage;
- transactional email;
- monitoring/observability;
- domain/email-related project services where attributable;
- bounded development/business SaaS required for the funded project.

For each service distinguish:

1. account existed before application: yes/no;
2. historical expenditure: excluded;
3. future project-period invoices: candidate only;
4. incremental usage/upgrade expected because of funded market entry: document if applicable;
5. eligibility: not represented as confirmed unless IBT/grant decision confirms it.

## 9. Market-entry/acquisition evidence — EUR 6,000

This block should be justified through a measurable acquisition plan, not a generic marketing budget.

Evidence model should show:

- target employer segment;
- target candidate segment;
- acquisition channel;
- unit or campaign cost assumption;
- target volume;
- intended period;
- measurable outcome;
- connection to Cohort A/B/C validation.

Potential cost evidence may include:

- paid digital advertising estimates;
- event/community participation costs;
- printing/materials where justified;
- outreach/CRM tooling;
- local partnership activation costs;
- creative production costs.

External beta outreach itself remains on hold until application submission.

## 10. Commercial/brand/content — EUR 2,000

This should remain narrowly tied to market establishment:

- employer-facing sales/education materials;
- candidate information assets;
- campaign creative;
- compliant onboarding/explainer content;
- limited professional design/content support.

Avoid broad rebranding expenditure that is weakly connected to the funded project.

## 11. Equipment — EUR 2,500

Do not use this block as a generic hardware allowance.

Before keeping an equipment item in the final plan, document:

1. exact item/specification;
2. business necessity;
3. why current equipment is insufficient for the funded project;
4. market price comparison;
5. intended purchase timing after the permitted boundary;
6. whether the item is primarily business/project use.

If necessity is weak, reallocate the block to stronger evidenced categories rather than purchasing unnecessary equipment.

## 12. Contingency treatment

Generic contingency is unlikely to be a strong application cost line by itself.

Current treatment:

- keep EUR 2,500 only as an **internal planning buffer**;
- before final application freeze, reallocate it into actual evidenced categories if justified;
- otherwise reduce the total project envelope below EUR 40,000 rather than inventing costs.

The EUR 40,000 baseline is a target architecture, not a requirement to spend exactly EUR 40,000.

## 13. Evidence sufficiency rule

A cost block is **application-ready** only when:

- the purpose is specific;
- the future-project boundary is clear;
- amount is supported by evidence;
- VAT presentation is understood or explicitly pending final tax treatment;
- no binding pre-application commitment exists;
- cost can be removed without breaking the logical integrity of the Businessplan if IBT rules it non-eligible.

## 14. Financing interaction

Evidence collection must not create the false impression that the full EUR 40,000 is already financed in cash.

The cost plan remains linked to the established financing model:

- EUR 5,000 starting Klinnova liquidity base;
- EUR 400/month Founder contribution base;
- EUR 14,600 base Founder funding capacity over 24 months before business revenue;
- EUR 20,000 nominal applicant share;
- remaining financing gap managed through staged expenditure, operating revenue, cost reduction/deferral and only if needed a sustainable post-approval reimbursement bridge.

Closed-financing proof must be handled separately at final application/reimbursement readiness.

## 15. What can be done now

Allowed internal preparation:

- collect public pricing pages;
- request expressly non-binding quotations/estimates where doing so does not create an engagement;
- build scopes of work;
- document contractor market rates;
- calculate 24-month future SaaS scenarios;
- research acquisition channel pricing;
- compare equipment market prices;
- prepare evidence index.

Continue to hold:

- signing supplier agreements;
- paid orders/deposits;
- activating grant-dependent paid services;
- starting external Cohort A acquisition;
- paid market-entry campaigns;
- hiring/contractor commencement;
- application submission without Founder GO.

## 16. F6F completion state

**F6F evidence architecture: COMPLETE once merged.**

This does not mean the EUR 40,000 cost plan is evidence-complete.

Remaining work after F6F:

1. collect actual non-binding evidence/quotes;
2. resolve VAT presentation;
3. convert the 3-year model into exact Year-1 monthly and Years-2/3 quarterly tables;
4. reconcile final cost totals with evidence;
5. return to exact Founder CV attachment;
6. final application package freeze;
7. Founder GO before submission.
