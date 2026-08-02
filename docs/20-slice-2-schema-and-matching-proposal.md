# Slice 2 Schema and Matching Proposal

> Proposal locked to Accepted D-026–D-033 (2026-08-01). PR 2.1 (merged) implements schema, RLS, and local/CI fixtures. PR 2.2 implements the pure matcher and authenticated server loader (no UI).
> Terminology: `vacancy` in schema/employer contexts; `job` in candidate-facing UI (`docs/12-terminology.md`).

**Depends on:** Slice 1 schema (`docs/17`); D-012, D-019, D-020, D-023, D-025; D-026–D-033 Accepted.

**Companion:** `docs/18-slice-2-discovery.md`, `docs/19-slice-2-build-plan.md`.

---

## Goals

1. Persist **fictional/demo Berlin seed vacancies** with structured eligibility fields aligned to D-025 / D-029.
2. Compute **deterministic, explainable matches** for completed candidates via pure TypeScript rules.
3. Authorise reads so only completed authenticated candidates see active published unexpired seed vacancies.
4. Leave employer Auth, verification, applications, salary, experience, and ingestion to later slices.

---

## Proposed tables

### `companies`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK; `default gen_random_uuid()` |
| `name` | `text` | `not null`; non-empty (`btrim` length > 0) |
| `slug` | `text` | `not null`; non-empty; `unique` |
| `source` | `text` | `not null`; Slice 2 CHECK `source = 'seed'` |
| `created_at` | `timestamptz` | `not null`; `default now()` |
| `updated_at` | `timestamptz` | `not null`; `default now()` |

**Removed:** `is_platform_seed` — redundant with `source = 'seed'`.

**Slice 2 scope:** fictional/demo company rows only. No employer Auth users. No verification columns. Schema remains extensible later for real employer ownership (additional `source` values / FKs via future migration — not Slice 2).

### `vacancies`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK; `default gen_random_uuid()` |
| `company_id` | `uuid` | `not null`; FK → `companies(id)` |
| `title` | `text` | `not null`; non-empty |
| `slug` | `text` | `not null`; non-empty; `unique` |
| `summary` | `text` | `not null`; non-empty |
| `city` | `text` | `not null`; CHECK `city = 'Berlin'` |
| `job_category` | `text` | `not null`; ∈ D-025 job categories (single primary category) |
| `employment_types` | `text[]` | `not null`; non-empty; unique elements; ⊆ D-025 employment types |
| `shift_requirements` | `text[]` | `not null`; non-empty; unique elements; ⊆ concrete shifts only (below) |
| `german_requirement` | `text` | `not null`; ∈ aligned German vocabulary (D-029) |
| `available_from` | `date` | nullable; null = flexible start |
| `publication_state` | `text` | `not null`; CHECK ∈ (`published`, `withdrawn`) |
| `source` | `text` | `not null`; Slice 2 CHECK `source = 'seed'` |
| `published_at` | `timestamptz` | nullable only when not published; required when published |
| `expires_at` | `timestamptz` | `not null` |
| `created_at` | `timestamptz` | `not null`; `default now()` |
| `updated_at` | `timestamptz` | `not null`; `default now()` |

**Table constraints:**

- `publication_state = 'published'` ⇒ `published_at IS NOT NULL`
- when `published_at` is not null: `published_at <= expires_at`
- no salary column; no experience column; no coordinates; no external ingestion IDs; no `english_ok`; no `salary_display`

**Concrete vacancy shifts (no `flexible`):** `morning`, `daytime`, `evening`, `night`, `weekend`.

`weekend` may coexist with time-of-day values on the same vacancy as independent acceptable labels.

### `vacancy_language_requirements`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK; `default gen_random_uuid()` — **kept to match `candidate_languages` convention** |
| `vacancy_id` | `uuid` | `not null`; FK → `vacancies(id)` ON DELETE CASCADE |
| `language_code` | `text` | `not null`; ⊆ D-025 language codes |
| `min_proficiency` | `text` | `not null`; ⊆ D-025 proficiency codes |
| Unique | `(vacancy_id, language_code)` | |

**Choice — surrogate ID:** Keep `id uuid PK` for consistency with `candidate_languages` (surrogate PK + unique parent/language). Composite-only PK rejected for Slice 2 to avoid divergent child-table patterns.

**Semantics:** Zero rows permitted. When rows exist, **all** are mandatory (every row must be satisfied). No preferred-language scoring.

