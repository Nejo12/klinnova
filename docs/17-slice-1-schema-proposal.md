# Slice 1 Schema Proposal

> Schema boundary for Slice 1. SQL/migrations belong in PR 1.1 after this acceptance lands on `main`.
> Product scope: `docs/04-mvp.md`. Delivery: `docs/16-slice-1-build-plan.md`.

**Status:** Accepted for PR 1.1 (D-019, D-020, D-023, D-024 — 2026-08-01). D-021/D-022 Auth and hosted-project decisions remain Proposed.
**Outcome constraint:** Persist the minimum essential onboarding data so a registered candidate can continue toward matching later — not a full profile, not matching, not employer discoverability.

---

## Design principles

1. Prefer the fewest tables that match cardinality and security needs.
2. Persist **data requirements**, not UI step numbers.
3. No employer, job, application, matching, admin, or lookup tables.
4. No JSON for structured essentials.
5. RLS: owner-only; anon denied; no admin bypass policies.
6. Service-role never in browser code.
7. Defer progressive profile fields (phone, CV, experience, introduction).

---

## Out of scope for Slice 1

`profiles` (shared account table — deferred until a second role needs it), `employer_profiles`, `companies`, `jobs`, `job_categories`, `languages` (lookup), `job_language_requirements`, `candidate_preferences` (as a catch-all), `saved_jobs`, `applications`, verification/moderation/audit tables, messaging, payments, analytics, Storage/CV.

**Architecture note:** `docs/07-architecture.md` prefers shared `profiles` + role-specific tables. For Slice 1 only candidates exist. This document **intentionally narrows** to a single candidate table keyed to `auth.users` until employer registration needs a shared identity layer (Slice 4). That narrowing is Accepted as D-019 for Slice 1 only — not a full architecture rewrite.

---

## Proposed tables (two)

| Table | Why it exists |
|-------|----------------|
| `candidate_profiles` | 1:1 with `auth.users`; holds identity display fields + essential candidate facts/preferences needed for Slice 1 exit and Slice 2 matching inputs |
| `candidate_languages` | 1:N languages with per-language proficiency; unique `(candidate_id, language_code)` |

### Why not more tables

| Rejected | Reason |
|----------|--------|
| Separate `profiles` | Would hold little beyond id/display_name/role while only candidates exist; role for employers is speculative now |
| `candidate_preferences` | Would become a misc bag; category / employment-type / shift arrays belong with other essentials on `candidate_profiles` |
| `languages` lookup | No shared job-language join yet; allow-listed codes on child rows suffice |

---

## Controlled values (allow-lists)

Exact lists are **product-owned** and must be approved before PR 1.3 UI ships. Migration PR may encode checks once lists are accepted. Do not invent a full occupational taxonomy in this planning PR.

| Domain | Source | Slice 1 stance |
|--------|--------|----------------|
| Language codes | Product allow-list (e.g. common Berlin candidate languages) | Constrained `text`; no free-form names |
| Language proficiency | Product labels | Constrained `text` check |
| German comfort | MVP “German comfort level” — self-reported comfort using German, for matching against vacancy language requirements; **not** a certified CEFR claim or job-performance guarantee | Constrained `text` check; final labels Pending |
| Travel radius | MVP “maximum travel time” | Integer **minutes**; proposed options `{15,30,45,60}` Pending approval |
| City | MVP Berlin-first | Fixed `Berlin` for Slice 1 (no postal code, district, coordinates, or street address) |
| Job categories | Derived later from MVP operational sectors / employer types — **founder approves allow-list** before PR 1.3 | `text[]` with check against allow-list |
| Employment types | MVP essential sequence item 6 | `text[]` allow-list Pending |
| Shift preferences | MVP essential sequence item 6 | `text[]` allow-list Pending |

---

## Table: `candidate_profiles`

### Purpose

One row per candidate account: display name, essential onboarding fields, completion marker.

### Keys

| | |
|--|--|
| PK | `id uuid` |
| FK | `id` → `auth.users.id` **on delete cascade** |

### Columns

