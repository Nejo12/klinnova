# Slice 3 Schema and Journey Proposal

> Contracts Accepted 2026-08-03 (D-035–D-045). Implementation not started.
> Terminology: `vacancy` in schema/employer contexts; `job` in candidate-facing UI
> (`docs/12-terminology.md`). Application is the candidate submission record.

**Depends on:** Slice 2 vacancy + matching (`docs/20`); D-020, D-023, D-031–D-034;
Accepted D-035–D-045.

**Companion:** `docs/22-slice-3-discovery.md`, `docs/23-slice-3-build-plan.md`.

---

## 1. Goal

Enable the smallest safe vertical journey:

completed candidate → open matched Demo job → understand job + match reasons →
preview profile-based application → explicitly submit → confirmation →
duplicate prevented.

Employer review and status timelines are out of scope.

---

## 2. Route and loader contracts

### Routes

| Route | Purpose |
|-------|---------|
| `/candidate/jobs/[vacancyId]` | Job detail + preview + submit entry |
| `/candidate/applications/[applicationId]` | Reload-safe confirmation (Accepted D-036 / D-043) |
| `/candidate/matches` | Entry list; Applied badge after submit |

Rejected for Slice 3: public `/jobs`, `/jobs/[slug]` (would conflict with D-033
seed visibility unless redesigned as a public board — not this slice).

### Authorization matrix

| Actor | Detail GET | Submit |
|-------|------------|--------|
| Anonymous | Redirect login | Denied |
| Authenticated incomplete | Redirect onboarding | Denied (RPC) |
| Authenticated completed | RLS-visible vacancy only | If visible + currently matching + not duplicate |
| Other candidate’s application | Not readable | N/A |

### Detail loader

Dedicated server-only loader:

1. `getUser()` — else unauthenticated result.
2. Load own `candidate_profiles` + languages — else missing profile.
3. If `onboarding_completed_at` null — incomplete (redirect).
4. Select vacancy by id joining company + language requirements (RLS applies).
5. If no row — `not_found` / unavailable (no existence leak beyond 404-style UX).
6. Run pure matcher for this single vacancy → `matches: boolean` + reasons.
7. Optionally load own application for this vacancy (applied state).

Do not use service-role. Do not accept candidate UUID from the client.

---

## 3. Detail content (schema-backed)

| UI element | Source |
|------------|--------|
| Title | `vacancies.title` |
| Employer name | `companies.name` |
| Demo label | UI + seed title convention (`Demo vacancy`) |
| Location | `vacancies.city` (`Berlin`) |
| Summary | `vacancies.summary` |
| Category | `vacancies.job_category` |
| Employment | `vacancies.employment_types` |
| Shifts | `vacancies.shift_requirements` |
| German | `vacancies.german_requirement` |
| Other languages | `vacancy_language_requirements` |
| Available from | `vacancies.available_from` |
| Freshness | `published_at`, `expires_at` |
| Match reasons | Pure matcher reason codes (≤4 display, same as matches) |
| Work-authorisation notice | Existing exact copy |

### Missing-field policy

| MVP / features field | Slice 3 |
|----------------------|---------|
| Salary | Deferred — no column |
| Responsibilities (structured) | Deferred — `summary` only |
| Precise / district address | Deferred — Berlin only; D-034 private address out of scope |
| Experience requirements | Deferred — D-027 still holds |
| Employer verification state | Deferred — seed has no verification claim |
| Interview language | Deferred — no column |
| CV required flag | Deferred — no column |
| Save/unsave | Deferred (D-035 supersedes D-032 save portion for this slice) |

---

## 4. Application schema (proposed)

```sql
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null
    references public.candidate_profiles (id)
    on delete cascade,
  vacancy_id uuid not null
    references public.vacancies (id)
    on delete restrict,
  status text not null,
  submitted_at timestamptz not null default now(),
  snapshot_version integer not null,
  candidate_snapshot jsonb not null,
  vacancy_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_status_chk
    check (status = 'submitted'),
  constraint applications_snapshot_version_chk
    check (snapshot_version >= 1),
  constraint applications_candidate_vacancy_key
    unique (candidate_id, vacancy_id)
);
```

### Notes

- **Table name:** `applications` (matches architecture / terminology).
- **Identity:** `candidate_id` is set only from `auth.uid()` inside the RPC —
  never accepted from the caller.
- **Status:** constrained to `submitted` only in Slice 3 (D-039).
- **Withdrawal / resubmit:** none. Permanent unique for the pair in Slice 3.
  Future withdrawal/resubmission needs a new Accepted decision and migration.
