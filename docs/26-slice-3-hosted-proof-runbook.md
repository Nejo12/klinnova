# Slice 3 Hosted-Proof Runbook

Owner-authorized procedure for hosted Slice 3 exit proof. **Do not execute** as
part of ordinary development, CI, or PR 3.5 local exit-proof work.

Local exit evidence lives in `docs/25-slice-3-exit-proof.md`. Hosted Demo fixture
tooling remains `supabase/fixtures/hosted/` (D-031). Application records created
during hosted proof require an explicit retention or cleanup decision before
Slice 3 can be marked Done (D-045).

**Slice 3 is not Done until hosted proof is recorded and closure docs are
updated.**

---

## Non-negotiable safety rules

- Never run hosted steps from install, build, migrate, CI, Vercel, or app startup.
- Never paste database URLs, passwords, access tokens, or service-role keys into
  issues, PRs, chat, or evidence docs.
- Credentials only via a temporary `SUPABASE_DB_URL` environment variable.
- Unset credentials immediately after each hosted command.
- Never pass connection strings as CLI arguments.
- Never claim hosted evidence that was not actually executed.
- Prefer Preview. Production requires explicit owner authorization for that run.

---

## Known Production identifiers (already tracked; not secrets)

Recorded previously in `docs/21-slice-2-closure.md` and the founder dashboard:

| Field | Value |
|-------|--------|
| Application | `https://stint.company` |
| Production project ref | `kvrzmzoszitdicjvrprt` |
| Demo company ID | `11111111-1111-4111-8111-111111111111` |
| Morning kitchen vacancy ID | `22222222-2222-4222-8222-222222222201` |
| English-requirement vacancy ID | `22222222-2222-4222-8222-222222222206` |
| Demo fixture retention (Slice 2) | Retained until 2026-09-02 expiry unless cleaned up |

These are project/fixture identifiers only. They are not credentials.

---

## A. Preview environment — preferred

### A.1 Requirements

- Isolated Vercel Preview deployment for the Slice 3-ready commit
- Isolated or branch-safe Supabase project/environment for Preview
- Confirmed project ref for that Preview Supabase project
- Temporary database URL available only for apply/migration/cleanup steps
- Mail/Auth path that allows fresh candidate registration and confirmation
- Deterministic fictional Demo fixtures (same IDs as local/hosted fixture set)

### A.2 Preflight

1. Confirm the Preview app URL and that it points at the intended Preview
   Supabase project (URL + publishable key only in Vercel).
2. Confirm project ref matches the intended Preview project.
3. Inspect remote migration status for that project (owner-controlled; do not
   push blindly).
4. Confirm Demo fixtures are present or schedule `pnpm fixtures:hosted:apply`
   with `--env preview --project-ref <preview-ref>`.
5. Decide application-record retention/expiry/cleanup **before** creating proof
   applications.

### A.3 Migration plan (Preview)

1. Compare local migration history to the Preview project.
2. Apply only missing Slice 3 migration(s) intentionally if needed
   (`20260803120000_applications_schema_and_submit_rpc.sql` and any earlier
   missing migrations).
3. Re-check that applications schema, privileges, RLS, and
   `submit_candidate_application` exist.
4. Record migration result and timestamp — never credentials.

### A.4 Fixture setup (Preview)

```bash
export SUPABASE_DB_URL='...'
pnpm fixtures:hosted:apply -- --env preview --project-ref <preview-ref>
unset SUPABASE_DB_URL
```

Dry-run first if desired:

```bash
pnpm fixtures:hosted:apply -- --env preview --project-ref <preview-ref> --dry-run
```

### A.5 Candidate journey checklist (Preview)

Use a fresh candidate email for each proof run.

1. Unauthenticated `/candidate/matches`, `/candidate/jobs/{id}`, and
   `/candidate/applications/{id}` redirect to login without protected content.
2. Register → confirm → incomplete candidate redirected from matches/detail.
3. Complete essentials with morning-kitchen matching values (see hosted fixture
   README).
4. Open `/candidate/matches` and verify Demo morning kitchen vacancy.
5. Open `/candidate/jobs/22222222-2222-4222-8222-222222222201`.
6. Verify privacy-safe detail, preview, exact disclosure, work-authorisation
   notice.
7. Submit once → redirect to `/candidate/applications/{applicationId}`.
8. Verify confirmation copy, snapshot-backed employer/candidate fields, no UUID
   in page text, no Withdraw/Submit again/employer-response promises.
9. Reload confirmation; content persists.
10. Job detail shows Applied; preview/Submit absent; View application works.
11. Matches shows Applied and View application.
12. Duplicate submission (UI blocked + Auth-bound RPC if used) returns the same
    application ID; only one row exists for the pair.
