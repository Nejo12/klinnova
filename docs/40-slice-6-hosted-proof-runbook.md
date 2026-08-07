# Slice 6 Hosted-Proof Runbook

Owner-authorized procedure for hosted Slice 6 exit proof.

Local exit evidence lives in `docs/39-slice-6-exit-proof.md`. This runbook
covers the application-status/employer-applicant-review surface only
(PR #60–#62). It reuses the same disposable-project discipline established in
`docs/32-slice-4-hosted-proof-runbook.md` and `docs/26-slice-3-hosted-proof-runbook.md`.

**Execution status:** Not executed. This PR (6.4) prepares the runbook only —
no hosted command has been run under it.

**D-070 reminder:** Accepting D-070 does **not** authorize any hosted proof.
Any hosted run — Preview, disposable, staging, or Production fallback —
requires a new explicit written authorization for that specific run (template
below). Silence or general approval is insufficient.

---

## Non-negotiable safety rules

- Never run hosted steps from install, build, migrate, CI, Vercel, or app startup.
- Never paste database URLs, passwords, access tokens, service-role keys, cookies,
  or connection strings into issues, PRs, chat, or evidence docs.
- Credentials only via a temporary environment variable when a phase requires them.
- Unset credentials immediately after each hosted command.
- Never pass connection strings as CLI arguments.
- Never claim hosted evidence that was not actually executed.
- Prefer isolated Preview / disposable hosted project. Staging next. Production
  only as an explicitly authorized fallback.
- Do not run `supabase db reset` against any hosted project.
- Do not treat a variable name containing "local" as proof the target is local.
- Local proof commands (`pnpm supabase:db:reset`, `pnpm supabase:test:db`, etc.)
  must never be pointed at a hosted database.
- Use only the project-local Supabase CLI (`pnpm exec supabase`, currently
  `2.111.0`) for every hosted inspection or mutation command — never a global
  CLI install, which may be a different version with different config parsing.

---

## Known Production identifiers (already tracked; not secrets)

| Field | Value |
|-------|--------|
| Application | `https://stint.company` |
| Production project ref | `kvrzmzoszitdicjvrprt` |
| Demo company ID | `11111111-1111-4111-8111-111111111111` |
| Demo fixture retention (Slice 2/3) | Retained until 2026-09-02 unless cleaned up |

These are project/fixture identifiers only. They are not credentials.

---

## Preferred environment order

1. Isolated Supabase Preview or disposable hosted project + matching Vercel Preview
2. Dedicated Staging project
3. Production only with a new explicit authorization (template below)

**Current state (2026-08-07):** Preview has no Preview-scoped Supabase
configuration (unchanged since the Slice 4 hosted-proof cleanup on
2026-08-04). It must not be assumed isolated or usable for a Slice 6 hosted
proof. A new isolated database and matching Preview environment must be
established before any Slice 6 hosted mutation. Never silently fall back to
Production credentials. This residual gap is not authorization for
Production.

---

## Phase A — read-only preflight

Stop for authorization after this phase. No schema or data mutation.

1. Identify target environment label: `preview` | `staging` | `production`.
2. Record project reference (not secrets) and application deployment URL.
3. Verify the target is not accidentally Production when intending Preview/Staging
   (compare project ref and app hostname).
4. Inspect current remote migration history (owner-controlled read-only, via
   `pnpm exec supabase migration list --project-ref <ref>`).
5. Compare against local inventory from `pnpm proof:migrations` (12 migrations,
   filenames + checksums). Do not assume a hosted migration exists merely
   because the file exists locally.
6. Confirm the full ordered migration set is present or missing, ending with
   `20260806140000_application_status_and_review_contract.sql` (12th).
7. Inspect application deployment URL and Auth redirect allow-list needs.
8. Verify email confirmation configuration for proof registration (Mailpit is
   local-only; a hosted environment needs its own confirmation path).
9. Check for fixture/email collision with prior proof runs (Slice 3/4/5
   fixtures use different deterministic prefixes — do not reuse them).
10. Produce a proposed command plan (Phase B/C/D) and **stop for authorization**.

### Phase A evidence fields

- date/time (UTC)
- operator
- environment label
- project ref
- deployment URL
- commit SHA
- migration status summary (before)
- missing migrations list
- collision findings
- authorization request submitted: yes/no

---

## Phase B — authorized migration

Document exact commands. **Do not run them in PR 6.4.**

Requirements:

- explicit target project ref in the authorization record
- migration status before
- apply only missing approved migrations (no reset, no repair, no seed overwrite)
- migration status after
- no Production execution without the Production authorization template below

Example command shape (placeholders only — replace every `<…>` value; do not
rely on ambient linked project state):

```bash
# READ STATUS FIRST (owner-controlled; never from CI defaults)
pnpm exec supabase migration list --project-ref <AUTHORIZED_PROJECT_REF>

# APPLY ONLY AFTER EXPLICIT AUTHORIZATION FOR THAT PROJECT
# pnpm exec supabase db push --project-ref <AUTHORIZED_PROJECT_REF>
# NEVER: supabase db reset (hosted)
# NEVER against Production without the Production authorization template

pnpm exec supabase migration list --project-ref <AUTHORIZED_PROJECT_REF>
```

Record:

- commands actually run
- migrations applied
- failures
- confirmation that seed Demo rows were not overwritten

---

## Phase C — hosted smoke proof

Use fictional identities only (see Fixture policy). Deterministic checklist —
each item maps directly to a D-070 requirement or a local-proof E2E scenario:

1. Migrations apply cleanly from a clean hosted database (or are already present).
2. Migration count on the hosted project is 12.
3. `pnpm exec supabase gen types --project-ref <ref>` matches the committed
   generated types (no drift on the hosted schema either).
4. A fictional candidate submits an application to a fictional employer's
   published vacancy.
5. The initial `submitted` status and its history event exist and share the
   same timestamp.
6. The owning employer can list the application and open its detail.
7. The employer transitions the application through at least
   `submitted → reviewing → shortlisted → accepted` (or a `rejected` branch
   with a reason).
8. The candidate sees the same current status and a safe status timeline
   (status + timestamp only).
9. The candidate does **not** see the employer's rejection reason (rejection
   branch only) or any actor identity.
