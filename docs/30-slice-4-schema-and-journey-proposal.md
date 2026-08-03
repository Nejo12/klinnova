# Slice 4 Schema and Journey Proposal

> Design proposal only. No migrations land here.
> **Status:** Discovery / planning. Aligns with Proposed D-046–D-054.
> Table/column names are proposals until Accepted.

**Depends on:** Accepted D-034; current migrations through
`20260803120000_applications_schema_and_submit_rpc.sql`.

**Companion:** `docs/28-slice-4-discovery.md`, `docs/29-slice-4-build-plan.md`

---

## Goals

1. Represent private and organisation employers without forcing company profiles
   on households (D-034).
2. Let employers save private structured drafts.
3. Keep drafts invisible to candidates, anon, matchers, and application submit.
4. Leave verification approval and publication to Slice 5.
5. Preserve seed Demo companies/vacancies and candidate flows.

---

## Recommended entities

### `employer_profiles` (new)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | `= auth.users.id` ON DELETE CASCADE |
| `employer_type` | `text` NOT NULL | `private` \| `organisation`; immutable after insert |
| `display_name` | `text` NOT NULL | Employer-facing display |
| `berlin_locality` | `text` NULL | Privacy-safe district/locality |
| `phone` | `text` NULL | Optional; not public |
| `website` | `text` NULL | Org-oriented; optional for private |
| `organisation_legal_name` | `text` NULL | Org only |
| `lawful_hiring_declared_at` | `timestamptz` NULL | Server-set on declaration |
| `verification_state` | `text` NOT NULL | Slice 4: only `unverified` |
| `onboarding_completed_at` | `timestamptz` NULL | Server-owned completion gate |
| `created_at` / `updated_at` | `timestamptz` | Standard |

Contact email inherits from Auth; do not duplicate unless product later requires
a separate public contact.

**Private minimum (onboarding complete):** `employer_type=private`,
`display_name`, lawful-hiring declaration, Berlin locality (recommended).

**Organisation minimum:** `employer_type=organisation`, `display_name`,
`organisation_legal_name` (or trading name rule), linked company row,
lawful-hiring declaration, Berlin locality (recommended).

**Not in Slice 4:** commercial registration numbers as hard requirements to
save drafts; verification evidence blobs; verified badges.

### `companies` (extend)

Current seed columns remain. Proposed additive columns:

| Column | Type | Notes |
|--------|------|-------|
| `owner_employer_id` | `uuid` NULL FK → `employer_profiles` | Null for seed |
| `source` | expand CHECK | `seed` \| `employer` |

Rules:

- Seed rows: `source=seed`, `owner_employer_id IS NULL`
- Employer rows: `source=employer`, `owner_employer_id NOT NULL`
- Organisation employer owns **exactly one** company in Slice 4 (unique on
  `owner_employer_id` where not null)
- Private employers create **no** company row
- Team membership tables: deferred

### `vacancies` (extend)

Keep seed behaviour. Proposed additive / relaxed columns:

| Column | Change |
|--------|--------|
| `employer_profile_id` | `uuid` NULL FK → `employer_profiles`; NOT NULL when `source=employer` |
| `company_id` | Become nullable; NOT NULL when seed OR organisation employer vacancy |
| `source` | CHECK expands: `seed` \| `employer` |
| `publication_state` | CHECK expands: `draft` \| `published` \| `withdrawn` |
| `expires_at` | Nullable when `publication_state=draft`; NOT NULL when published |
| `summary` | Retain; short description; draft placeholder rules as Accepted |
| `description` | New `text` NULL — longer duties; required for publish-ready |
| `public_locality` | New `text` NULL — privacy-safe district/area |
| `workplace_type` | New `text` NULL — allow-list (home, apartment, shop, …) |
| `work_frequency` | New `text` NULL — `one_off` \| `recurring` |
| `salary_amount_cents` | New `integer` NULL — EUR minor units |
| `salary_period` | New `text` NULL — `hourly` \| `monthly` \| `fixed_job` |
| `salary_basis` | New `text` NULL — `gross` when salary set |
| `cv_required` | New `boolean` NULL |
| `interview_english_ok` | New `boolean` NULL |
| `experience_notes` | New `text` NULL — prefer defer structured experience |
| Existing | `title`, `slug`, `city`, `job_category`, `employment_types`, `shift_requirements`, `german_requirement`, `available_from`, `published_at` |

**Cross-checks (proposed):**

- `source=seed` ⇒ `employer_profile_id IS NULL`, `company_id NOT NULL`
- `source=employer` ⇒ `employer_profile_id NOT NULL`
- organisation owner ⇒ vacancy `company_id` = that employer’s company
- private owner ⇒ `company_id IS NULL`
- `publication_state=draft` ⇒ `published_at IS NULL`, `expires_at IS NULL`
- `publication_state=published` ⇒ existing published_at/expires_at rules remain
- Slice 4 policies/RPCs **must not** allow transition draft→published