- **ON DELETE:** candidate cascade with profile; vacancy restrict so history is
  not silently destroyed by vacancy delete (vacancies are soft-withdrawn today).
- **JSONB design:** separate `candidate_snapshot` and `vacancy_snapshot` columns
  plus integer `snapshot_version`. Keeps candidate vs vacancy evidence clear and
  versionable without a normalized child-table design for Slice 3.

### Snapshot strategy (C — references + immutable versioned snapshots)

**Live FKs** retain relational integrity for future employer review.

**Immutable versioned snapshots** capture what was true at submit. Confirmation
reads historical submitted values from these snapshots after later profile or
vacancy edits.

#### Versioning rule

| Rule | Value |
|------|--------|
| Column | `snapshot_version integer not null` |
| Initial Slice 3 value | `1` |
| Who sets it | Auth-bound RPC on insert |
| Mutability | Immutable after insert (no candidate UPDATE policy) |
| Future changes | New Accepted decision may introduce `snapshot_version = 2+` shape; existing rows keep their version |

#### Generation rules

- Generated **inside** the Auth-bound RPC from trusted database rows.
- Snapshot JSON is **never** accepted from the caller.
- Candidate ID is **never** accepted from the caller.
- Immutable after insert.
- No candidate UPDATE policy on applications in Slice 3.

#### `candidate_snapshot` (version 1 — exact fields)

```json
{
  "display_name": "…",
  "job_category": "hospitality",
  "german_comfort": "basic",
  "languages": [{ "language_code": "en", "proficiency": "conversational" }],
  "work_authorisation_declared": true,
  "available_from": "YYYY-MM-DD",
  "employment_types": ["part_time", "mini_job"],
  "shift_preferences": ["morning", "daytime"]
}
```

| Field | Meaning |
|-------|---------|
| `display_name` | Candidate display name |
| `job_category` | Category preference used for this application (the vacancy’s matched `job_category`, which must be in the candidate’s preferences) |
| `german_comfort` | German comfort |
| `languages` | Additional language declarations **relevant to the vacancy** (candidate rows whose `language_code` appears in that vacancy’s language requirements) |
| `work_authorisation_declared` | Declaration value only (boolean) |
| `available_from` | Availability date |
| `employment_types` | Employment preferences |
| `shift_preferences` | Shift preferences |

#### `vacancy_snapshot` (version 1 — exact fields)

```json
{
  "vacancy_id": "22222222-2222-4222-8222-222222222201",
  "title": "…",
  "employer_display_name": "…",
  "source": "seed",
  "demo_label": "Demo vacancy",
  "city": "Berlin",
  "job_category": "hospitality",
  "employment_types": ["part_time", "mini_job"],
  "shift_requirements": ["morning", "daytime"],
  "german_requirement": "basic",
  "language_requirements": [{ "language_code": "en", "min_proficiency": "conversational" }],
  "available_from": null
}
```

| Field | Meaning |
|-------|---------|
| `vacancy_id` | Vacancy UUID |
| `title` | Job title |
| `employer_display_name` | Company display name |
| `source` / `demo_label` | Demo label/source where applicable |
| `city` | Privacy-safe location (Berlin only today) |
| `job_category` | Category |
| `employment_types` | Employment types |
| `shift_requirements` | Shifts |
| `german_requirement` | German requirement |
| `language_requirements` | Additional language requirements |
| `available_from` | Available-from date |

#### Explicitly not copied into snapshots

- email
- phone
- CV data
- exact address
- Auth metadata
- unrelated onboarding answers (for example travel minutes, full language list beyond vacancy-relevant languages, unused preference noise)

---

## 5. Status vocabulary

| Status | Slice 3 behaviour |
|--------|-------------------|
| `submitted` | Only allowed and only created value |
| Future statuses (`viewed`, `shortlisted`, interview\*, `offer`, `hired`, `not_selected`, `withdrawn`, …) | Deferred — not in CHECK |
| Transitions / withdrawal | None implemented |

Database status is constrained, not free-form. Future migrations may extend the
constraint additively after transition ownership and authorization are defined.
Do not pre-authorize unsupported workflow states.

No employer UPDATE policies in Slice 3. Candidates cannot change `status`.

---

## 6. Duplicate prevention and idempotency

| Concern | Rule |
|---------|------|
| Authority | `UNIQUE (candidate_id, vacancy_id)` |
| Slice 3 lifetime | One application per candidate and vacancy for all time |
| Concurrent double submit | Resolved by the database constraint |
| Idempotent outcome | `already_applied` + existing application id |
| UI | Route to existing confirmation; no second row |
| Withdrawal | Does not exist in Slice 3 |
| Resubmission after withdrawal | Does not exist; requires future Accepted decision + migration |