---

## Lifecycle and visibility

| State | Meaning |
|-------|---------|
| `published` | Active for matching when also unexpired and `published_at <= now()` |
| `withdrawn` | Not visible / not matchable |

**Active seed vacancy (visible + eligible for matching load):**

- `source = 'seed'`
- company `source = 'seed'`
- `publication_state = 'published'`
- `published_at IS NOT NULL` AND `published_at <= now()`
- `expires_at > now()`

Withdrawn, unpublished-shaped, future-dated publish, or expired rows are out of matching scope.

Demo/hosted records are expiring/removable; operators withdraw or expire rather than leaving perpetual fake inventory.

---

## Seed / demo environment contract (D-031)

| Environment | Rule |
|-------------|------|
| **Local** | Deterministic fictional fixtures through local seed tooling |
| **CI** | Deterministic fixtures during reset/test setup |
| **Preview** | Optional explicit owner-applied demo fixture set |
| **Production** | **No** automatic business-data insertion through schema migrations; explicit owner-controlled demo-data operation only |

Production/Preview demo records must be:

- fictional;
- visibly labelled **Demo vacancy**;
- `source = seed`;
- expiring/removable;
- no real company names;
- no verified-employer claim.

---

## German vocabulary and comparison (D-029)

Aligned codes (candidate `german_comfort` and vacancy `german_requirement`):

`none` | `basic` | `conversational` | `comfortable`

**Canonical ordinal ranks:**

| Code | Rank |
|------|------|
| `none` | 0 |
| `basic` | 1 |
| `conversational` | 2 |
| `comfortable` | 3 |

**Eligibility:** `rank(candidate.german_comfort) >= rank(vacancy.german_requirement)`.

No CEFR. No Fluent. No `none_required` / `english_ok`.

---

## Additional languages

- Normalized rows in `vacancy_language_requirements`.
- Zero rows allowed → language filter passes; **do not** emit `additional_languages_met`.
- When rows exist, every row must be satisfied by some `candidate_languages` row with the same `language_code` and `rank(proficiency) >= rank(min_proficiency)`.
- Proficiency order: `basic` < `conversational` < `proficient` < `native`.
- `other` matches only `other`.
- No preferred-language scoring.

---

## Shift semantics

| Side | Rule |
|------|------|
| Candidate `flexible` | Willing to consider **any** concrete vacancy shift → passes shift eligibility |
| Vacancy `shift_requirements` | Concrete only: `morning`, `daytime`, `evening`, `night`, `weekend` — **cannot** contain `flexible` |
| Otherwise | Pass when concrete arrays overlap (≥1 shared code) |
| `weekend` + time-of-day | May coexist on a vacancy; any one overlapping label is enough |

---

## Availability

- Vacancy `available_from` null → flexible start → pass.
- Else pass when `candidate.available_from <= vacancy.available_from`.
- Compare as calendar dates in `Europe/Berlin`.

---

## Matching rules (D-028)

### Eligibility gate (before vacancy load)

1. Verified authenticated session (`auth.uid()` only — no candidate UUID from browser).
2. Own `candidate_profiles` row exists for `auth.uid()`.
3. `onboarding_completed_at IS NOT NULL`.
4. Otherwise reject / resume onboarding **before** loading vacancies.

### Hard filters (all must pass)

1. Company `source = 'seed'`; vacancy `source = 'seed'`.
2. `publication_state = 'published'`; `published_at <= now()`; `expires_at > now()`.
3. `vacancy.city = 'Berlin'` and `candidate.city = 'Berlin'`.
4. `vacancy.job_category` ∈ `candidate.job_categories`.
5. `vacancy.employment_types` overlaps `candidate.employment_types` (≥1 shared code).
6. Shift rule (flexible OR concrete overlap) as above.
7. German: `rank(candidate.german_comfort) >= rank(vacancy.german_requirement)`.
8. Every language-requirement row satisfied (or zero rows).
9. Availability rule as above.
10. Work authorisation: implied by completion gate only — **not** a match reason.

### Ordering (deterministic)

1. `published_at DESC`
2. `title ASC`
3. `id ASC`

No numeric scores. No persisted matches table.

### Engine placement

1. Authenticated server loader reads candidate + active seed vacancies under RLS (identity from session only).
2. Pure functions in `src/lib/matching/` **do not fetch**; they accept loaded data and return matches + reasons.
3. Incomplete candidates rejected before vacancy loading.
4. No temporary diagnostic or public match endpoint.

