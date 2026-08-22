# K6 Production Cutover Durable Closure

**Status:** COMPLETE — K6-0 through K6-6 closed

**Closure date:** 2026-08-22

**Closure branch:** `docs/k6-6-durable-closure`

**Production repository baseline before this documentation closure:** `main` at `0564a5e749b65f5589d1bd2dc32f926b848a5493`

## Purpose

This document is the durable K6 closure record. It records the accepted repository and hosted evidence for the Klinnova Production/public-domain cutover after K6-4 Production + Design acceptance and K6-5 old-domain retirement.

This closure is documentation-only. It does not authorize or perform application-code changes, schema/database changes, hosted infrastructure mutations, Sentry activation, mail-configuration changes, or application-data changes.

K6 completion does not start Cohort A. Operational readiness remains ON HOLD until the Founder explicitly resumes it and later returns a GO/NO-GO decision.

## K6 sequence closure

```text
K6-0 decision lock
-> K6-1 exact cutover discovery
-> K6-2 repository Production-host conversion
-> K6-3 hosted Production cutover
-> K6-4 Production + Design acceptance
-> K6-5 old public-domain retirement
-> K6-6 durable closure
```

All K6 units are now closed.

## Repository evidence

### K6-0 / K6-1

- PR #135 — `docs(k6): lock production cutover discovery`
- Final reviewed head: `c314c762ddf5c3a693d408cfe9a2355c99effdce`
- Merge/main after PR #135: `e6a1a79a1f9b3511e2bced264486349a5d3563c3`
- Durable discovery/decision record: `docs/55-k6-production-cutover-discovery.md`

### K6-2

- PR #136 — `feat(k6): convert production host references`
- Final head: `73971054eb4275e0d8bfc534c47bcf97f1ca946c`
- Main after merge: `58eee9d19a646ea0d4f948aad0e237c7665d40d3`
- Canonical CI passed on the exact head, including migrations, 1,560 database tests, build, Chromium/WebKit E2E, auth/onboarding, publication/matching, candidate/employer navigation, recovery, and outcomes.
- Repository Production examples now use `https://klinnova.com`.
- `PRODUCTION_HOSTS` protects `klinnova.com`, `www.klinnova.com`, `stint.company`, and `www.stint.company`. The retired Stint hosts remain intentionally protected because redirects into Production are still Production-sensitive endpoints.

### K6-4 remediation merges

- PR #137 — bounded legal-state remediation.
  - Final head: `d76ef1c3c8278f48d25dfb264438dc142460ae41`
  - Main after merge: `3415f5eb09ec2b8cda5bacc82485eabb5e3e29e7`
- PR #138 — bounded authenticated/mobile responsive remediation.
  - Final head: `0340776f975a3b0883b491684204d039a2776003`
  - Merge/main: `0564a5e749b65f5589d1bd2dc32f926b848a5493`

The Production deployment verified after PR #138 was READY on exact GitHub SHA `0564a5e749b65f5589d1bd2dc32f926b848a5493`.

## Final hosted Production state

### Canonical public identity

Final intended and verified public Production identity:

`https://klinnova.com`

Verified behavior at K6-5 closure:

| Host | Final accepted behavior |
|---|---|
| `https://klinnova.com` | Canonical Production; HTTP 200 |
| `https://www.klinnova.com` | HTTP 308 permanent redirect to `https://klinnova.com` |
| `https://stint.company` | HTTP 308 permanent redirect to `https://klinnova.com` |
| `https://www.stint.company` | Not resolving / no active public hostname observed at closure |
| `https://preview.klinnova.com` | Custom project-domain attachment retired; wildcard Vercel DNS remains intentionally untouched |

The permanent old-domain redirect was verified with a non-root path and query string. `https://stint.company/jobs?source=k6` redirected with HTTP 308 to `https://klinnova.com/jobs?source=k6`, preserving path and query semantics.

`www.klinnova.com` was likewise verified as HTTP 308 to the canonical apex.

### Vercel

- Project remains internally named `stint`; internal infrastructure naming was intentionally not migrated.
- Production canonical domain: `klinnova.com`.
- `www.klinnova.com` is a permanent redirect to the apex.
- `stint.company` no longer serves the application directly; it permanently redirects to Klinnova.
- `preview.klinnova.com` was removed from the project's custom-domain list.
- The DNS zone contains a Vercel-managed wildcard record. Because that wildcard is platform-managed and shared infrastructure, it was intentionally preserved; K6 retirement is defined by removal of the custom Preview project attachment, not by forcing `preview.klinnova.com` to NXDOMAIN.
- Mail-related DNS records were not changed during K6-5 retirement.

### Production environment