10. A second, unrelated employer cannot list or open the first employer's
    application (uniform unavailable, no existence oracle).
11. A second, unrelated candidate cannot open the first candidate's
    application (uniform unavailable, no existence oracle).
12. The employer can still review the application after withdrawing its
    vacancy.
13. The employer can still review the application after their own
    verification is revoked (via the same `stint.allow_verification_write`
    escape hatch the local pgTAP/E2E fixtures use, run against the hosted
    project only under explicit authorization).
14. No direct `authenticated` read of `application_status_history` succeeds
    (attempt a direct REST/PostgREST select and confirm it is denied).
15. No direct `authenticated` read of another candidate's or employer's
    `applications` rows succeeds beyond the caller's own RLS-scoped rows.
16. No service-role key or browser/client dependency was required anywhere
    in the smoke proof above.

Negative assertions (must hold throughout):

- no rejection-reason exposure to the candidate
- no actor identity exposure to either party
- no candidate mutation of application status
- no automatic vacancy/application lifecycle coupling
- no notification, interview, messaging, Storage, or document behavior

---

## Phase D — cleanup

Document before creating fixtures:

| Record type | Cleanup approach | Notes |
|-------------|------------------|-------|
| Proof Auth users (candidates + employers) | Supabase Auth admin delete (manual/owner) | No automated mass delete in app |
| Employer profiles / companies | Cascade with auth user where schema allows | Confirm before delete; never touch Demo company ID |
| Proof vacancies | Prefer owner UI delete/withdraw for eligible drafts; else scoped SQL by proof IDs | Never bulk-delete `vacancies` |
| Proof applications + history | Cascade with vacancy/candidate delete where schema allows; else scoped delete by proof IDs | Never wipe `applications` or `application_status_history` broadly |
| Demo seed fixtures | Retain or cleanup via D-031 tool only | Separate from Slice 6 proof fixtures |
| Fixture labels | Manifest + evidence template | Include expiry |
| Responsibility | Repository owner for the authorized run | Named in evidence |
| Seed / real user data | Must remain untouched | Explicit confirmation required |

Where cleanup cannot safely be automated, record the manual process and a
retention decision. Do not pre-authorize retention.

---

## Fixture policy

Use fictional identities only. No personal email addresses. No real employer
or candidate names.

Every Slice 6 proof fixture should record:

| Field | Rule |
|-------|------|
| Deterministic prefix | `stint-s6-` |
| Environment marker | `preview` / `staging` / `production` |
| Run identifier | UTC stamp, e.g. `20260807T1800Z` |
| Owner | operator identity (name/handle, not a secret) |
| Created-at | UTC timestamp |
| Intended expiry | default +14 days unless authorization says otherwise |
| Cleanup status | `pending` / `deleted` / `retained-with-approval` |