**Exact private address:** not a column in Slice 4.

### `vacancy_language_requirements` (extend policies only)

Reuse normalized table. Employer may mutate rows for owned draft vacancies.
Codes and `min_proficiency` follow D-029 / candidate proficiency vocabulary.
Free-text language lines prohibited.

“No German required” ⇒ `german_requirement = 'none'`, not a fake language row.

---

## Field classification

### Required to create/save an initial draft

- Auth employer with completed employer onboarding
- `title` (non-empty)
- `job_category` (allow-list)
- ownership derived server-side
- `publication_state=draft`, `source=employer`
- `city='Berlin'` (MVP default)

### Draft CHECK relaxation (proposed)

Current vacancies require non-empty `employment_types` and `shift_requirements`.
For drafts, either:

1. allow empty arrays while draft, enforce non-empty for publish-ready; or
2. require at least one employment type and shift on first save.

**Recommendation:** option 1 for resume-friendly drafts.

### Required for publish-ready (Slice 5 gate; checklist in Slice 4 UI)

- `description` non-empty
- `public_locality` non-empty
- non-empty `employment_types` and `shift_requirements`
- `german_requirement` set
- language requirements consistent with policy
- `salary_amount_cents` + `salary_period` + `salary_basis`
- `workplace_type` when private (and when required for org)
- `work_frequency` when product requires
- planned expiry strategy (applied at publish in Slice 5)
- `cv_required` and `interview_english_ok` explicit booleans

### Optional in Slice 4

- phone; website; experience notes; vacancy contact override (defer)

### Deferred beyond Slice 4

- exact address storage/encryption
- salary negotiable / net / multi-currency / ranges
- CEFR / fluent vocabulary
- verification uploads; publish flows; teams; draft duplication
- headcount/openings unless owner requires

---

## Salary model (proposed)

| Rule | Value |
|------|-------|
| Currency | EUR only |
| Storage | `salary_amount_cents integer` (> 0 when set) |
| Period | `hourly` \| `monthly` \| `fixed_job` |
| Basis | `gross` when salary present (net deferred) |
| Range / negotiable | Deferred |
| Draft save | Salary optional |
| Publish-ready | Salary required |
| Formatting | Format cents in UI; no free-text salary |

---

## Location and privacy model (proposed)

| Concern | Slice 4 approach |
|---------|------------------|
| Later public/candidate-facing | `public_locality` + `city` (Berlin) |
| Exact address | **Not collected** |
| Draft locality readers | Owning employer only |
| Private-home warning | UI when workplace_type is residential |
| Precise disclosure | Slice 5+ / consented stage — out of scope |

---

## Language requirement model (proposed)

- Reuse `vacancy_language_requirements`
- Allow-lists aligned with candidate languages + D-029 German codes
- Required minimum only (no preferred tier in MVP)
- No free-text language requirements
- Drafts never enter matcher inputs

---

## Expiry model (proposed)

| State | `expires_at` |
|-------|----------------|
| Draft | `NULL` |
| Published | NOT NULL; visibility `expires_at > now()` |
| Auto-expiry / default lifetime | Slice 5 |

---

## Verification boundary (proposed)

| Stored in Slice 4 | Not implemented |
|-------------------|-----------------|
| `verification_state='unverified'` | Approval / rejection / uploads |
| UI: verification required before publishing | Badges / admin queue / publish auth |

Unverified employers **may** create and edit drafts.

---

## Routes and journey (proposed)

| Route | Purpose |
|-------|---------|
| `/employer/register` | Employer registration entry |
| `/login?next=/employer` | Shared login |
| `/employer` | Home — completed employer onboarding |
| `/employer/onboarding` | Type + profile (+ company for org) |
| `/employer/vacancies` | List own drafts |
| `/employer/vacancies/new` | Create draft |
| `/employer/vacancies/[vacancyId]/edit` | Edit owned draft |
| `/employer/vacancies/[vacancyId]` | Optional owner preview |

**Not in Slice 4:** public employer pages; applicants; publish mutations.

### Authorization behaviour

| Actor | Behaviour |
|-------|-----------|
| Unauthenticated `/employer/*` | Redirect `/login?next=…` |
| Candidate-only | Start employer onboarding; no foreign drafts |
| Incomplete employer | Onboarding only |
| Wrong owner / unknown id | Generic unavailable |
| Dual capability | Nav between `/candidate` and `/employer` |
| Post-save | Prefer redirect to edit for resume |

