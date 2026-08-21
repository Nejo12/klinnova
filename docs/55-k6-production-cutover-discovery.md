# K6 Production Cutover Discovery

**Status:** K6-0/K6-1 current decision/discovery unit; decision locked.

**Date:** 2026-08-21

**Branch:** `docs/k6-production-cutover-discovery`

**Base:** `main` at `23d2693e3ba281e26b3c8359ad7f2e39f9504128`

## Purpose

This document locks the K6 Production/public-domain cutover decision and
records the exact discovery plan for the later Production cutover from the
current Stint Production domain to Klinnova's canonical public domain.

This is a documentation-only discovery/readiness unit. No hosted Production,
Preview, DNS, Vercel, Supabase, Resend, Sentry, domain, database, application
runtime, source, or config mutation is authorized or performed by this PR.

## Current K6 Decision

K6 is now the primary execution track.

K6-0/K6-1 are the current decision/discovery unit. After this PR is merged and
verified, **K6-2 is authorized to become the next implementation unit subject to
its normal bounded implementation approval**. K6-2 implementation is not
performed by this PR.

Current sequence:

```text
K6-0 decision lock
-> K6-1 exact cutover discovery
-> K6-2 repository Production-host conversion
-> K6-3 hosted Production cutover
-> K6-4 Production + Design acceptance
-> K6-5 old public-domain retirement
-> K6-6 durable closure
-> operational readiness remains ON HOLD until Founder resumes it
```

## K6-0 Decision Lock

K6-0 locks these decisions:

- Final intended public identity: `https://klinnova.com`.
- Current Production origin before K6: `https://stint.company`.
- `stint.company` is a retirement target.
- `preview.klinnova.com` is a retirement target as a custom public Klinnova
  host.
- Initial additive coexistence is allowed as a technical safety phase during
  cutover. This coexistence is not the desired final public state.
- K6-5 decides and executes the exact retirement mechanics after
  `https://klinnova.com` is proven.
- K6 does not rename internal infrastructure identifiers. The repository name,
  package name, Git history, Supabase project refs/names, Vercel project name,
  Sentry organization/project names, migration history, and historical
  documentation may continue to use Stint where they are internal or
  historical.
- Unit H is closed for current launch sequencing by Founder decision. The
  current merged legal surfaces are accepted provisionally for this launch path.
  Founder will review/correct legal wording in the nearest future. This is not
  a qualified legal-review claim, not a complete legal-compliance claim, and not
  a GDPR-compliance claim. Unit H must not block K6.
- Cohort A intentionally launches without Production Sentry. Production Sentry
  remains OFF/unwired by deliberate Founder decision. It is not an unresolved
  K6 blocker and must not be activated in K6.
- Employer acquisition, candidate recruitment, founder-assisted onboarding,
  support/moderation operating preparation, and other Cohort A operational work
  are ON HOLD. They are not complete. They do not block K6. Preserve their plans
  for later resumption.
- N1-N3 business transactional mail must not be falsely marked complete where
  repository/hosted evidence says otherwise. It also must not be a generic
  blocker to beginning K6 repository/domain cutover work. Any exact
  mail-domain/config dependency required for final Production acceptance is a
  K6 execution dependency to handle at the correct K6 step.
- `auth.stint.company` remains transitional for Supabase Auth email sender
  infrastructure unless a separate auth-sender migration is authorized. K6 may
  verify auth flows while that sender remains transitional; do not silently
  couple sender-domain migration to public-site cutover.
- The `NEXT_PUBLIC_SITE_URL` Production flip and the repository
  `PRODUCTION_HOSTS` safety-guard update must ship together during the later
  K6 implementation sequence.
- K6 completion does not by itself start Cohort A. After K6, Production
  verification, K6-6 closure, and an explicit Founder GO/NO-GO remain required.

## K6-1 Discovery Findings

### Current Repository Control Points

`NEXT_PUBLIC_SITE_URL` is the canonical public-origin input. It is parsed in
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
- Unit H is closed for current launch sequencing by Founder decision; no
  qualified legal/GDPR-compliance claim is made.