UI disable of the submit button is helpful but **not** authoritative.

---

## 7. Insertion mechanism and authority split

**Chosen shape:** Server Action → Auth-bound SQL RPC
`submit_candidate_application(p_vacancy_id uuid)`.

The RPC does **not** reuse the TypeScript matcher. Slice 3 does **not**
duplicate the full matcher in SQL.

### Server Action responsibilities

1. Resolve the authenticated candidate session.
2. Load the completed candidate profile.
3. Load the RLS-visible vacancy.
4. Run the existing TypeScript matcher (product-level matching source of truth).
5. Reject `not_matching` before submission.
6. Invoke the Auth-bound RPC with **vacancy ID only**.
7. Map RPC outcomes (`submitted`, `already_applied`, lifecycle/auth errors) and
   route to confirmation when appropriate.

### RPC and database responsibilities (SECURITY DEFINER, `search_path` locked)

Authoritatively enforce:

1. Identity from `auth.uid()` (candidate ID never accepted from caller).
2. Candidate row ownership (`candidate_profiles.id = auth.uid()`).
3. Onboarding completion (`onboarding_completed_at IS NOT NULL`).
4. Vacancy exists and is visible under current Slice 2 inventory helpers.
5. Vacancy is active and published (`publication_state = published`,
   `published_at <= now()`).
6. Vacancy is not future-dated, withdrawn, expired, or deleted.
7. Current Slice 2 inventory/source restrictions (`source = seed`, helper parity
   with `visible_seed_vacancy_ids()`).
8. Duplicate prevention (`UNIQUE` / `already_applied`).
9. Trusted snapshot construction (`snapshot_version = 1`, both jsonb columns)
   from database rows — snapshot JSON never accepted from caller.
10. Atomic insert or existing-application result.

### Authority summary

| Concern | Source of truth |
|---------|-----------------|
| Matching / explainability | TypeScript matcher (Server Action) |
| Security, lifecycle, ownership, integrity | Database / RPC |
| Snapshots | RPC-generated, immutable |

Any future move to database-authoritative matching requires a separate decision
and parity tests.

### Why not direct client insert?

Multiple predicates (completion, visibility, snapshot assembly, status default)
belong in one atomic DB path — same pattern as `complete_candidate_onboarding()`.

---

## 8. RLS model

| Privilege | `anon` | `authenticated` | `service_role` |
|-----------|--------|-----------------|----------------|
| SELECT | none | own rows (`candidate_id = auth.uid()`) | ALL (ops) |
| INSERT | none | **none** (RPC only) | ALL |
| UPDATE | none | **none** in Slice 3 | ALL |
| DELETE | none | none in Slice 3 | ALL |

- No employer/admin read policies in Slice 3 (avoid premature exposure).
- No candidate UPDATE policy — snapshots, status, and `submitted_at` stay immutable.
- EXECUTE on submit RPC: `authenticated` only; revoke from `anon`/`public`.

Incomplete candidates: RPC denies; SELECT of applications still own-only (they
should have zero rows if submit always required completion).

---

## 9. Submit-time eligibility and stale-state handling

### Product match gate (Server Action)

- Vacancy currently matches under the Slice 2 TypeScript matcher.
- If preferences changed and the vacancy no longer matches → `not_matching`.

### Security / lifecycle gate (RPC)

- Authenticated `auth.uid()`.
- Own completed profile.
- Vacancy still exists and satisfies visibility/active/published/seed rules.
- Duplicate → `already_applied`.

### Stale-state handling

| Stale condition | Result |
|-----------------|--------|
| Completion cleared while detail open | RPC → `incomplete` (fail safe) |
| Vacancy expired / withdrawn / future / deleted | RPC → `unavailable` (fail safe) |
| Preferences no longer match | Server Action → `not_matching` (fail safe) |
| Concurrent duplicate / retry | RPC → `already_applied` (idempotent) |

Stale tabs always re-validate at submit. Fail safely; never insert on stale deny.

---

## 10. Preview contents

Show before submit:

- Vacancy title + employer name
- Candidate display name
- Languages + German comfort
- Work-authorisation declaration wording
- Availability, employment preference, shifts, relevant categories
- Disclaimer: submitting records interest using this profile information; employer
  review workflows are not yet available on Stint

**Checkbox decision (Accepted D-043):** no additional checkbox. Explicit Submit
button and disclosure are sufficient (declaration already stored at onboarding).