| Column | Type | Null at insert | Required to complete | Default | Notes |
|--------|------|----------------|----------------------|---------|--------|
| `id` | `uuid` | no | yes | — | Equals `auth.uid()` |
| `display_name` | `text` | no | yes | — | UI address; not legal-name verification; length-capped in app |
| `german_comfort` | `text` | yes | yes | null | Self-reported German comfort (see above) |
| `work_authorisation_declared` | `boolean` | yes | must be `true` | null | Minimal self-declaration only — **no** nationality, permit type, or documents |
| `work_authorisation_declared_at` | `timestamptz` | yes | yes when declared | null | Set server-side when declaration becomes true |
| `city` | `text` | yes | yes | null | Slice 1: `Berlin` only |
| `travel_radius_minutes` | `integer` | yes | yes | null | Allow-listed minute values |
| `available_from` | `date` | yes | yes | null | Earliest start; not a weekly calendar |
| `job_categories` | `text[]` | no | non-empty | `'{}'` | Allow-listed |
| `employment_types` | `text[]` | no | non-empty | `'{}'` | Allow-listed |
| `shift_preferences` | `text[]` | no | non-empty | `'{}'` | Allow-listed |
| `onboarding_completed_at` | `timestamptz` | yes | non-null when complete | null | **Server-owned**; see completion model |
| `created_at` | `timestamptz` | no | — | `now()` | |
| `updated_at` | `timestamptz` | no | — | `now()` | Maintained by **application** on successful writes; **no** `updated_at` trigger in PR 1.1 |

### Explicitly not collected in Slice 1

Date of birth, gender, ethnicity, religion, disability diagnosis, marital status, photograph, nationality, immigration documents, precise address, coordinates, postal code, phone, CV, experience-by-category, introduction, weekly availability grid, hours/week min/max, free-text availability notes, support-requirements catch-all.

### Constraints / indexes

- PK `(id)`
- Check constraints for allow-listed scalars/arrays once lists are approved
- No secondary indexes required for Slice 1 beyond PK

### Deletion

Cascade from `auth.users`. Product delete/export UX is Slice 8.

---

## Table: `candidate_languages`

### Purpose

Multiple languages per candidate, each with proficiency (MVP: language selection and proficiency).

### Keys

| | |
|--|--|
| PK | `id uuid` default `gen_random_uuid()` |
| FK | `candidate_id` → `candidate_profiles.id` **on delete cascade** |

### Columns

| Column | Type | Null | Default | Notes |
|--------|------|------|---------|--------|
| `id` | `uuid` | no | `gen_random_uuid()` | |
| `candidate_id` | `uuid` | no | — | Must equal `auth.uid()` on write |
| `language_code` | `text` | no | — | Allow-listed code |
| `proficiency` | `text` | no | — | Allow-listed |
| `created_at` | `timestamptz` | no | `now()` | |
| `updated_at` | `timestamptz` | no | `now()` | App-maintained |

### Constraints / indexes

- Unique `(candidate_id, language_code)`
- Index `(candidate_id)` for owner listing

German comfort remains on `candidate_profiles` (MVP lists it alongside languages, not as just another `candidate_languages` row), so matching can treat German requirement separately from other spoken languages.

---

## Field traceability

| Field | Source | Why now | Req/opt | Storage | Validation | Sensitivity |
|-------|--------|---------|---------|---------|------------|-------------|
| Email / password | MVP auth | Account | Required | `auth.users` | Auth rules | High / secret |
| Display name | Features “display name”; UX necessity | Address candidate in UI | Required | `candidate_profiles` | Non-empty, length cap | PII |
| Languages + proficiency | MVP essential #1 | Matching input | ≥1 language | `candidate_languages` | Allow-lists | PII-adjacent |
| German comfort | MVP essential #1 | Matching vs vacancy German requirement | Required | `candidate_profiles` | Allow-list | PII-adjacent; not a certificate |
| Work-authorisation declaration | MVP essential #2; terminology | Matching eligibility signal | Required `true` | `candidate_profiles` | Boolean true + server timestamp | High-care self-attestation — **legal/privacy wording review** |
| City = Berlin | MVP essential #3 | Location fit | Required | `candidate_profiles` | Equals `Berlin` | Low-precision location PII |
| Travel radius (minutes) | MVP essential #3 | Travel fit | Required | `candidate_profiles` | Allow-listed int | Low |
| Job categories | MVP essential #4 | Category fit | ≥1 | `candidate_profiles` | Allow-list array | Low |
| Available from | MVP essential #5 | Start timing | Required | `candidate_profiles` | Date policy in app | Low |
| Employment types | MVP essential #6 | Contract fit | ≥1 | `candidate_profiles` | Allow-list array | Low |
| Shift preferences | MVP essential #6 | Schedule fit | ≥1 | `candidate_profiles` | Allow-list array | Low |
| `onboarding_completed_at` | Technical necessity for resume/Slice 2 gate | Exit criterion | Server-set | `candidate_profiles` | Server-only write path | Low |