- Production schema catch-up is complete; Production migration history is
  recorded as 20/20 in `docs/53-m5.1-beta-readiness-closure.md`.
- Production still serves through `stint.company`.
- `klinnova.com` apex is not yet Production.
- `preview.klinnova.com` remains a custom Preview host and is a retirement
  target after K6 proof.
- Production `NEXT_PUBLIC_SITE_URL` has not been cut over.
- Production Supabase Auth settings were not changed by this discovery.
- Production Sentry remains OFF/unwired by deliberate Founder decision.
- N1-N3 business transactional mail has unresolved configuration evidence, but
  that is not a generic blocker to K6 repository/domain cutover work.
- Operational readiness work is ON HOLD and not a K6 blocker.
- Cohort A remains not started and requires later Founder resumption/GO.

### Mail Evidence Boundary

Do not conflate the separate mail tracks:

- the Zoho-hosted `support@klinnova.com` mailbox exists and is founder-owned;
- Klinnova mail-domain verification plus MX, SPF, and DKIM are recorded as
  complete for that human-facing support mailbox;
- Supabase Auth confirmation/recovery email behavior was proven in Preview
  during K3/K4 under the transitional `auth.stint.company` sender model;
- N1-N3 application transactional-mail code exists, but the durable C4D2 record
  says Production Resend configuration for that path was not generally
  Production-ready at the time it was inspected.

K6 must preserve current evidence rather than falsely upgrading or downgrading
it. If final Production acceptance requires exact mail-domain/config work, that
work belongs at the relevant K6 execution step and must be authorized there.

## K6 Implementation Slices

### K6-2 - Repository Production-host Conversion

Later bounded implementation unit. Expected repository-side changes:

- update `src/lib/proof/local-environment-guard.ts` so `PRODUCTION_HOSTS`
  includes `klinnova.com` and `www.klinnova.com` while retaining
  `stint.company` and `www.stint.company` during coexistence;
- update the corresponding local-environment-guard tests;
- update `.env.example` comments so Production examples name
  `https://klinnova.com`;
- update auth/site-origin tests and transactional-email URL tests where their
  fixture value intentionally represents the canonical Production origin;
- update or add focused K6 verification/runbook documentation for the exact
  hosted acceptance flow.

No schema, RLS, product workflow, pricing, matching, application-status,
account-deletion, or design-system change is expected for K6-2.

### K6-3 - Hosted Production Cutover

Later separately authorized hosted execution unit. Expected order:

1. Preflight exact repository head, current Production deployment, current
   Vercel domain state, current Production `NEXT_PUBLIC_SITE_URL`, current
   Supabase Auth Site URL/redirect allow-list, DNS state, and current approved
   Production Sentry/mail state.
2. Add `klinnova.com` to the Vercel Production project as a Production domain
   while preserving temporary technical safety access to current Stint domains.
3. Configure required DNS for `klinnova.com`/`www.klinnova.com` according to
   Vercel's presented target records.
4. Add Klinnova Production URLs to Supabase Auth allow-list additively while
   preserving rollback-safe Stint/Auth allowances until K6-5.
5. Deploy the K6-2 repository conversion.
6. Flip Production `NEXT_PUBLIC_SITE_URL` to `https://klinnova.com` and
   redeploy.
7. Run K6-4 Production + Design acceptance before any Cohort A traffic.

If Vercel requires apex/www canonical behavior selection, the K6 operator must
record the chosen behavior explicitly before applying it. The current decision
locks the apex `https://klinnova.com` as canonical.

### K6-4 - Production + Design Acceptance

K6-4 must verify the merged Production acceptance baseline on live
`https://klinnova.com`.

Approved baseline:

- PR #119 - P1 Homepage Presentation.
- PR #120 - P2 Candidate Presentation Polish.
- PR #121 - P3 Employer Presentation Polish.
- PR #122 - P3.5 loading/transition/performance discovery.
- PR #125 - P3.6 loading transition UX.
- PRs #126-#132 - P3.7 measured-performance closure.

K6-4 must verify the approved views, loading states, transitions, motion,
reduced-motion behavior, responsive behavior, and accessibility requirements on
live `https://klinnova.com`.