13. Second candidate cannot read the first candidate’s confirmation URL.
14. Malformed application ID shows generic unavailable.
15. Withdrawn/unavailable vacancy cannot be submitted.
16. Non-matching completed candidate cannot reach Submit for morning kitchen.
17. Optional historical check: change current profile display name and confirm
    receipt still shows original snapshot values.

### A.6 Ownership / lifecycle denials (Preview)

Record pass/fail for:

- unauthenticated denial
- incomplete denial
- foreign confirmation denial
- withdrawn/unavailable vacancy denial
- non-matching denial
- duplicate single-row proof

### A.7 Cleanup or retention (Preview)

Choose and record one:

- **Cleanup now:** owner-scoped deletion of proof application rows and proof
  Auth users only (no table wipe; no `source = 'seed'` mass delete).
- **Retain with expiry:** note retention window and who owns cleanup.
- Fixture cleanup if Preview fixtures should not remain:

```bash
export SUPABASE_DB_URL='...'
pnpm fixtures:hosted:cleanup -- --env preview --project-ref <preview-ref>
unset SUPABASE_DB_URL
```

### A.8 Evidence to record (Preview)

- environment = `preview`
- project ref
- Preview app URL
- commit SHA proven
- timestamps
- fixture IDs / expires_at
- journey checklist results
- retention/cleanup decision
- confirmation that credentials were unset

Do **not** record URLs with passwords, tokens, or keys.

---

## B. Production fallback — owner-authorized only

Production proof is permitted only after explicit owner authorization for that
specific run. Prefer Preview whenever practical.

### B.1 Preflight identity verification

1. Confirm authorization to use Production for this proof run.
2. Confirm project ref is exactly `kvrzmzoszitdicjvrprt` (or the current
   documented Production ref if intentionally changed in tracked docs).
3. Confirm application URL is `https://stint.company`.
4. Confirm Vercel Production public env points at that project.
5. Confirm Demo fixture retention status and expiry (currently retained until
   2026-09-02 unless cleaned up).

### B.2 Remote migration status inspection

1. Inspect remote migration history for the Production project.
2. Confirm whether `20260803120000_applications_schema_and_submit_rpc.sql` is
   already applied.
3. Write an explicit migration plan before any push.
4. Do not apply unrelated migrations.
5. Do not run destructive database reset commands against Production.

### B.3 Explicit migration plan template

| Step | Action | Authorized? | Timestamp | Result |
|------|--------|-------------|-----------|--------|
| 1 | Inspect remote migration list | | | |
| 2 | Apply only missing approved Slice 3 migration(s) | | | |
| 3 | Verify applications table + RPC exist | | | |
| 4 | Verify no unexpected schema drift | | | |

### B.4 Explicit fixture retention / expiry decision

Before creating Production applications, record:

- whether existing Demo vacancies remain active
- whether `fixtures:hosted:apply` is needed to refresh expiry
- application proof-record retention window
- cleanup owner and method
- that no automatic Production seeding will be introduced

### B.5 Application URL and Auth isolation

- Prove against `https://stint.company` only when authorized.
- Use fresh unique test candidate emails.
- Do not reuse personal owner accounts for application rows if avoidable.
- Keep proof candidates clearly identifiable for cleanup.

### B.6 Full Production proof checklist

Execute the same journey and denial checks as Preview §A.5–A.6 against
Production, plus:

- [ ] Production project identity verified
- [ ] Migration plan executed as written
- [ ] Fixture retention/expiry decision recorded
- [ ] Application URL verified
- [ ] Auth test-user isolation maintained
- [ ] Evidence timestamps recorded
- [ ] Cleanup/retention decision recorded
- [ ] `SUPABASE_DB_URL` unset after each credentialed command
- [ ] No unapproved destructive commands executed

### B.7 Production credential pattern

```bash
export SUPABASE_DB_URL='...'
# owner-authorized command only
unset SUPABASE_DB_URL
```

Production fixture apply still requires:

`--confirm-production=I_UNDERSTAND_HOSTED_DEMO`

### B.8 After Production proof

Update closure evidence (separate closure doc update) with:

- proof date/time
- environment = production
- project ref
- commit SHA
- checklist results
- application retention/cleanup decision
- explicit “Slice 3 Done” only when all Done criteria are met

---

## C. What this runbook does not authorize

- Automatic Production inserts
- CI/Vercel-hosted fixture application
- Service-role use in candidate browser/SSR paths
- Employer application workflows
- Withdrawal, resubmission, history, messaging, or interview features
- Starting Slice 4
- Marking Slice 3 Done without recorded hosted evidence

---

## D. Relationship to local proof

| Layer | Status source |
|-------|----------------|
| Local critical journey | `pnpm test:e2e:slice3` / `docs/25-slice-3-exit-proof.md` |
| Local pgTAP / Vitest | CI + local validation in PR 3.5 |
| Hosted Preview/Production | This runbook — owner-run only |
| Slice 3 Done | Only after hosted proof + closure update |