- Production `NEXT_PUBLIC_SITE_URL`: `https://klinnova.com`.
- No K6-5 environment-variable mutation was required.
- No schema/data migration occurred in K6-5/K6-6.

## Supabase Auth final state

Production project ref remains:

`kvrzmzoszitdicjvrprt`

Accepted final Auth state:

- Site URL remains `https://klinnova.com`.
- Canonical Klinnova confirmation callback remains allowed.
- Vercel-generated Preview/Deployment redirect patterns remain available where required for Preview auth.
- The rollback-era `https://stint.company/**` redirect allowance was removed after permanent redirect verification.
- `auth.stint.company` was deliberately not retired or altered. It remains transitional Auth email-sender infrastructure unless separately migrated under a future authorized unit.

## K6-4 Production + Design acceptance summary

K6-4 accepted the live merged presentation baseline represented by PRs #119–#132 plus the bounded K6-4 remediations #137 and #138.

Accepted live evidence included:

- Klinnova-only public identity on checked public/auth/candidate/employer surfaces;
- homepage, jobs, login, registration, password recovery, auth confirmation, Terms, Privacy and Impressum availability;
- candidate and employer authenticated routing and role-oriented navigation;
- candidate matches/applications empty states against the real Production data baseline;
- responsive candidate/employer authenticated layouts and onboarding progress presentation;
- loading/skeleton accessibility semantics;
- reduced-motion behavior;
- legal-state wording corrected to the provisionally accepted launch state;
- no stale user-visible Stint branding in the checked Production surfaces;
- Production runtime health clean during accepted verification windows.

A fresh Production password-recovery flow was proven end-to-end after the canonical-domain cutover:

- message sender: Klinnova auth sender infrastructure;
- reset link used canonical `https://klinnova.com/auth/confirm?...` callback;
- confirmation reached the Klinnova recovery flow;
- password reset succeeded;
- subsequent login succeeded.

No Production business data was fabricated merely to manufacture K6 acceptance evidence.

## Production Sentry boundary

Production Sentry remains **OFF/unwired by deliberate Founder decision** for Cohort A.

K6 did not activate Production monitoring. Sentry trace metadata may be present in generated HTML because the repository integration exists, but accepted Production sampling remained zero/inert during verification. K6 closure must not be interpreted as Production Sentry activation.

## Mail boundary

K6 preserves the distinction between mail tracks:

- `support@klinnova.com` remains the human-facing support/privacy-contact mailbox under the current Cohort A decision;
- Supabase Auth confirmation/recovery behavior is proven on the canonical Klinnova callback path;
- `auth.stint.company` remains transitional sender infrastructure and was not silently coupled to the website-domain cutover;
- N1–N3 business/application transactional mail must be described only according to its separately verified evidence and is not upgraded by K6 closure.

No mail DNS or mail-provider configuration was changed during K6-5/K6-6.

## Legal-state boundary

Unit H remains closed for current launch sequencing by Founder decision. The merged legal surfaces are provisionally accepted for this launch path.

K6 completion is **not** a qualified German legal-review claim, complete statutory-compliance claim, or GDPR-compliance claim. The Founder intends to review/correct legal wording in the nearest future.

## Runtime-health closure

Post-retirement verification on 2026-08-22 confirmed:

- canonical apex serving successfully;
- permanent redirect behavior functioning for `www.klinnova.com` and `stint.company`;
- path/query preservation on the old-domain redirect;
- zero grouped Production runtime-error clusters in the checked window;
- zero error/fatal Production logs in the checked window;
- zero observed 5xx Production logs in the checked window.

## Mutations explicitly not performed

K6-5/K6-6 did not perform:

- database/schema mutations;
- application-data changes;
- product-feature changes;
- Sentry activation;
- mail DNS changes;
- Auth sender-domain migration;
- Preview environment rebuild;
- broad DNS cleanup;
- internal Stint infrastructure renaming.

## Final K6 verdict

**K6 — COMPLETE / CLOSED.**

Klinnova is the canonical Production public identity. The former Stint Production hostname is retired from direct serving and permanently redirects to Klinnova. The old custom `preview.klinnova.com` project attachment is retired. The rollback-era Stint Supabase Auth redirect allowance is removed. Production remains healthy under the accepted K6 evidence boundary.

## Post-K6 operating state

**Cohort A operational readiness remains ON HOLD / NOT STARTED.**

K6 completion does not authorize intentional Cohort A external traffic. Employer acquisition, candidate recruitment, founder-assisted onboarding, support/moderation operating preparation, and related operational work remain preserved for later Founder resumption.

A separate explicit Founder GO/NO-GO remains required before intentional Cohort A traffic begins.