Proxy: protect `/employer` and `/employer/*` like candidate paths.

---

## Persistence boundary (proposed)

```text
Browser form
  -> Server Action + Zod
      -> Auth getUser / getClaims
      -> derive employer_profile_id = auth.uid()
      -> RLS write and/or SECURITY DEFINER RPC
```

| Operation | Mechanism |
|-----------|-----------|
| Ensure employer profile | Action + RLS insert (`id = auth.uid()`) |
| Onboarding group saves | Action + RLS update |
| Complete employer onboarding | Auth-bound RPC |
| Create org profile + company | Auth-bound RPC (atomic) |
| Create/update draft | Action + RLS; RPC if languages bundled |
| Replace language requirements | RPC recommended |

**Caller must not supply:** owner ids, foreign company ids, verification_state,
source, illegal publication_state, published_at, moderation fields.

**Error taxonomy:** `unauthenticated` \| `incomplete` \| `forbidden` \|
`validation` \| `not_found_or_unavailable` \| `failure`.

---

## RLS matrix (proposed)

### `employer_profiles`

| Actor | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| anon | no | no | no | no |
| candidate-only | no | no | no | no |
| owner | own | own `id=auth.uid()` | own non-server cols | no |
| unrelated employer | no | no | no | no |
| service_role | yes | yes | yes | yes |

### `companies`

| Actor | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| anon | no | no | no | no |
| completed candidate | seed visible only | no | no | no |
| owning org employer | own employer company | own via RPC/RLS | own | no |
| private / unrelated | no | no | no | no |

### `vacancies`

| Actor | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| anon | no | no | no | no |
| completed candidate | active published **seed** only | no | no | no |
| owning employer | own employer rows | draft only | own drafts | own drafts w/o applications (if Accepted) |
| unrelated employer | no | no | no | no |

Drafts excluded from candidate visibility helpers and submit RPC gates.

### `vacancy_language_requirements`

| Actor | SELECT | Mutate |
|-------|--------|--------|
| completed candidate | visible published seed only | no |
| owning employer | owned vacancies | owned **drafts** |
| others | no | no |

### RPC execute

Employer completion / org bootstrap / language replace: authenticated execute;
body enforces `auth.uid()`. No publish RPC in Slice 4.

---

## Candidate isolation checklist

- Do not broaden seed visibility helpers to employer drafts
- Submit RPC keeps published/visible vacancy rules
- Matcher loaders use candidate-visible inventory only
- Seed constraints and Demo fixtures remain valid
- Application snapshots unchanged
- Candidate proxy/completion unchanged

---

## Accessibility and content

- Type selection radiogroup with short help
- Onboarding progress + resume
- Draft list with publish-ready indicator
- Save draft primary; no Publish primary in Slice 4
- Residential workplace privacy callout
- Factual verification-before-publish notice

---

## Tests required before Slice 4 Done

1. Unit: schemas, publish-ready helper, resolvers
2. Action tests: ownership, validation, dual-role redirects
3. pgTAP: constraints; RLS matrix; seed regression
4. Playwright: private + org journeys; invisibility; denials; candidate regression
5. Static: no service-role browser writes; no caller-owned verification/source/owner
6. Local exit proof + Preview-first hosted runbook

---

## Rejected / deferred alternatives

| Idea | Why not now |
|------|-------------|
| Exclusive `profiles.role` | Role trap |
| Fake company for every private employer | Conflicts with D-034 |
| Exact address in drafts | Privacy risk |
| Publish in Slice 4 | Slice 5 boundary |
| Verification uploads | Slice 5 |
| Membership/teams | Overbuilt |
| Free-text salary | Weak validation |
| Postgres ENUMs | Repo uses text+CHECK |

---

## Approval checklist (owner)

All items below **Require owner decision**. Recommendations in this document are
not Accepted until the owner marks them so.

- [ ] Accept or revise D-046–D-054 as a package (**Requires owner decision**)
- [ ] Dual candidate/employer capability coexistence (**Requires owner decision**)
- [ ] Employer-type immutability after initial profile creation (**Requires owner decision**)
- [ ] Multi-role landing behaviour (**Requires owner decision**)
- [ ] Draft deletion in Slice 4 (**Requires owner decision**)
- [ ] Route names: `/employer/vacancies` vs `/employer/jobs` (**Requires owner decision**)
- [ ] Confirm vacancy ownership via `employer_profile_id`
- [ ] Confirm no exact-address collection in Slice 4
- [ ] Confirm draft vs publish-ready field split
- [ ] Confirm salary cents + period + gross EUR model
- [ ] Confirm hosted proof stays Preview-first without Production authorization

When Accepted, open PR 4.1 against the locked schema proposal. Do not begin
implementation from Proposed status alone.
