# GründungsBONUS Plus — C06 Infrastructure / SaaS Public-Pricing Evidence

**Status:** F6I / C06 evidence collection — public pricing verified; grant eligibility and final inclusion remain pending

**Date:** 2026-08-25

**Authority:** Founder-authorized GründungsBONUS Plus preparation track. Evidence gathering only. This record does not authorize any upgrade, purchase, contract, Production Sentry activation, external Cohort A activity, paid campaign, hosted change, or grant submission.

Related durable records:

- `docs/61-gruendungsbonus-plus-cost-financing-plan.md`
- `docs/67-gruendungsbonus-plus-ibt-clarification-outcome.md`
- `docs/68-gruendungsbonus-plus-application-package-reconciliation.md`
- `docs/69-gruendungsbonus-plus-cost-evidence-quotation-architecture.md`
- `docs/70-gruendungsbonus-plus-financial-liquidity-tables.md`
- `docs/71-gruendungsbonus-plus-cost-register-evidence-tracker.md`

## 1. Purpose

Populate the easiest non-binding evidence for C06 — the infrastructure/SaaS cost block — using current public vendor pricing for services already relevant to Klinnova.

The current F4 planning allocation for C06 is **EUR 5,000 across the funded period**. This record does **not** establish that EUR 5,000 is eligible, necessary or fully evidenced. It establishes a defendable public-pricing basis from which the final 24-month infrastructure budget can be built.

## 2. Evidence rules

For this record:

- public list pricing is evidence of market price, not evidence of grant eligibility;
- no existing historical invoice is claimed as funded expenditure;
- no existing account is treated as automatically eligible merely because future invoices may arise;
- only post-application / funded-project-period expenditure should be considered for the final application;
- usage-based overages must not be budgeted without a reasonable usage assumption;
- optional upgrades should be included only where the Businessplan explains why they are needed for the funded project;
- prices are recorded in the vendor's published currency where applicable;
- VAT and foreign-currency treatment remain final-accounting/application questions;
- all public pricing must be refreshed immediately before final submission.

## 3. C06 master evidence table

| ID | Service | Relevant Klinnova role | Current public-price evidence | 24-month base reference | Evidence status | Eligibility confidence | Final decision |
|---|---|---|---|---:|---|---|---|
| C06-01 | Vercel | Next.js hosting/deployment/CI/CD | Pro: USD 20/month, includes USD 20 usage credit | USD 480 before usage overage/tax/FX | VERIFIED PUBLIC PRICE | MEDIUM — running IT cost candidate; existing-account treatment not confirmed by IBT | PENDING |
| C06-02 | Supabase | database/auth/backend platform | Pro: USD 25/month; includes USD 10/month compute credits for one Micro instance | USD 600 before add-ons/overage/tax/FX | VERIFIED PUBLIC PRICE | MEDIUM — running IT cost candidate; existing-account treatment not confirmed by IBT | PENDING |
| C06-03 | Sentry | production error/observability monitoring | Team: USD 26/month on current published pricing page; Developer: USD 0 | USD 624 for Team before overage/tax/FX | VERIFIED PUBLIC PRICE | MEDIUM — monitoring candidate; Production activation separately on HOLD | PENDING |
| C06-04 | Zoho Mail | Klinnova business/support mailbox | Mail Lite publicly listed at USD 1/user/month for 5 GB or USD 1.25/user/month for 10 GB, annual billing; free tier also exists in selected regions | USD 24–30 for one paid mailbox over 24 months, before tax/FX | VERIFIED PUBLIC PRICE | LOW/MEDIUM — ordinary business communications may need stronger project attribution | PENDING |
| C06-05 | Transactional/auth email delivery | account/auth/application/status emails | provider-specific paid tier not yet evidenced in this record | TBD | EVIDENCE NEEDED | MEDIUM if project-attributable and future-period only | PENDING |
| C06-06 | Other developer/software tooling | only project-required future tooling | no blanket allowance permitted | TBD | EVIDENCE NEEDED | LOW until specific tool/need is identified | PENDING |

## 4. Vercel evidence

### 4.1 Current public list price

Official current pricing page:

`https://vercel.com/pricing`

Observed on 2026-08-25:

- Hobby: USD 0/month;
- Pro: USD 20/month;
- Pro includes USD 20 of usage credit;
- Pro includes advanced spend management, faster builds/no queues and other production/team features;
- usage beyond included allowances is separately metered by product/category.

### 4.2 Current Klinnova treatment