**Deferred (progressive / later slices):** phone, CV, experience, introduction, weekly availability calendar, employer discoverability consent, marketing consent.

---

## Completion model (proposed)

**Selected proposal:** store `onboarding_completed_at timestamptz` (null = not complete). Do **not** store a client-writable status enum.

| Situation | Interpretation |
|-----------|----------------|
| No `candidate_profiles` row | Account may exist in Auth; candidate record not initialized |
| Row exists, `onboarding_completed_at` is null | Essentials incomplete (resume using first missing required field group) |
| Row exists, `onboarding_completed_at` set | Essentials complete for Slice 2 gate |

**Rules:**

- Completeness is decided by a **controlled server operation** that validates all required fields + ≥1 language, then sets `onboarding_completed_at = now()`.
- Clients must not update `onboarding_completed_at` (RLS column privilege or server-only RPC/service path).
- After completion, candidates may edit essentials; if validation would fail, server clears `onboarding_completed_at` (backward transition) and resumes incomplete routing.
- UI screen count is irrelevant to this column.

**Rejected alternative:** three-value `onboarding_status` enum — easy to over-write from the client and conflates UI with persistence.

---

## Account / profile creation (blocker before PR 1.1)

**Proposed recommendation: application-controlled idempotent upsert** after successful Auth signup (and on first authenticated load if missing).

| Approach | Pros | Cons |
|----------|------|------|
| DB trigger on `auth.users` | Atomic | Hidden behaviour; harder to debug; metadata coupling |
| **App upsert (proposed)** | Explicit domain errors; testable | Must handle retries/idempotency; brief Auth-without-row window |

**D-024 Accepted (2026-08-01):** use application upsert; do not add an `auth.users` insert trigger in PR 1.1.

---

## Conceptual RLS

For both tables:

| Op | Rule |
|----|------|
| `SELECT` | Owner only (`id = auth.uid()` or `candidate_id = auth.uid()`) |
| `INSERT` | Owner only; ownership key **must** equal `auth.uid()` (`WITH CHECK`) |
| `UPDATE` | Owner only (`USING` + `WITH CHECK`); ownership key immutable |
| `DELETE` | Prefer defer to account-deletion (Slice 8); if allowed, owner only |

Additional:

- Deny all for `anon`.
- Authenticated users without a candidate row see **zero rows**, not a privilege error for normal selects.
- `onboarding_completed_at` and `work_authorisation_declared_at` are not broadly client-updatable.
- PR 1.1 enforces that with **column privileges** (authenticated insert/update omit those columns). Privileged roles (`service_role` / table owner) can still set them for later server paths. No completion RPC in PR 1.1.
- `anon` has **no** table privileges on these tables (defense in depth; not only empty RLS). Denied anon access therefore raises permission errors (`42501`), rather than returning zero rows under a granted SELECT.
- No admin policies.
- `service_role` may hold table grants for future controlled server operations only. Browser/SSR candidate flows must use the authenticated role and RLS — not `service_role`.
- Language codes are stored as provided; no database `lower()` / case-folding until product requires canonical codes.
- `candidate_languages.candidate_id` is insert-only for authenticated clients (column privilege); ownership cannot be reassigned via UPDATE.

**Tests (PR 1.1):** two Auth users; cross-user select/update denied; anon denied; owner CRUD on own language rows; attempt to set another user’s `candidate_id` fails `WITH CHECK`.

---

## Privacy (not legal advice)

- No special-category collection (health, ethnicity, religion, etc.).
- Work-authorisation is a **candidate-provided matching/support declaration**, not Stint adjudicating legal eligibility — wording Pending review.
- No precise address or coordinates in Slice 1.
- Retention periods Pending.
- Export/delete in Slice 8; cascade should not block future deletion.

---

## Decisions for PR 1.1

Accepted 2026-08-01: D-019 (two tables), D-020 (`onboarding_completed_at`), D-023 (RLS), D-024 (app upsert, no Auth trigger in 1.1).

Allow-lists may be finalized before PR 1.3; migrations may land with checks added once lists are approved.

---

## Unresolved / Pending items

1. Category, language, employment-type, shift allow-lists (founder/product) — before PR 1.3
2. German comfort label set — before PR 1.3
3. Travel-radius option set — before PR 1.3
4. D-021 authentication method — still **Proposed** (before PR 1.2)
5. D-022 hosted Supabase / email-confirmation policy — still **Proposed** (before PR 1.2 Preview Auth)
6. Retention periods
7. Terms/privacy acknowledgement copy at signup
