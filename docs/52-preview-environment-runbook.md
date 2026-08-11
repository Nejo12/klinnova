# 52 — Preview Environment Runbook (M5.1 Unit F)

**Status: PROVISIONED.** Provisioned and accepted **2026-08-11** (M5.1 Unit
F2). The persistent Preview environment described below is real: a
standalone Supabase project (`stint-preview`, ref `klgrrqladmdtgnrggnsc`),
verified Resend-backed confirmation email, and Vercel Preview-scoped
environment variables. `README.md`'s "Hosted environments" section has been
updated to match. See "Provisioning record (2026-08-11)" below for what was
actually done and "Manual acceptance journey (D-F4) — completed 2026-08-11"
for the acceptance evidence.

This is intentionally a **persistent** runbook, not a one-shot proof script.
It supersedes the throwaway proof-and-teardown pattern used by the earlier
hosted-proof runbooks (`docs/26`, `docs/32`, `docs/40`) and the ephemeral
Supabase branch used for the one-off M5.1 Unit A1 proof (`docs/49`, lines
319-336). Those were single-use proofs, each torn down same-day. The
`stint-preview` Supabase project and the Vercel Preview-scoped
configuration below are the persistent parts, meant to survive across many
iterative builds and be referenced repeatedly, not re-provisioned from
scratch. The one specific smoke-test branch deployment used to run the
acceptance journey
(`https://stint-git-chore-preview-f2-smoke-olaniyis-projects.vercel.app`)
was not itself persistent — it was only the vehicle for proving the
persistent environment works; any future branch's Preview deployment is
covered by the same Supabase project and the same Vercel/redirect
configuration.

## Governing decisions

- **D-F1** — Persistent Preview uses a **standalone Supabase project**, not
  a branch of the Production project (`kvrzmzoszitdicjvrprt`). Full
  isolation: its own database, its own Auth configuration, its own billing
  and quota.
- **D-F2** — Preview's confirmation emails go through a **verified dedicated
  mail subdomain**, preferably `auth.stint.company`, via Resend SMTP. Do
  **not** rely on `resend.dev` or any other shared/unverified sending
  domain, and do **not** set `mailer_autoconfirm = true` as a standing
  Preview policy — real email delivery must be exercised.
- **D-F3** — No new runtime `VERCEL_ENV`/Production-branching logic was
  added to application code (`src/app`, `src/lib` outside `src/lib/proof`).
  Discovery for this unit found no concrete application-code case that
  needs one — `src/lib/auth/site-origin.ts`'s existing
  `NEXT_PUBLIC_SITE_URL → VERCEL_URL → localhost` fallback already handles
  Preview correctly. Safety instead lives in the provisioning/push
  preflight guard described below, which fails closed.
- **D-F4** — Acceptance for this unit is **one controlled manual hosted
  journey** with real email confirmation (register → real inbox → real
  confirmation email → onboard → apply → employer records an outcome →
  confirm Production is untouched). Broad automated Preview E2E is not
  required for this unit.

## What this repository now ships (code, not provisioning)

- `src/lib/proof/preview-target-guard.ts` — `assertPreviewSupabaseTarget()`.
  Fails closed unless both `expectedPreviewProjectRef` and
  `expectedProductionProjectRef` are supplied, are not equal to each other,
  and the Preview API URL and Preview database URL both structurally
  resolve (via their `<ref>.supabase.co` / `db.<ref>.supabase.co` hostname)
  to the same, explicitly-configured Preview ref — never to the configured
  Production ref. No name, label, or URL "looks like Preview" heuristic is
  trusted; only explicit ref comparison.
- `src/lib/proof/preview-db-push.ts` — `runPreviewDbPush()`. Runs the guard
  first; only reaches the injectable `runner` (defaults to
  `node:child_process.spawnSync`) once the target has been verified. Always
  invokes `supabase db push --db-url <...>`, never `--linked`.
- `scripts/proof/preview-target.mts` — the thin `pnpm preview:db:push`
  entry point wrapping `runPreviewDbPush()`, matching the existing
  `scripts/proof/*.mts` convention (`migration-inventory.mts`,
  `slice4.mts`).
- Both `preview-target-guard.ts` and `preview-db-push.ts` are unit tested
  with fabricated, clearly-fake project refs
  (`previewfakeref000000`/`productionfakeref9999`) and an injected fake
  runner. **No test in this repository, and no command run while building
  this runbook, has ever invoked `supabase` against a real hosted target.**
  Running `pnpm preview:db:push` today, with no `STINT_PREVIEW_*` env vars
  configured, fails closed immediately and reaches no network call — this
  has been verified.

`scripts/proof/preview-target.mts` deliberately does **not** auto-load
`.env.local`/`.env`, unlike `scripts/proof/slice4.mts` and the other
local-only proof scripts. Those scripts only ever target local Supabase,
so implicit dotenv loading is harmless convenience. `preview:db:push` is
different in kind: it is an eventual **hosted-mutation** command, so its
four `STINT_*` inputs must be supplied explicitly in the invoking shell's
process environment for that one invocation — never sourced implicitly
from a dotenv file that could be stale, wrong, or left over from an
unrelated task, which would otherwise let a hosted push happen without
the operator having consciously set its target that session.

## Guarded push script inputs (intentionally never persisted anywhere)