Do **not** show/require: email, phone, CV, salary expectations.

Editing: links to existing onboarding group URLs (same pattern as Slice 2
invalidation proof). After edits, completion may clear — candidate must
re-complete before submit.

Preview surface: section on the detail route (or `?step=preview`) — avoid a
heavy modal-only flow for a11y and reload clarity.

---

## 11. Confirmation and applied state

### Confirmation

- Route: `/candidate/applications/[applicationId]`
- Loads own application by id (RLS); 404 if missing/not owned
- Displays historical submitted values from RPC-generated
  `candidate_snapshot` / `vacancy_snapshot` (`snapshot_version = 1`), plus
  `submitted_at` and status `submitted`
- Actions: back to matches; optional back to job detail (read-only applied)
- Duplicate/retry routes here via `already_applied`
- Copy: factual confirmation only — no “employer will reply in X days”

### Applied state

- Matches cards: “Applied” when own application exists for that vacancy id
- Detail: hide submit / show applied + link to confirmation
- Matches loader may batch-load own application vacancy ids (authenticated
  SELECT) — keep query minimal

### Application history

- **In Slice 3:** confirmation + applied badges only
- **Deferred:** `/candidate/applications` index, filters, withdrawal, timeline

---

## 12. Lifecycle → errors → copy

| Condition | Result code | Candidate-facing direction |
|-----------|-------------|----------------------------|
| Not signed in | `unauthenticated` | Sign in to continue |
| Incomplete onboarding | `incomplete` | Finish essentials to apply |
| Vacancy not visible | `unavailable` | This job is no longer available |
| Not matching | `not_matching` | This job no longer matches your preferences |
| Duplicate | `already_applied` | You have already applied |
| Success | `submitted` | Application submitted |

---

## 13. Privacy and data minimization

- Store only approved snapshot fields + `snapshot_version` + FKs + status +
  timestamps.
- Do not copy email, phone, CV data, exact address, or Auth metadata.
- Work-authorisation in the snapshot is the boolean declaration value only.
- Application deletion UI deferred; account deletion/export later slices must
  include applications (cascade from candidate already helps deletion).
- Future employer access must be scoped to their vacancies and must not expose
  private residential addresses (D-034) — seed Demo companies have none.
- Retention: no special TTL in Slice 3; Demo vacancy expiry does not auto-delete
  applications (vacancy FK restrict / soft withdraw).

---

## 14. Demo fixture compatibility

Sufficient for Slice 3 proof:

| Entity | ID / label |
|--------|------------|
| Company | `11111111-1111-4111-8111-111111111111` — Demo Berlin Work Co |
| Vacancy | `22222222-2222-4222-8222-222222222201` — Morning kitchen support |
| Hosted twin | same IDs; expiry 2026-09-02 in Production proof |

No fixture changes required for discovery. Detail credibility uses `summary` +
structured fields already seeded.

---

## 15. Hosted proof recommendation (D-045)

| Topic | Recommendation |
|-------|----------------|
| Can current Production Demo fixtures support proof? | Yes, while active before expiry |
| Iterative / preferred hosted proof | Preview |
| Production proof | Permitted only after explicit owner authorization |
| Application test records | Prefer cleanup after proof; provide owner-run ID/candidate-scoped cleanup SQL/CLI (non-migration) |
| Test candidate cleanup | Use existing safe deletion policy if any; do not invent Auth admin tooling casually |
| Risk | Persistent applications + PII snapshots in Production; credentials handling must match Slice 2 (env-only, unset after) |

Do not run hosted commands during discovery/planning PRs.

---

## 16. Accepted owner choices (2026-08-03)

| Choice | Accepted |
|--------|----------|
| Save/unsave | Removed from Slice 3 (D-035 supersedes only D-032 save/unsave placement) |
| Status vocabulary | `submitted` only (D-039) |
| Duplicate rule | Permanent `UNIQUE (candidate_id, vacancy_id)` (D-040) |
| Snapshots | DB/RPC-generated immutable versioned jsonb (`snapshot_version = 1`) (D-038) |
| Snapshot PII | No email, phone, CV, or precise address (D-038 / D-043) |
| Extra checkbox | Not required; explicit Submit + disclosure sufficient (D-043) |
| Hosted proof | Preview preferred; Production only after explicit owner authorization (D-045) |

### Next step

PR 3.1 — application schema, constraints, RLS, RPC, and pgTAP — is the next
implementation unit. Slice 3 implementation has not started in this acceptance
update.
