# K6 Production Cutover Discovery

**Status:** Discovery complete; decision locked; implementation not authorized.

**Date:** 2026-08-21

**Branch:** `docs/k6-production-cutover-discovery`

**Base:** `main` at `23d2693e3ba281e26b3c8359ad7f2e39f9504128`

## Purpose

This document locks the K6 Production/public-domain cutover decision and
records the smallest safe execution plan for a later, separately authorized
Production cutover from the current Stint Production domain to Klinnova's
canonical public domain.

This is a discovery/readiness document only. No hosted Production, Preview,
DNS, Vercel, Supabase, Resend, Sentry, domain, database, or application
runtime mutation is authorized or performed by this document.

## K6-0 Decision Lock

K6-0 locks these decisions for the later cutover unit:

- Canonical future public origin: `https://klinnova.com`.
- Current Production origin before K6: `https://stint.company`.
- Current `www.stint.company` behavior remains historical/current Production
  behavior until K6 or a later separately authorized old-domain disposition
  changes it.
- `stint.company` and `www.stint.company` must remain available through the
  initial cutover window. Do not remove, disconnect, redirect, or decommission
  the old domain during K6 unless a separate explicit old-domain disposition
  is approved.
- K6 does not rename internal infrastructure identifiers. The repository name,
  package name, Git history, Supabase project refs/names, Vercel project name,
  Sentry organization/project names, migration history, and historical
  documentation may continue to use Stint where they are internal or
  historical.
- Production Sentry remains separately gated. K6 may not enable Production
  Sentry unless Unit H/legal/privacy review and a separate founder
  authorization explicitly include that action.
- N1-N3 business transactional mail remains separately gated. K6 may not
  configure Production `RESEND_API_KEY`, `MAIL_FROM_ADDRESS`, `MAIL_TRANSPORT`,
  or Resend Klinnova sending-domain DNS unless a separate transactional-mail
  authorization explicitly includes those actions.
- `auth.stint.company` remains transitional for Supabase Auth email sender
  infrastructure unless a separate auth-sender migration is authorized. K6 may
  verify auth flows while that sender remains transitional; do not silently
  couple sender-domain migration to public-site cutover.
- The cutover must be additive before canonical: attach/allow Klinnova first,
  prove it, then flip the canonical app origin.
- The `NEXT_PUBLIC_SITE_URL` Production flip and the repository
  `PRODUCTION_HOSTS` safety-guard update must ship together when K6
  implementation is later authorized.
- K6 completion does not by itself start Cohort A. After K6, Production
  verification and an explicit founder GO/NO-GO are still required.

## K6-1 Discovery Findings

### Current Repository Control Points

`NEXT_PUBLIC_SITE_URL` is the canonical public origin input. It is parsed in
`src/lib/env/public.ts` and consumed by `src/lib/auth/site-origin.ts` to build:

- Supabase Auth signup confirmation redirects;
- password recovery redirects;
- same-app confirm/callback redirect allow-list behavior;
- business transactional-email links when N1-N3 mail is configured.

`resolveSiteOrigin()` precedence remains:

1. `NEXT_PUBLIC_SITE_URL`;
2. `VERCEL_URL`;
3. `http://localhost:3000`.

`resolveRedirectOrigin()` does not trust arbitrary request host headers. It
allows only `localhost:3000`, `127.0.0.1:3000`, and the host derived from the
resolved fallback origin.

`src/lib/proof/local-environment-guard.ts` currently protects local proof
commands from Production by hardcoding:

```text
stint.company
www.stint.company
```

That guard must recognize Klinnova Production at the exact moment Production's
canonical origin changes.

### Current Hosted/Readiness State

- K0-K5 Klinnova public-identity readiness is complete.
- KDS is complete.
- Unit I device/browser/accessibility readiness is complete.
- Production schema catch-up is complete; Production migration history is
  recorded as 20/20 in `docs/53-m5.1-beta-readiness-closure.md`.
- Production still serves through `stint.company`.
- `klinnova.com` apex is not yet Production.
- Production `NEXT_PUBLIC_SITE_URL` has not been cut over.
- Production Supabase Auth settings were not changed by this discovery.
- Production Sentry remains disabled/unwired.
- N1-N3 business transactional mail is not Production-ready.
- Unit H remains not complete; qualified legal review and final legal/support
  implementation remain open.
- Cohort A remains blocked.

### Repository Changes Expected In Later K6 Implementation

When K6 implementation is later explicitly authorized, the repository-side
change set should stay narrow:

- update `src/lib/proof/local-environment-guard.ts` so
  `PRODUCTION_HOSTS` includes `klinnova.com` and `www.klinnova.com` while
  retaining `stint.company` and `www.stint.company`;
- update the corresponding local-environment-guard tests;
- update `.env.example` comments so Production examples name
  `https://klinnova.com`;
- update auth/site-origin tests and transactional-email URL tests where their
  fixture value intentionally represents the canonical Production origin;
- add or update a focused K6 verification/runbook record with exact hosted
  evidence after execution.

No schema, RLS, product workflow, pricing, matching, application-status,
account-deletion, or design-system change is expected for K6.

### Hosted Changes Expected In Later K6 Execution

K6 execution should be performed only after explicit authorization and should
use the following order:

1. Preflight exact repository head, current Production deployment, current
   Vercel domain state, current Production `NEXT_PUBLIC_SITE_URL`, current
   Supabase Auth Site URL/redirect allow-list, DNS state, and current
   Production Sentry/mail state.
2. Add `klinnova.com` to the Vercel Production project as an additional
   Production domain; keep `stint.company` attached.
3. Configure required DNS for `klinnova.com`/`www.klinnova.com` according to
   Vercel's presented target records.
4. Add Klinnova Production URLs to Supabase Auth allow-list additively; keep
   existing Stint/Auth URLs until rollback/no-regression evidence is accepted.
5. Deploy the repository-side `PRODUCTION_HOSTS` and fixture-comment update.
6. Flip Production `NEXT_PUBLIC_SITE_URL` to `https://klinnova.com` and
   redeploy.
7. Run Production verification before any Cohort A traffic.

If Vercel requires apex/www canonical behavior selection, the K6 operator must
record the chosen behavior explicitly before applying it. The current decision
locks the apex `https://klinnova.com` as canonical; it does not silently decide
old-domain redirection or decommissioning.

## Required K6 Preconditions

K6 must not begin until all of the following are true or explicitly
dispositioned by the founder:

- Unit H is complete or the founder explicitly accepts a narrower legal/support
  readiness disposition for cutover.
- Qualified legal review has cleared public legal/support surfaces under
  Klinnova identity.
- Production Sentry has an explicit decision: remain disabled/unwired for K6,
  or activate under separately approved legal/privacy terms.
- N1-N3 transactional-mail Production readiness is either completed or
  explicitly excluded from K6 with accepted user-communication consequences.
- Existing Preview/domain/auth learnings from K3/K4 remain valid or have been
  refreshed.
- No retained Production Demo fixtures remain.
- Current `main` is deployable and exact-head CI is acceptable.

## K6 Verification Requirements

Production verification after the later cutover must include at minimum:

- `https://klinnova.com` resolves and serves the intended Production build;
- `www.klinnova.com` behavior is recorded and matches the approved canonical
  behavior;
- `https://stint.company` and `https://www.stint.company` behavior is recorded;
- registration works with a real confirmation email;
- confirmation redirects to `klinnova.com`;
- login, logout, and re-login work;
- password recovery request sends a real reset email;
- reset redirects to `klinnova.com`;
- password change succeeds;
- candidate onboarding/matches/job detail/application path works;
- employer registration/onboarding/verification/vacancy publication path works,
  using the approved Production operator procedure rather than direct data
  fabrication;
- employer application review and outcome recording works;
- account export works from canonical origin;
- legal/support navigation resolves under Klinnova identity;
- metadata/favicon/Klinnova branding is visible;
- no stale user-visible Stint branding appears on public/auth/candidate/employer
  surfaces, excluding intentionally internal/historical identifiers;
- Production Sentry remains in the approved state for K6;
- N1-N3 transactional mail remains in the approved state for K6;
- Production Supabase project ref remains `kvrzmzoszitdicjvrprt`;
- Preview Supabase project and Preview domain behavior are not degraded.

## Rollback Plan

Rollback remains cheap only if old Stint domains are kept attached and
Supabase Auth Stint URLs are kept allowed during the cutover window.

Minimum rollback:

1. set Production `NEXT_PUBLIC_SITE_URL` back to `https://stint.company`;
2. redeploy Production;
3. restore Supabase Auth Site URL to the Stint Production URL if it had been
   changed;
4. keep Klinnova domain attachment in place or disable it only with explicit
   founder approval after rollback evidence;
5. verify login, signup confirmation, password recovery, candidate and employer
   journeys on the restored Stint origin.

Do not delete old-domain or Klinnova-domain configuration as a first rollback
step; preserving coexistence is safer than destructive cleanup during an
incident.

## Stop Conditions

Stop K6 execution immediately if any of these occur:

- Production `main` is not at the expected authorized SHA;
- worktree or PR branch includes non-K6 product/schema changes;
- Vercel domain instructions differ materially from the runbook;
- Supabase Auth cannot allow both Stint and Klinnova origins additively;
- auth cookies or redirects fail between registration, confirmation, login, and
  password recovery;
- `PRODUCTION_HOSTS` does not protect the canonical Production host;
- legal/support surfaces are not in the approved state for public cutover;
- Production Sentry or N1-N3 mail configuration differs from the approved K6
  boundary;
- any hosted mutation would touch Preview/Production systems outside the
  explicit K6 authorization.

## Non-Goals

K6 does not authorize:

- Cohort A traffic or founder GO;
- Production Sentry activation unless separately approved;
- Resend transactional-mail activation unless separately approved;
- auth sender-domain migration away from `auth.stint.company`;
- schema/RLS migrations;
- product feature work;
- legal drafting or legal compliance claims;
- old-domain redirect/decommissioning beyond explicit founder approval;
- Preview environment rebuild;
- design-system changes.

## Current Recommendation

Classify K6 as **DECISION LOCKED / NOT READY TO EXECUTE**.

The path is technically straightforward and should remain a narrow cutover
unit, but execution should wait until Unit H/legal-support state, Production
Sentry disposition, and transactional-mail disposition are explicitly resolved
or accepted as K6 exclusions.
