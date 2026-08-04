# Slice 4 Hosted-Proof Runbook

Owner-authorized procedure for hosted Slice 4 exit proof.

Local exit evidence lives in `docs/31-slice-4-exit-proof.md`. Hosted Demo seed
fixture tooling remains `supabase/fixtures/hosted/` (D-031) for candidate seed
inventory only. Employer proof fixtures are separate fictional Auth users and
must not reuse personal identities.

**Execution status:** Executed 2026-08-04 (Run ID `20260804T2039Z`) against Preview + disposable project `wbucxaquktraobrvknts`. Evidence/closure: `docs/33-slice-4-closure.md`. Production was not used.

**D-054 reminder:** Accepting D-054 does **not** authorize Production hosted
proof. Any Production fallback requires a **new** explicit written authorization
for that run (template below). Silence or general approval is insufficient.

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
- Do not treat a variable name containing “local” as proof the target is local.
- Local proof command `pnpm proof:slice4` must never be pointed at a hosted DB.

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

**Post-run state (2026-08-04):** Slice 4 hosted proof used a temporary disposable
project + Preview overrides, then deleted the disposable project and cleared
Preview-scoped Supabase variables. Preview currently has **no** Preview-scoped
Supabase configuration and must not be assumed isolated or usable for the next
hosted proof. Re-establish a new isolated database and matching Preview env
before any future hosted mutation. Never silently fall back to Production
credentials. This residual gap is not authorization for Production.

---

## Phase A — read-only preflight

Stop for authorization after this phase. No schema or data mutation.

1. Identify target environment label: `preview` | `staging` | `production`.
2. Record project reference (not secrets) and application deployment URL.
3. Verify the target is not accidentally Production when intending Preview/Staging
   (compare project ref and app hostname).
4. Inspect current remote migration history (owner-controlled read-only).
5. Compare against local inventory from `pnpm proof:migrations` (filenames +
   checksums). Do not assume a hosted migration exists merely because the file
   exists locally.
6. Confirm required Slice 4 migrations are present or missing:
   - `20260803200000_employer_profiles_and_company_ownership.sql`
   - `20260804120000_employer_owned_draft_vacancies.sql`
   - plus all earlier repository migrations on a clean environment
7. Inspect application deployment URL and Auth redirect allow-list needs.
8. Verify email confirmation configuration for proof registration.
9. Check for fixture/email collision with prior proof runs.
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

Document exact commands. **Do not run them in PR 4.5.**

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
# Target the authorized project explicitly. Do not use ambient --linked state.
supabase migration list --project-ref <AUTHORIZED_PROJECT_REF>

# APPLY ONLY AFTER EXPLICIT AUTHORIZATION FOR THAT PROJECT
# supabase db push --project-ref <AUTHORIZED_PROJECT_REF>
# NEVER: supabase db reset (hosted)
# NEVER against Production without the Production authorization template

