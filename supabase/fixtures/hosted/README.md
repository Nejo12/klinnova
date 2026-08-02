# Hosted Demo fixtures (D-031)

Owner-controlled fictional Demo vacancy set for Preview or Production verification of Slice 2.

## Rules

- Never applied by migrations, `pnpm install`, `pnpm build`, CI, Vercel, or app startup.
- Target environment and project ref are required.
- Credentials come only from a temporary `SUPABASE_DB_URL` environment variable — never from CLI arguments.
- Production requires `--confirm-production=I_UNDERSTAND_HOSTED_DEMO`.
- Deterministic IDs only (see `manifest.json`).
- Expiry is set to **now + 30 days** on each apply (refreshes known Demo rows only).
- Cleanup deletes only known fixture IDs; never uses table wipe commands; never deletes by `source = 'seed'`.
- Do not paste database URLs, passwords, access tokens, or service-role keys into issues, PRs, or verification evidence.

## Identifiers

| Kind                           | ID                                                           |
| ------------------------------ | ------------------------------------------------------------ |
| Company                        | `11111111-1111-4111-8111-111111111111` (Demo Berlin Work Co) |
| Vacancy (zero extra languages) | `22222222-2222-4222-8222-222222222201`                       |
| Vacancy (English requirement)  | `22222222-2222-4222-8222-222222222206`                       |
| Language requirement           | `33333333-3333-4333-8333-333333333301`                       |

These reuse the local/CI seed subset identities.

## Commands

Dry run (no database connection; `SUPABASE_DB_URL` not required):

```bash
pnpm fixtures:hosted:apply -- --env preview --project-ref <project-ref> --dry-run
```

Apply (Preview):

```bash
export SUPABASE_DB_URL='...'
pnpm fixtures:hosted:apply -- \
  --env preview \
  --project-ref <project-ref>
unset SUPABASE_DB_URL
```

Apply (Production — explicit confirmation required):

```bash
export SUPABASE_DB_URL='...'
pnpm fixtures:hosted:apply -- \
  --env production \
  --project-ref <project-ref> \
  --confirm-production=I_UNDERSTAND_HOSTED_DEMO
unset SUPABASE_DB_URL
```

Cleanup:

```bash
export SUPABASE_DB_URL='...'
pnpm fixtures:hosted:cleanup -- \
  --env preview \
  --project-ref <project-ref>
unset SUPABASE_DB_URL
```

Obtain the connection string from the Supabase project dashboard. Export it only for the command, then unset it. Do not commit it. Do not pass it as a CLI flag.

## Evidence you may record

- project ref
- environment (`preview` / `production`)
- timestamp
- fixture IDs
- printed `expires_at` values
- success/failure result

## Evidence you must not record

- database URL
- password
- access token
- service-role key

## Matching onboarding values (hosted smoke)

For the zero-language Demo vacancy (“Morning kitchen support”):

- German: basic comfort
- Additional language: English conversational (or higher)
- Work authorisation: Yes
- Location: Berlin travel band (e.g. up to 45 minutes)
- Category: Hospitality
- Available from: a near-future date
- Employment: Part time
- Shift: Morning

## Manual SQL Editor alternative

If preferred, paste `apply.sql` or `cleanup.sql` into the Supabase SQL Editor for the **selected** project only. Record project ref, timestamp, and resulting `expires_at` values — never connection strings.