---

## Explanation contract (closed union)

Stable reason codes, in this priority order:

| Priority | Code | When emitted |
|----------|------|----------------|
| 1 | `category_match` | Category filter passed |
| 2 | `employment_type_match` | Employment overlap passed |
| 3 | `shift_match` | Shift rule passed |
| 4 | `german_requirement_met` | German rank rule passed |
| 5 | `additional_languages_met` | Language rows existed and all were satisfied |
| 6 | `availability_match` | Availability rule passed |
| 7 | `berlin_job` | Berlin location filter passed |

**Rules:**

- Explanations produced by the **same rules** as eligibility (only for filters that passed for a shown match).
- UI displays **at most four** reasons, taking the highest-priority codes that apply.
- No `additional_languages_met` when the vacancy has zero language rows.
- No work-authorisation reason; no travel reason; no scores; no perfect-match language; no internal rank exposure.

### Work-authorisation gate copy (page-level, not per card)

> Matches are shown using the work-authorisation declaration you provided during onboarding. Stint has not verified documents.

Do not place a legal-eligibility badge on every card.

### Travel / location display

- May show factual Berlin location.
- Must not claim travel-radius fit or “within your travel preference”.

---

## RLS contract (D-033)

Semantics (implemented in PR 2.1):

```text
visible_seed_vacancy_ids() :=
  SECURITY DEFINER set-returning helper
  returns vacancy ids only when auth.uid() owns a completed candidate profile
  AND vacancy/company are seed
  AND publication_state = published
  AND published_at <= now()
  AND expires_at > now()
  otherwise empty

visible_seed_company_ids() :=
  distinct company_ids that currently have at least one id from
  visible_seed_vacancy_ids() semantics (contract B)

companies SELECT:
  id IN (SELECT visible_seed_company_ids())

vacancies SELECT:
  id IN (SELECT visible_seed_vacancy_ids())

vacancy_language_requirements SELECT:
  vacancy_id IN (SELECT visible_seed_vacancy_ids())

anon: no table privileges; no helper EXECUTE
authenticated: SELECT only on tables; EXECUTE on visibility helpers
  (required for policy evaluation; direct calls return only already-visible ids)
identity: auth.uid() only — no candidate UUID argument on helpers
service_role: may exist for owner-controlled seed/admin ops;
  never used in browser or ordinary SSR candidate clients
```

UUID-probe predicates (`company_is_seed(uuid)`, `vacancy_is_active_seed(uuid)`, etc.) are intentionally **not** present — they leaked hidden inventory to incomplete authenticated callers. Set-returning helpers embed the completion gate and return only D-033-visible ids.

---

## Route boundary (D-032)

- **Only** `/candidate/matches`.
- No detail route; no apply; no save; no employer contact; no disabled future-action buttons.
- Incomplete → resume onboarding (existing Slice 1 behaviour).

---

## Traceability to Slice 2 exit criteria

| Exit criterion (`docs/13`) | How this proposal meets it |
|----------------------------|----------------------------|
| Relevant matches in under three minutes | Completed candidate → `/candidate/matches`; small demo fixture set |
| Each match explains why | Closed reason union + ≤4 prioritized reasons |
| No opaque scores | No score field; deterministic sort only |

---

## Rejected / deferred

| Alternative | Why not |
|-------------|---------|
| Fake employer Auth | D-026 |
| `is_platform_seed` | Redundant with `source` |
| `english_ok` / `salary_display` | Removed |
| Category arrays on vacancy | Single `job_category` |
| Detail route / apply / save | D-032 / Slice 3 |
| Auto Production seed in migrations | D-031 |
| Temporary diagnostic endpoint | D-028 |
| Experience fields / pseudo-requirements | D-027 |
| Travel as eligibility/reason/claim | D-030 |
| Vector / ML ranking | `NOT_NOW.md` |

---

## Approval checklist

- [x] D-026–D-033 Accepted
- [x] Table list locked to this proposal
- [x] Hard filters + explanation model locked
- [x] RLS contract locked
- [x] Seed environment contract locked
- [x] PR 2.1 implementation (schema/RLS/local-CI fixtures; merged PR #26)
- [ ] PR 2.2 implementation (pure matcher + authenticated loader; UI remains PR 2.3)