These four `STINT_*` variables are the inputs `pnpm preview:db:push`
requires, and remain — by design, unchanged since F1 — never set in this
repository, in CI, or in any Vercel project. They are operator-shell-only,
supplied fresh for each guarded push invocation, never sourced from a
dotenv file (see "Deliberately does NOT auto-load .env.local/.env" above):

| Variable | Purpose |
| --- | --- |
| `STINT_PREVIEW_SUPABASE_URL` | Preview project's API URL, `https://klgrrqladmdtgnrggnsc.supabase.co` |
| `STINT_PREVIEW_SUPABASE_DB_URL` | Preview project's direct Postgres connection string |
| `STINT_PREVIEW_SUPABASE_PROJECT_REF` | `klgrrqladmdtgnrggnsc` |
| `STINT_PRODUCTION_SUPABASE_PROJECT_REF` | `kvrzmzoszitdicjvrprt`, so the guard can refuse it |

These are not `NEXT_PUBLIC_*` values and not things this repository's
`.env.example` should carry — they must never be set in a way that exposes
the Preview database URL to the browser bundle.

## Vercel Preview-scoped application environment variables (now configured)

Separately from the guard's own inputs above, these three app-runtime
variables are now configured in Vercel, **Preview scope only** — never
Production:

| Variable | Configured to |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://klgrrqladmdtgnrggnsc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The Preview project's publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | The Preview project's own service-role key (never Production's) |

`NEXT_PUBLIC_SITE_URL` remains unset for Preview (Production-only), so the
existing `VERCEL_URL` fallback in `src/lib/auth/site-origin.ts` keeps
resolving the correct per-deployment origin, unchanged from the F1 plan.

## Provisioning record (2026-08-11)

All six steps below were carried out (M5.1 Unit F2), each by the operator
directly in the respective provider's dashboard/CLI — this repository's
tooling has no credentials for any of these services and did not perform
any of them itself:

1. **Standalone Preview Supabase project created** (D-F1): `stint-preview`,
   project ref `klgrrqladmdtgnrggnsc`, API URL
   `https://klgrrqladmdtgnrggnsc.supabase.co`. A distinct project from
   Production (`kvrzmzoszitdicjvrprt`) in every respect — not a branch of
   it.
2. **Current migrations pushed** via the guarded `pnpm preview:db:push`
   path. The F1 preflight guard verified the target project ref
   (`klgrrqladmdtgnrggnsc`) before any mutation and explicitly excluded the
   Production ref. No `supabase link` was used at any point. Production was
   not targeted.
3. **`auth.stint.company` verified in Resend** (D-F2): DNS verification
   passed.
4. **Preview project's Supabase Auth SMTP configured**: custom SMTP via
   `smtp.resend.com`, sender `no-reply@auth.stint.company`.
   `mailer_autoconfirm` remains disabled — real email confirmation delivery
   was exercised, not bypassed.
5. **Preview Auth URL configuration set**: Site URL configured for the
   Preview deployment; Redirect URLs wildcard set to
   `https://*-olaniyis-projects.vercel.app/**`. Real confirmation links
   were confirmed to return users to the Preview application.
6. **Vercel Preview-scoped environment variables configured** —
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` — Preview scope only, never Production.
   `NEXT_PUBLIC_SITE_URL` remains unset for Preview. The resulting Preview
   deployment reached Ready state; smoke checks on `/`, `/login`,
   `/register` passed.

## Manual acceptance journey (D-F4) — completed 2026-08-11

Run once, by a human, against the live Preview deployment
(`https://stint-git-chore-preview-f2-smoke-olaniyis-projects.vercel.app` —
a smoke-test branch deployment used only to prove the persistent
environment works, not itself part of the persistent environment):

1. Candidate registration, using a real, reachable inbox.
2. Real Resend confirmation email received at that inbox — sent from
   `auth.stint.company`, not autoconfirmed — and clicked through, correctly
   redirecting back to the Preview application.
3. Candidate onboarding completed.
4. Employer registration/onboarding completed.
5. Employer verification request submitted, and approved by a separate
   Preview-only verification operator (see "Preview verification operator"
   below) through the real `/internal/verification` UI — not by directly
   mutating the employer's verification state.
6. Vacancy published.
7. Candidate matched to the vacancy and applied.
8. Employer recorded a M5.1 Unit E outcome on that application.
9. Candidate saw the candidate-safe projection of that outcome.
10. Confirmed Production was untouched throughout — trivially true here,
    since Preview is a fully separate Supabase project with no shared
    database to leak into.

This ran the full application journey rather than the originally-scoped
minimal six steps, because publishing a vacancy required a verified
employer, which required standing up a verification path — see below.

No further automated hosted E2E is required for this unit's acceptance.

### Preview verification operator

A Preview-only verification operator was administratively bootstrapped
through the existing `verification_operators` contract to make the
`/internal/verification` approval step above possible (operator id
`66837767-21db-4782-9421-0db1b4aa13fc`). Nothing in this runbook or in the
verification-operator product contract currently requires this operator to
be removed or rotated, and it has not been removed. Its ongoing retention
is an open item for a separate decision, not something this closure
resolved.

## Ongoing use: reset, not teardown

Because this Preview project is meant to persist across iterative builds,
routine maintenance is a **data reset** (clearing test-created rows between
rounds of external testing), not a full project teardown-and-recreate.
Migrations stay in sync via repeated `pnpm preview:db:push` runs, same as
Production's own migration discipline — never `supabase db push --linked`
against Preview, and never against Production from this tooling.
