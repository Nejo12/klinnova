# Slice 5 Schema and Publication Proposal

> Contract proposal for Slice 5. **Status:** Proposed with D-055–D-067.
> No migrations land until decisions are Accepted and PR 5.2 is authorized.

**Baseline schema:** seven migrations through
`20260804120000_employer_owned_draft_vacancies.sql`. Types:
`src/types/database.ts`.

---

## 1. Current state (exact)

### `employer_profiles`

| Column | Notes |
|--------|-------|
| `id` | PK → `auth.users` |
| `employer_type` | `private` \| `organisation` |
| `display_name`, `berlin_locality`, `phone`, `website` | Profile fields |
| `organisation_legal_name` | Org only |
| `lawful_hiring_declared` / `_at` | Completion gate |
| `verification_state` | CHECK = `'unverified'` only; trigger forces unverified |
| `onboarding_completed_at` | Independent of verification |

RLS: owner select/insert/update. No delete for authenticated.

### `companies`

Seed (`owner_employer_id` null) or employer-owned org company. Owner update name only.

### `vacancies`

| Concern | Current |
|---------|---------|
| `publication_state` | `draft` \| `published` \| `withdrawn` |
| `source` | `seed` \| `employer` |
| Employer rows | Forced `draft` (`vacancies_employer_draft_only_chk`) |
| Draft timestamps | `published_at` / `expires_at` null |
| Published CHECKs | `published_at` and `expires_at` required when published |
| Location | `city='Berlin'`; `public_locality` optional |
| Mutations | SECURITY DEFINER draft RPCs only |

### RPCs (employer vacancy)

`create_employer_vacancy_draft`, `update_employer_vacancy_draft`,
`replace_employer_vacancy_languages`, `delete_employer_vacancy_draft`,
`employer_vacancy_draft_readiness` — **no publish**.

### Readiness missing keys today

`employer_completion`, `publication_state`, `title`, `job_category`,
`public_locality`, `description`, `salary`, `languages`, `company`.

Does **not** check verification (correct for draft checklist; publish adds it).

### Candidate visibility / apply

- `visible_seed_vacancy_ids()` — seed + published + time window
- Matcher TypeScript; loader uses seed visibility
- `submit_candidate_application` — seed eligibility rules
- Applications: candidate SELECT own; no employer read

---

## 2. Proposed verification schema

### States

`unverified | pending | verified | rejected | revoked`

### Columns to add (illustrative names)

| Column | Purpose |
|--------|---------|
| `verification_requested_at` | Request timestamp |
| `verification_reviewed_at` | Decision timestamp |
| `verification_reviewed_by` | Operator `auth.users.id` (nullable) |
| `verification_note` | Short reason (rejected/revoked); length-capped |

### Constraints / triggers

- Remove “always unverified” write guard
- CHECK on expanded state enum
- Employer cannot self-set `verified` / `revoked`
- Request allowed only from `unverified` or `rejected` when completed
- Approve/reject only from `pending` by operator
- Revoke only from `verified` by operator

### Operator allow-list

Minimal table e.g. `platform_operators(user_id pk references auth.users)` maintained
out-of-band (SQL/ops). Approve/reject/revoke RPCs require
`auth.uid() IN (SELECT user_id FROM platform_operators)`.

No service-role browser/SSR ordinary path.

### Evidence (no Storage)

No document columns. Rely on existing profile fields + request attestation
boolean/timestamp. See D-057.

---

## 3. Proposed publication states

`draft | published | paused | filled | expired | withdrawn`

Seed vacancies continue to use `published` / `withdrawn` (+ time window). Seed rows
must not require `paused`/`filled`/`expired` unless useful later.

Drop `vacancies_employer_draft_only_chk` (replaced by RPC gates).

### Transition matrix (Proposed — not Accepted)

No generic unrestricted `set_publication_state` RPC. Each business transition is
an explicit Auth-bound RPC.