Suggested email pattern:

```text
stint-s6.<env>.<role>.<runid>@example.test
```

Examples:

- `stint-s6.preview.employer.20260807T1800Z@example.test`
- `stint-s6.preview.candidate-a.20260807T1800Z@example.test`
- `stint-s6.preview.candidate-b.20260807T1800Z@example.test`
- `stint-s6.preview.employer-b.20260807T1800Z@example.test` (cross-owner isolation)

Display names / companies: clearly fictional (`S6 Proof Employer`,
`S6 Proof Candidate A`).

Do not add fixtures to Production without separate explicit authorization.

---

## Production fallback authorization template

Copy into the decision/evidence record. All fields required. Checkboxes must
be explicitly marked by the authorizing owner for **this run**.

```text
SLICE 6 PRODUCTION FALLBACK AUTHORIZATION

Reason Preview/Staging unavailable:
______________________________________________

Exact Production project reference:
______________________________________________

Exact Production deployment URL:
______________________________________________

Application commit SHA to prove:
______________________________________________

Migrations to apply (ordered):
______________________________________________

Commands to run (exact):
______________________________________________

Expected schema effects:
______________________________________________

Expected data effects (fixtures/users):
______________________________________________

Users/fixtures to create (fictional only):
______________________________________________

Cleanup or retention plan:
______________________________________________

Rollback limitations:
______________________________________________

Confirmations (owner initials + date):
[ ] No candidate withdrawal will be exercised (not implemented; N/A confirmed)
[ ] No rejection reason will be exposed to a candidate during this proof
[ ] No actor identity will be exposed to either party during this proof
[ ] No automatic vacancy/application lifecycle coupling will be exercised
[ ] No db reset / seed overwrite / mass delete will be run
[ ] Credentials will not appear in evidence
[ ] Silence is not authorization
[ ] General approval is not authorization
[ ] Previous Production authorization does not carry forward
[ ] I authorize THIS Production run only (new explicit authorization mandatory)

Owner name:
Date (UTC):
Signature / recorded decision ID:
```

Silence, general approval, and any earlier Production authorization are
insufficient. A new explicit authorization is mandatory for each Production run.

---

## Hosted proof evidence template

Fill after an authorized hosted run. Never include secrets, tokens, cookies,
or raw credentials.

```text
SLICE 6 HOSTED PROOF EVIDENCE

Date/time (UTC):
Operator:
Target environment (preview|staging|production):
Application commit SHA:
Deployment URL:
Supabase project reference:

Migration status before:
Migration commands executed:
Migration status after:
Migration count confirmed: 12

Fixture manifest (emails/IDs/labels/expiry only):

Candidate submission result:
Initial status/history result:
Employer list/detail result:
Employer transition result (through terminal status):
Candidate status/timeline visibility result:
Rejection-reason privacy result:
Cross-employer isolation result:
Cross-candidate isolation result:
Vacancy-withdrawal independence result:
Verification-revocation independence result:
Direct history-table access denial result:
Direct cross-owner applications-read denial result:
No service-role dependency result:

Cleanup result / retention decision:
Residual risks:
Final pass/fail decision:

Authorization record reference (required for Production):
```

---

## Relationship to local proof

| Layer | Command / doc | Hosted mutation |
|-------|---------------|-----------------|
| Local automated proof | manual command sweep / `docs/39` | None |
| Local migration inventory | `pnpm proof:migrations` | None |
| Hosted preflight | Phase A | None |
| Hosted migration | Phase B | Yes (authorized) |
| Hosted smoke | Phase C | Yes (fixtures) |
| Hosted cleanup | Phase D | Yes / retention |
| Closure | future Slice 6 closure doc, after evidence | After evidence only |

## What this runbook does not authorize

- Running Production proof without the template above
- Candidate withdrawal, messaging, notifications, interview scheduling, CV/
  document handling, Storage, scoring/ranking, or operator applicant review
- Automatic vacancy/application lifecycle coupling
- Starting Slice 7 or Slice 8
- Automatic fixture apply from CI/Vercel
- Treating Preview app URLs as isolated when they share Production DB vars
- Execution of any step in this runbook by this PR (PR 6.4 prepares the
  runbook only)