supabase migration list --project-ref <AUTHORIZED_PROJECT_REF>
```

Record:

- commands actually run
- migrations applied
- failures
- confirmation that seed Demo rows were not overwritten

---

## Phase C — hosted smoke proof

Use fictional identities only (see Fixture policy).

Deterministic checklist:

1. Employer registration (private) → confirm/login
2. Partial save + resume after refresh
3. Private employer completion (unverified; no company)
4. Organisation employer completion (derived company; no selector)
5. Dual-capability: candidate capability remains; both homes reachable
6. Private draft create → edit → salary (integer cents) → languages → readiness ready
7. Organisation draft create → edit → readiness
8. Confirm no Publish control on list/detail/edit
9. Confirm draft remains private (no public URL)
10. Second employer cannot access first employer’s draft (generic unavailable)
11. Candidate cannot see/match/detail/apply to employer draft
12. Anonymous cannot read employer profile/company/draft/languages
13. Owner deletes eligible private draft
14. Employer profile (and org company) remain after draft deletion
15. Candidate capability remains after employer proof steps

Negative assertions:

- no verification approval/upload
- no applicant review
- no moderation controls
- no publication RPC success path

---

## Phase D — cleanup

Document before creating fixtures:

| Record type | Cleanup approach | Notes |
|-------------|------------------|-------|
| Proof Auth users | Supabase Auth admin delete (manual/owner) | No automated mass delete in app |
| Employer profiles | Cascade with auth user where schema allows | Confirm before delete |
| Employer-owned companies | Delete only if owned by proof user and unreferenced | Never touch Demo company ID |
| Employer drafts | Prefer owner UI delete for eligible drafts; else scoped SQL by proof IDs | Never `DELETE WHERE source='employer'` |
| Language rows | Cascade with vacancy delete | Confirm |
| Test applications | None expected for employer drafts; if any proof apps on Demo seeds, scoped delete by proof candidate IDs | Never wipe applications table |
| Demo seed fixtures | Retain or cleanup via D-031 tool only | Separate from employer proof |
| Fixture labels | Manifest + evidence template | Include expiry |
| Responsibility | Repository owner for the authorized run | Named in evidence |
| Seed / real user data | Must remain untouched | Explicit confirmation required |

Where cleanup cannot safely be automated, record the manual process and a
retention decision. Do not pre-authorize retention.

---

## Fixture policy

Use fictional identities only. No personal email addresses. No real employer
names.

Every employer proof fixture should record:

| Field | Rule |
|-------|------|
| Deterministic prefix | `stint-s4-` |
| Environment marker | `preview` / `staging` / `production` |
| Run identifier | UTC stamp, e.g. `20260804T1800Z` |
| Owner | operator identity (name/handle, not a secret) |
| Created-at | UTC timestamp |
| Intended expiry | default +14 days unless authorization says otherwise |
| Cleanup status | `pending` / `deleted` / `retained-with-approval` |

Suggested email pattern:

```text
stint-s4.<env>.<kind>.<runid>@example.test
```

Examples:

- `stint-s4.preview.private.20260804T1800Z@example.test`
- `stint-s4.preview.org.20260804T1800Z@example.test`
- `stint-s4.preview.dual.20260804T1800Z@example.test`

Display names / companies: clearly fictional (`S4 Proof Private`, `S4 Proof Org GmbH`).

Do not add fixtures to Production without separate explicit authorization.
For Production fallback, prefer clearly labelled retained Demo seed fixtures only
when deletion would be riskier than retention, and require explicit approval for
that retention decision. Do not pre-authorize retention in this runbook.

---

## Production fallback authorization template

Copy into the decision/evidence record. All fields required. Checkboxes must be
explicitly marked by the authorizing owner for **this run**.

```text
SLICE 4 PRODUCTION FALLBACK AUTHORIZATION

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
[ ] Publication remains unavailable after this proof
[ ] Employer drafts remain private after this proof
[ ] No applicant review / verification approval will be exercised
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

Fill after an authorized hosted run. Never include secrets, tokens, cookies, or
raw credentials.

```text
SLICE 4 HOSTED PROOF EVIDENCE

Date/time (UTC):
Operator:
Target environment (preview|staging|production):
Application commit SHA:
Deployment URL:
Supabase project reference:

Migration status before:
Migration commands executed:
Migration status after:

Fixture manifest (emails/IDs/labels/expiry only):

Private employer proof result:
Organisation employer proof result:
Dual-capability result:
Owner isolation result:
Candidate isolation result:
Anonymous isolation result:
Draft readiness result:
Deletion result (profile/company survivors):
No-publication result:

Cleanup result / retention decision:
Residual risks:
Final pass/fail decision:

Authorization record reference (required for Production):
```

---

## Relationship to local proof

| Layer | Command / doc | Hosted mutation |
|-------|---------------|-----------------|
| Local automated proof | `pnpm proof:slice4` / `docs/31` | None |
| Local migration inventory | `pnpm proof:migrations` | None |
| Hosted preflight | Phase A | None |
| Hosted migration | Phase B | Yes (authorized) |
| Hosted smoke | Phase C | Yes (fixtures) |
| Hosted cleanup | Phase D | Yes / retention |
| Closure | `docs/33-slice-4-closure.md` | After evidence only |

## What this runbook does not authorize

- Running Production proof without the template above
- Publication, verification approval, moderation, or applicant review
- Starting Slice 5 or Slice 6
- Automatic fixture apply from CI/Vercel
- Treating Preview app URLs as isolated when they share Production DB vars
