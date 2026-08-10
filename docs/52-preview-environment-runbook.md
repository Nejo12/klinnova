# 52 — Preview Environment Runbook (M5.1 Unit F)

**Status: NOT YET PROVISIONED.** This document describes the intended
persistent Preview environment and the guarded tooling this repository now
ships to provision it safely. None of the external provisioning steps below
have been executed. `README.md`'s "Hosted environments" section remains
accurate: Preview is unconfigured until this runbook's steps are actually
carried out and this status banner is updated.

This is intentionally a **persistent** runbook, not a one-shot proof script.
It supersedes the throwaway proof-and-teardown pattern used by the earlier
hosted-proof runbooks (`docs/26`, `docs/32`, `docs/40`) and the ephemeral
Supabase branch used for the one-off M5.1 Unit A1 proof (`docs/49`, lines
319-336). Those were single-use proofs, each torn down same-day. Preview
readiness for M5 beta needs something that survives across many iterative
builds, so this runbook is meant to be followed once to stand Preview up,
then referenced repeatedly (not re-run from scratch) as Preview is used.

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

## Required environment variables (not yet set anywhere)

None of these are set in this repository, in CI, or in any Vercel project
today. They are the four inputs `pnpm preview:db:push` requires once the
external provisioning steps below have actually been carried out:

| Variable | Purpose |
| --- | --- |
| `STINT_PREVIEW_SUPABASE_URL` | Preview project's API URL, `https://<preview-ref>.supabase.co` |
| `STINT_PREVIEW_SUPABASE_DB_URL` | Preview project's direct Postgres connection string |
| `STINT_PREVIEW_SUPABASE_PROJECT_REF` | The Preview project's ref, explicitly |
| `STINT_PRODUCTION_SUPABASE_PROJECT_REF` | The Production project's ref (`kvrzmzoszitdicjvrprt` today), explicitly, so the guard can refuse it |

These are local/operator-shell inputs to the guarded push script, not
`NEXT_PUBLIC_*` values and not things this repository's `.env.example`
should carry — they must never be set in a way that exposes the Preview
database URL to the browser bundle.

## External provisioning steps (not yet executed — future work)

These require Supabase org, Resend, and Vercel account access this
repository's tooling does not have and cannot script:

1. **Create the standalone Preview Supabase project** (D-F1), same major
   Postgres version as Production (`17`, per `supabase/config.toml`).
   Record its project ref for `STINT_PREVIEW_SUPABASE_PROJECT_REF`.
2. **Push current migrations** to it via `pnpm preview:db:push` with all
   four `STINT_*` env vars set for that shell session only — never via
   `supabase link`.
3. **Verify `auth.stint.company` in Resend** (D-F2): add the DNS records
   Resend requires for that subdomain, wait for verification, obtain an
   API key.
4. **Configure the Preview project's Supabase Auth settings**: SMTP host
   pointed at Resend using the verified `auth.stint.company` sender
   (fields match the commented-out `[auth.email.smtp]` block already in
   `supabase/config.toml`, applied via the hosted project's dashboard, not
   that local file); `mailer_autoconfirm` left `false`; redirect-URL
   allow-list configured for the Vercel Preview URL pattern.
5. **Configure Vercel Preview-scoped environment variables**:
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   pointed at the new Preview project, and a Preview-scoped
   `SUPABASE_SERVICE_ROLE_KEY` (the Preview project's own — never
   Production's) so the Slice 8 account-deletion processor works there.
   Leave `NEXT_PUBLIC_SITE_URL` unset so the existing `VERCEL_URL` fallback
   in `src/lib/auth/site-origin.ts` keeps working per-deployment.
6. **Update this runbook's status banner** to PROVISIONED, with the date
   and the Preview project ref, and update `README.md`'s "Hosted
   environments" section to match reality.

## Manual acceptance journey (D-F4)

Run once, by a human, against the live Preview deployment after step 5
above:

1. Register a new candidate account using a real, reachable inbox.
2. Receive the confirmation email at that inbox — sent from
   `auth.stint.company` via Resend, not autoconfirmed — and click through.
3. Complete candidate onboarding.
4. Apply to a real (Preview-only, non-Production) vacancy fixture.
5. As an employer account in the same Preview project, record an outcome
   event on that application.
6. Confirm the Production project's data is untouched throughout (distinct
   project entirely — there is no shared database to check for leakage).

No further automated hosted E2E is required for this unit's acceptance.

## Ongoing use: reset, not teardown

Because this Preview project is meant to persist across iterative builds,
routine maintenance is a **data reset** (clearing test-created rows between
rounds of external testing), not a full project teardown-and-recreate.
Migrations stay in sync via repeated `pnpm preview:db:push` runs, same as
Production's own migration discipline — never `supabase db push --linked`
against Preview, and never against Production from this tooling.