Minimum Production verification:

- `https://klinnova.com` resolves and serves the intended Production build;
- `www.klinnova.com` behavior is recorded and matches the approved canonical
  behavior;
- `https://stint.company`, `https://www.stint.company`, and
  `https://preview.klinnova.com` behavior is recorded as temporary/coexistence
  or retirement-target behavior, not final desired state;
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
- Production Sentry remains OFF/unwired;
- N1-N3 transactional mail remains in the approved state for K6, with any exact
  required mail-domain/config dependency handled at its authorized K6 step;
- Production Supabase project ref remains `kvrzmzoszitdicjvrprt`;
- Preview Supabase project behavior is not degraded.

### K6-5 - Old Public-Domain Retirement

K6-5 decides and executes exact retirement mechanics only after
`https://klinnova.com` is proven.

Retirement targets:

- `stint.company`;
- `www.stint.company`;
- `preview.klinnova.com` as a custom public Klinnova host.

Possible mechanics include redirect, continued temporary serving, removal, or a
phased plan, but this document does not pre-select the exact mechanics. K6-5
must record the chosen behavior and rollback posture before execution.

### K6-6 - Durable Closure

K6-6 records:

- exact Git SHA deployed;
- exact hosted settings changed;
- exact domain/DNS/Auth/Site URL state after K6;
- K6-4 acceptance evidence;
- K6-5 old-domain/Preview-host retirement evidence;
- approved Production Sentry state;
- approved mail state;
- no unauthorized Production/Preview/Supabase/Resend/Sentry mutation;
- Cohort A remains stopped until Founder explicitly resumes operational
  readiness and returns GO/NO-GO.

## Rollback Plan

Rollback remains safest while old Stint domains and Supabase Auth Stint URLs
are retained during the cutover window.

Minimum rollback:

1. set Production `NEXT_PUBLIC_SITE_URL` back to `https://stint.company`;
2. redeploy Production;
3. restore Supabase Auth Site URL to the Stint Production URL if it had been
   changed;
4. keep Klinnova domain attachment in place or disable it only with explicit
   Founder approval after rollback evidence;
5. verify login, signup confirmation, password recovery, candidate and employer
   journeys on the restored Stint origin.

Do not delete old-domain or Klinnova-domain configuration as a first rollback
step. Preserve coexistence during incident response unless a specific
retirement step has already been accepted.

## Stop Conditions

Stop K6 execution immediately if any of these occur:

- Production `main` is not at the expected authorized SHA;
- worktree or PR branch includes non-K6 product/schema changes;
- Vercel domain instructions differ materially from the runbook;
- Supabase Auth cannot allow required Klinnova and rollback-safe Stint origins
  additively during the cutover window;
- auth cookies or redirects fail between registration, confirmation, login, and
  password recovery;
- `PRODUCTION_HOSTS` does not protect every active Production host;
- legal/support surfaces are not in the current provisionally accepted launch
  state;
- Production Sentry is accidentally activated;
- N1-N3 mail configuration differs from the approved K6 boundary for that step;
- any hosted mutation would touch Preview/Production systems outside the
  explicit K6 authorization.

## Non-Goals

K6 does not authorize:

- Cohort A traffic or Founder GO;
- Production Sentry activation;
- generic Resend transactional-mail activation outside exact K6 acceptance
  dependencies;
- auth sender-domain migration away from `auth.stint.company` unless a K6 step
  explicitly authorizes it;
- schema/RLS migrations;
- product feature work;
- legal drafting or legal/GDPR compliance claims;
- final old-domain or `preview.klinnova.com` retirement before K6-5;
- Preview environment rebuild;
- design-system changes.

## Current Recommendation

Classify K6 as **DECISION LOCKED / PRIMARY EXECUTION TRACK**.

K6-2 should be the next implementation unit after PR #135 is merged and
verified, subject to its normal bounded implementation approval. Unit H,
Production Sentry, N1-N3 transactional-mail uncertainty, and operational
readiness must not be described as generic blockers to beginning K6
repository/domain cutover work.