Klinnova already uses Vercel infrastructure. Therefore:

- historical Vercel usage is excluded;
- the application must not imply that opening a Vercel account is a future project activity;
- only future project-period costs or justified plan/usage changes should be considered;
- existing-account future invoices remain subject to the unresolved IBT eligibility question recorded in `docs/67` and `docs/68`.

### 4.3 24-month evidence reference

Simple public-price reference:

`USD 20 × 24 months = USD 480`

This is **not** a final application amount because:

- tax/VAT treatment is unresolved;
- EUR conversion must use an appropriate documented method at finalization;
- usage overages may or may not occur;
- current actual plan state does not by itself prove a future upgrade is required;
- grant eligibility for an existing service/account is not confirmed.

## 5. Supabase evidence

### 5.1 Current public list price

Official current pricing page:

`https://supabase.com/pricing`

Observed on 2026-08-25:

- Free: USD 0/month;
- Pro: USD 25/month;
- Pro includes 100,000 monthly active users;
- Pro includes 8 GB disk per project;
- Pro includes 250 GB bandwidth/egress within the published allowance;
- Pro includes daily backups with 7-day retention;
- paid plans include USD 10/month compute credits, enough to cover one Micro instance under current pricing;
- additional project/compute/add-on usage can create further charges.

### 5.2 24-month evidence reference

Simple public-price reference:

`USD 25 × 24 months = USD 600`

Again, this is not a final eligible amount.

### 5.3 Usage/add-on control

Do not add speculative amounts for:

- larger compute;
- additional projects;
- custom domain;
- point-in-time recovery;
- log drains;
- additional bandwidth;
- storage or MAU overages;
- branching;

unless a concrete funded-project need and usage assumption is documented.

### 5.4 Existing-service boundary

As with Vercel:

- historical Supabase expenditure is excluded;
- the existing project itself is a pre-application asset;
- only future attributable running costs are candidates;
- final treatment depends on the application review and the unresolved existing-account/SaaS question.

## 6. Sentry evidence

### 6.1 Current public list price

Official current pricing page:

`https://sentry.io/pricing/`

Observed on 2026-08-25:

- Developer: USD 0;
- Team: USD 26/month on the currently displayed annualized pricing configuration;
- Team includes 50,000 errors/month, 5 GB logs, 5 GB application metrics, 5 million spans, 50 replays, one cron monitor and one uptime monitor under the current published base quota;
- additional usage is pay-as-you-go where enabled.

The pricing page currently calculates:

`USD 26/month = USD 312/year`

### 6.2 24-month evidence reference

`USD 26 × 24 months = USD 624`

### 6.3 Klinnova-specific boundary

Production Sentry activation remains **HOLD**.

Therefore this evidence record must not be interpreted as authorization to:

- create or upgrade a Sentry subscription;
- add Production DSN/configuration;
- enable Production event collection;
- alter privacy/legal surfaces;
- incur funded-project expenditure.

Sentry belongs in the final cost plan only if:

1. Production activation is separately authorized;
2. the privacy/legal boundary is cleared;
3. a paid tier is actually justified by expected use/features;
4. the expenditure occurs within the permitted funded-project period;
5. IBT accepts the cost category.

A free Developer plan may be sufficient initially; the application must not manufacture paid expenditure merely because a paid tier exists.

## 7. Zoho Mail evidence

### 7.1 Current public pricing

Official German pricing page:

`https://www.zoho.com/de/mail/zohomail-pricing.html`

The German page confirms the plan structure and annual-billing model. The current international pricing page displays:

- Mail Free: USD 0, subject to regional availability;
- Mail Lite 5 GB: USD 1/user/month, annual billing;
- Mail Lite 10 GB: USD 1.25/user/month, annual billing;
- Mail Premium: higher paid tier;
- Workplace tiers: separate higher-price collaboration bundles.

Official international reference:

`https://www.zoho.com/mail/zohomail-pricing.html`

### 7.2 24-month one-user reference

For one paid mailbox:

- 5 GB Mail Lite: `USD 1 × 24 = USD 24`;
- 10 GB Mail Lite: `USD 1.25 × 24 = USD 30`.

### 7.3 Treatment

Klinnova already has an operational support mailbox. Historical mailbox costs are excluded.

Ordinary business email is weaker as a project-specific funding line than infrastructure directly tied to the funded technical/market-entry project. Therefore the final register should:

- keep Zoho Mail as **PENDING**, not automatically include it;
- use only the future funded-period share if included;
- avoid allocating a disproportionate amount;
- obtain accounting/IBT treatment if ordinary communications costs remain material.

## 8. Transactional/auth email evidence gap

C06 also includes transactional communications infrastructure in the broader F4 architecture.

This record deliberately does **not** invent a vendor or paid tier.

Before including a transactional-email line, record:

- actual provider used by Klinnova for the relevant mail stream;
- current public pricing or non-binding quotation;
- included monthly volume;
- projected funded-period message volume;
- whether existing free/included quota is sufficient;
- why a paid tier becomes necessary;
- 24-month projected amount;
- VAT/currency treatment;
- project attribution;
- existing-account boundary treatment.

If the current free/included tier is sufficient, the correct budget amount may be EUR 0.

## 9. What the verified public prices currently support

The four currently evidenced base subscriptions produce the following simple 24-month list-price references:

| Service | 24-month list-price reference |
|---|---:|
| Vercel Pro | USD 480 |
| Supabase Pro | USD 600 |
| Sentry Team | USD 624 |
| Zoho Mail Lite, 1 user | USD 24–30 |
| **Combined** | **USD 1,728–1,734** |

This combined number is **not** a recommended grant amount.

It demonstrates an important point: current fixed public subscription prices alone do **not** substantiate the existing EUR 5,000 C06 planning allocation.

The gap must not be filled with arbitrary overage assumptions.

## 10. Consequence for the EUR 5,000 C06 planning block

Current evidence verdict:

> **EUR 5,000 remains a provisional ceiling, not an evidenced final amount.**

To defend a higher C06 amount, additional evidence would need to come from real future needs such as:

- demonstrable Vercel usage growth beyond included credit;
- justified Supabase paid plan and documented usage/add-ons;
- justified Sentry paid plan/usage after Production activation clearance;
- actual transactional-email volume/tier;
- other specific software tooling required by the funded project.

If those needs do not materialize, C06 should be **reduced**, and the overall EUR 40,000 project must either:

1. reallocate the difference to other genuinely evidenced eligible categories; or
2. reduce the total requested project cost/grant proportionally.

Do not preserve EUR 40,000 by inventing SaaS expenditure.

## 11. VAT / currency treatment

Current public prices are primarily USD list prices.

Before final application freeze:

- determine whether application figures should be gross or net given Klinnova's actual VAT position;
- document the EUR conversion methodology/date where foreign-currency pricing is used;
- prefer EUR-denominated invoices/quotes where available;
- avoid false precision from today's exchange rate in a 24-month planning period;
- recheck vendor prices shortly before submission.

No VAT conclusion is made by this document.

## 12. C06 register update recommendation

After this evidence is merged, the controlling cost register should conceptually treat C06 as:

| Field | Current value |
|---|---|
| Planning ceiling | EUR 5,000 |
| Evidence status | PARTIALLY EVIDENCED |
| Fixed subscription evidence | approximately USD 1,728–1,734 over 24 months before tax/FX, if all listed paid tiers are actually justified |
| Eligibility confidence | MEDIUM / unresolved existing-account treatment |
| VAT state | PENDING |
| Final amount | PENDING |
| Current decision | REDUCE-OR-EVIDENCE-MORE |

## 13. Source register

Public sources checked 2026-08-25:

1. Vercel pricing — `https://vercel.com/pricing`
2. Supabase pricing — `https://supabase.com/pricing`
3. Supabase billing documentation — `https://supabase.com/docs/guides/platform/billing-on-supabase`
4. Sentry pricing — `https://sentry.io/pricing/`
5. Zoho Mail German pricing — `https://www.zoho.com/de/mail/zohomail-pricing.html`
6. Zoho Mail international pricing — `https://www.zoho.com/mail/zohomail-pricing.html`

Refresh all figures before final submission.

## 14. C06 completion state

**C06 public-pricing evidence: PARTIALLY COMPLETE.**

Completed:

- Vercel base pricing evidence;
- Supabase base pricing evidence;
- Sentry base pricing evidence;
- Zoho Mail base pricing evidence;
- 24-month simple list-price references;
- explicit evidence gap against the EUR 5,000 planning ceiling.

Still needed:

- actual transactional-email provider/tier/volume evidence;
- any other specifically justified software/tooling;
- VAT treatment;
- final EUR conversion/application representation;
- final include/exclude decision after eligibility review;
- confirmation whether future recurring costs on pre-existing accounts are accepted in the individual application.

No procurement, activation or expenditure is authorized.