| From → To | Actor | Verified now? | Ready? | Public / match | New apply | Timestamp effect | Reversible? |
|-----------|-------|---------------|--------|----------------|-----------|------------------|-------------|
| draft → published | Owner | Yes | Yes | Yes | Yes | Set `published_at`, `expires_at` | Via later transitions |
| published → paused | Owner | Owner session; was published | — | No | No | Set `paused_at` | Yes → resume |
| paused → published (resume) | Owner | Yes (current) | Yes (re-check) | Yes | Yes | Clear `paused_at`; keep `published_at` | — |
| published → filled | Owner | — | — | No | No | Set `filled_at` | No (terminal) |
| published → withdrawn | Owner | — | — | No | No | Set `withdrawn_at` | No |
| paused → withdrawn | Owner | — | — | No | No | Set `withdrawn_at` | No |
| published → expired | System/lazy RPC | — | — | No | No | Set `expired_at` when window elapsed | Republish path only (Proposed) |
| draft → deleted | Owner | — | Never published | — | — | Row removed | Existing delete RPC |

Verification-loss (not a vacancy actor transition, but coupled): operator
`verified → revoked` also forces owned `published → paused` in the same
transaction (D-064 Proposed).

**Filled vs withdrawn:** filled = successfully hired; withdrawn = removed without
fill. Do not overload.

**Expired:** when `expires_at <= now()` for `published` (and optionally `paused`
policy: propose paused does not auto-expire into applications — still not
matchable; materialize expired from published when window elapses).

### Timestamp effects

| Transition | Sets |
|------------|------|
| publish | `published_at=now()`, `expires_at` employer-chosen |
| pause | `paused_at=now()` (new column) |
| resume | clear `paused_at`; keep original `published_at` or refresh — **propose keep** |
| fill | `filled_at=now()` |
| withdraw | `withdrawn_at=now()` |
| expire | `expired_at=now()`; state `expired` |

### Existing applications

Always preserved for the candidate via RLS + immutable snapshots. No employer
applicant read in Slice 5.

---

## 4. Publication readiness (publish gate)

Publish RPC must require **all** of:

1. Session is vacancy owner
2. Employer onboarding complete
3. `verification_state = verified`
4. Draft readiness equivalent to today’s checklist (title, category,
   public_locality, description, salary cents+period+currency+gross, ≥1 language,
   company rules for org/private)
5. `employment_types` and `shift_requirements` non-empty (already draft-relaxable;
   require at publish)
6. `workplace_type`, `work_frequency`, `cv_required`, `interview_english_ok` set
7. `available_from` set
8. `expires_at` in allowed window (propose now+1d … now+90d; default UI 30d)
9. `publication_state = draft` at publish time

**Not required in Slice 5:** experience notes content; document uploads; exact
address; new contract enum beyond `employment_types`.

Draft readiness RPC may remain draft-focused; publish RPC revalidates and adds
verification + expiry.

---

## 5. Visibility and routes

### Helpers (conceptual)

- Keep seed helper behaviour
- Add `visible_public_vacancy_ids()` / expand candidate helper:
  - seed: unchanged rules
  - employer: `source=employer` AND `publication_state=published` AND time window
    AND owner `verification_state=verified`

### Audience matrix

| Audience | Draft | Published active | Paused/Filled/Expired/Withdrawn |
|----------|-------|------------------|----------------------------------|
| Anonymous | No | Yes on `/jobs*` if D-060 accepts public read | No |
| Incomplete candidate | No | Public read only (no apply) | No |
| Completed candidate | No | Match + detail + apply | No new apply; own apps OK |
| Owner employer | Yes | Yes + lifecycle | Yes (owner manage) |
| Other employer | No | Public projection only | No |
| Operator/admin | Via operator tools for verification only | No moderation UI in Slice 5 | Slice 7 |

### Routes

| Route | Role |
|-------|------|
| `/jobs` | Public list of active published vacancies (seed + employer) |
| `/jobs/[vacancyId]` | Public detail, privacy-safe fields |
| `/candidate/matches` | Completed candidate matches (includes employer jobs) |
| `/candidate/jobs/[vacancyId]` | Authenticated detail + apply when eligible |
| `/employer/vacancies/*` | Owner draft/publish/lifecycle |

Avoid divergent domain models: shared projection types with authz-specific
field omission.

### Location privacy (Proposed)

Public and candidate surfaces may show `city` (Berlin) and `public_locality`
only. Street, house number, postcode, and map coordinates are prohibited.
Exact private residential address is **not stored** in Slice 5. Organisation and
private employers share the same public location fields; private employers must
not enter street addresses. `workplace_type` may indicate on-site / hybrid /
remote without exposing an exact address.

---

## 6. Matching and application integration

