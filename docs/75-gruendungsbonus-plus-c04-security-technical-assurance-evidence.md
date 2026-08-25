# GründungsBONUS Plus — C04 Security / Technical Assurance Evidence

**Status:** F6L / C04 market-evidence record — application preparation only

**Date:** 2026-08-25

**Authority:** Founder-authorized GründungsBONUS Plus preparation track. Research/documentation only. This record does not authorize procurement, contracts, payment, Production Sentry activation, hosted changes, external Cohort A traffic or application submission.

## 1. Purpose

Assess whether the current **EUR 3,500** planning allocation for C04 security / technical assurance is commercially plausible and define a bounded Klinnova-specific scope that can later be used to obtain non-binding quotations.

This document is market evidence, not a supplier quote and not a claim that EUR 3,500 is definitively eligible.

## 2. Current C04 planning position

Current planning amount:

- **C04 — Security / technical assurance: EUR 3,500**

Current evidence status before this record:

- amount existed as a planning allocation;
- no provider had been contacted;
- no Klinnova-specific quotation existed;
- no engagement had been authorized.

## 3. Public market evidence

### 3.1 Berlin Cert GmbH

Berlin Cert publicly states that web-application penetration tests typically cost approximately **EUR 3,000–7,000**.

The described scope includes:

- web application review;
- manual and automated testing;
- OWASP Top 10 methodology;
- review of common risks such as access-control weaknesses, insecure design, misconfiguration and outdated components;
- detailed report;
- discussion of findings.

Evidence source:

- https://www.berlincert.de/de/it-sicherheit/pentest_webapplikation

### 3.2 Sodu Secure, Berlin

Sodu Secure publishes a starting fixed price of **EUR 2,500** for a single web/API application penetration test.

The published scope includes:

- manual testing by OSCP-certified testers;
- web/API testing;
- OWASP / OSSTMM / NIST orientation;
- executive and technical report;
- retest after remediation.

Evidence source:

- https://sodusecure.com/

### 3.3 Hackeroo — Berlin penetration testing

Hackeroo publishes a starting day rate of **EUR 1,160/day** for manual penetration testing in Germany/Berlin.

At that rate, a narrow 3-day engagement would be approximately EUR 3,480 before any additional scope or VAT.

Evidence source:

- https://hackeroo.com/de/penetration-testing/berlin/

### 3.4 2026 German market benchmarks

A7 publishes a 2026 day rate of **EUR 1,350 net/day** and indicates that small web-application tests typically begin at around **EUR 3,000**.

Evidence source:

- https://a7.de/penetrationstest-kosten/

DeepMantis reports 2026 DACH manual-pentest day rates of approximately **EUR 900–1,800/day** and manual web-application penetration tests commonly in the **EUR 5,000–25,000** range, depending on depth and scope.

Evidence source:

- https://deepmantis.io/de/blog/pentest-kosten

Matproof reports 2026 German day rates approximately:

- freelance specialist: EUR 900–1,400/day;
- specialist boutique: EUR 1,200–1,800/day;
- larger consulting/MSSP providers: higher.

Evidence source:

- https://matproof.com/de/blog/pentest-kosten-deutschland-2026

## 4. Interpretation against the EUR 3,500 C04 planning amount

The public evidence supports the following conclusion:

> **EUR 3,500 is commercially plausible for a deliberately narrow security-assurance engagement, but it is not a credible budget for an unrestricted or enterprise-grade penetration test of the full platform.**

Examples:

- Sodu Secure's public starting point: EUR 2,500;
- Berlin Cert typical web-app range: EUR 3,000–7,000;
- Hackeroo 3 days at its published starting rate: approximately EUR 3,480;
- A7 small web-app starting range: approximately EUR 3,000+.

Therefore C04 can remain at EUR 3,500 provisionally if the final scope is tightly bounded.

## 5. What EUR 3,500 should and should not represent

### 5.1 Appropriate bounded interpretation

Potential C04 scope:

1. pre-test technical scoping;
2. focused review of Production Klinnova web application;
3. candidate and employer authentication/access-control flows;
4. selected API/server-action endpoints supporting high-risk business workflows;
5. authorization / IDOR checks across candidate and employer roles;
6. basic input-validation and injection checks;
7. session/authentication handling review;
8. selected OWASP Top 10 coverage;
9. prioritized technical findings report;
10. remediation discussion and, if included in quote, one bounded retest.

### 5.2 Scope that should not silently be assumed

EUR 3,500 should **not** be represented as automatically covering all of the following:

- exhaustive source-code audit;
- full cloud-infrastructure penetration test;
- Supabase platform/provider security audit;
- complete multi-environment review;
- social engineering;
- network/Active Directory review;
- mobile application testing;
- red-team engagement;
- continuous monitoring;
- certification against ISO 27001, NIS2, BSI, PCI DSS or similar frameworks;
- unlimited retesting;
- all APIs and all business flows without scope limitation.

## 6. Klinnova-specific quotation scope for later use

When quotation collection is authorized, request a **non-binding quotation** for a bounded scope substantially like:

> Independent security review / focused penetration test of the Klinnova Production web application, with emphasis on authentication, candidate/employer authorization boundaries, selected application/API workflows, input validation, access control, common OWASP Top 10 issues, a prioritized findings report and remediation discussion. Please price any retest separately or identify whether one bounded retest is included.

The request should explicitly state that:

- Klinnova is an early-stage Berlin digital employment platform;
- this is a focused startup-scale assessment;
- the Founder needs a non-binding quotation for funding-application evidence;
- no service should begin and no binding contract should arise from the quotation request.

## 7. Evidence quality assessment

### Evidence level achieved

**MARKET PLAUSIBILITY — CONFIRMED**

The current EUR 3,500 planning amount is supported by multiple current German/Berlin public market references.

### Evidence level not yet achieved

**KLinnova-SPECIFIC QUOTE — NOT YET AVAILABLE**

A final application should not present the market references as though they were a supplier commitment.

## 8. C04 cost-register state

Recommended current tracker state:

- planning amount: EUR 3,500;
- evidence status: **PUBLIC MARKET EVIDENCE**;
- eligibility confidence: **MEDIUM — subject to final programme treatment and exact scope**;
- VAT treatment: **PENDING**;
- timing boundary: **service must begin only after the permitted project-start boundary**;
- final decision: **PENDING QUOTE**;
- procurement status: **NOT AUTHORIZED**.

## 9. Interaction with existing Klinnova security work

Klinnova already contains internal security/privacy-conscious implementation and operating controls. C04 should therefore be framed as **independent specialist assurance of the future funded project / market-entry phase**, not as payment for historical Founder work and not as retroactive reimbursement for existing implementation.

The purpose of external assurance is to add independent specialist scrutiny before or during controlled market expansion.

## 10. Funding-boundary safeguard

Until explicit Founder authorization after the relevant application boundary:

- do not order a pentest;
- do not accept a binding offer;
- do not make payment;
- do not authorize testing against Production;
- do not activate Production Sentry merely to support C04;
- do not interpret this evidence record as procurement approval.

Non-binding market research and later non-binding quotation collection remain distinct from commencement of the service itself.

## 11. Current conclusion

C04 does **not** need to be reduced based on current market evidence.

A provisional **EUR 3,500** remains defensible for a narrowly scoped startup web-application security assessment.

However, the application must avoid describing this as a comprehensive enterprise-grade penetration test. A Klinnova-specific non-binding quotation remains required before final cost freeze if C04 is retained.