| Rule | Proposal |
|------|----------|
| Algorithm | Unchanged pure TypeScript |
| Sort | Keep deterministic `published_at DESC`, `title ASC`, `id ASC` |
| Drafts | Never loaded into matcher |
| Non-published employer states | Never loaded for new match/apply |
| Verification loss | Visibility helper excludes; vacancies paused |
| Seed | Continues |
| Submit RPC | Accept employer vacancies when currently eligible; reject otherwise |
| Snapshots | Unchanged versioning rules |
| Concurrent expire vs submit | RPC re-checks eligibility in transaction; loser gets unavailable |

---

## 7. Verification-loss behaviour

On `verified → revoked` (operator RPC, single transaction):

1. Update employer profile state + review metadata
2. For each owned vacancy in `published`: set `paused` (+ `paused_at`)
3. Visibility immediately excludes them (state + verified check)

Re-verify (`pending → verified`) does **not** auto-resume; employer resumes
explicitly.

---

## 8. Expiry model (Proposed — subject to owner acceptance)

| Item | Proposal |
|------|----------|
| Mandatory at publish | Yes |
| Default | 30 days |
| Max | 90 days |
| Min | 1 day |
| Chooser | Employer |
| Auto-expiry infra | Lazy materialize on read/list/publish attempts + optional ops RPC; **no hosted scheduler assumed** in Slice 5 |
| Derived vs materialized | Eligibility always derives from timestamps transactionally at match/detail/apply; state `expired` materialized when observed |
| Extension | Deferred |
| Republish after expiry | Edit as draft if policy allows, or clone — propose: owner may transition expired→draft only if never filled, else create new draft |
| Stale-vacancy admin ops | Slice 7 |

---

## 9. Concurrency / idempotency

| Case | Behaviour |
|------|-----------|
| Duplicate publish | Second call → `already_published` or ready-state error; no duplicate rows |
| Edit while publish | Publish transaction reads current row; fails if not ready/draft |
| Pause when paused | Idempotent success |
| Fill after expiry | Reject |
| Expire while apply in flight | Apply transaction sees non-eligible → unavailable; no partial app |
| Revoke while publish in flight | Publish checks verified inside transaction; revoke commits first wins |

Prefer `SELECT … FOR UPDATE` on vacancy/employer row inside RPCs.

---

## 10. Audit model (minimum)

Slice 5 durable evidence without full `audit_events`:

- Verification columns on `employer_profiles`
- Lifecycle timestamps on `vacancies`
- RPC-enforced transitions

Full `audit_events` + admin browsing = Slice 7. Do not claim richer
operational audit than stored columns provide.

---

## 11. Notifications

| Event | Slice 5 |
|-------|---------|
| Verification submitted / approved / rejected | Deferred |
| Vacancy published / expired / filled | Deferred |

Core journey must work without email. Slice 7 owns completeness.

---

## 12. RPC boundary (security)

Caller must not supply: verification state directly (except request), operator
identity, another employer’s vacancy id as victim without authz fail, arbitrary
publication_state, forged timestamps.

All transitions: Server Action → Zod → session → Auth-bound SECURITY DEFINER RPC.

No service-role in browser or ordinary SSR session paths.

Generic unavailable errors for wrong-owner / missing resources.

---

## 13. Migration risk and compatibility

| Risk | Mitigation |
|------|------------|
| Breaking seed visibility | Keep seed helper semantics; additive employer branch |
| Employer draft chk removal | Replace with RPC-only publish |
| Verification trigger removal | Replace with constrained transition RPCs |
| Type generation drift | `db:types:check` in PR 5.2 |
| In-flight Demo fixtures | Retain until existing expiry policy; no Slice 5 requirement to delete |

Backwards compatible for: candidate onboarding, seed matches/apply, employer
draft CRUD, dual capability.

---

## 14. Tests required before Slice 5 Done

- pgTAP: verification transitions; non-operator deny; publish gates; lifecycle;
  verification-loss pause; visibility matrices; submit eligibility; draft privacy
- Vitest: schemas, actions, matcher with employer fixtures, static security
- Playwright: verification request; operator approve; publish lifecycle; public
  and candidate surfaces; Slice 3/4 regressions
- Hosted proof per D-067 / runbook

---

## 15. Explicit non-goals

Applicant list/detail; application status; interviews; messaging; moderation
dashboard; suspension UI; Storage uploads; exact address; GDPR export/deletion;
opaque ranking; Slice 6/7/8 features.
