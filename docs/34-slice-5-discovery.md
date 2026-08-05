# Slice 5 Discovery

> Analysis artifact. No migrations or application code land here.
> **Status:** Planning only. Decisions D-055–D-067 are **Proposed** — not Accepted.
> Do not begin Slice 5 implementation until owner acceptance.

**Outcome to enable:** Only verified employers may publish public vacancies;
employers can manage publication lifecycle; candidates can match and apply to
eligible published employer vacancies as well as seed Demo vacancies
(`docs/13-implementation-plan.md`).

**Related:**

- Build plan — `docs/35-slice-5-build-plan.md`
- Schema + publication proposal — `docs/36-slice-5-schema-and-publication-proposal.md`
- Proposed decisions — D-055–D-067 in `docs/10-decisions.md`
- Slice 4 closure — `docs/33-slice-4-closure.md` (Done)
- Prior Accepted boundaries — D-034, D-046–D-054

---

## Verified baseline (do not re-litigate)

| Fact | Evidence |
|------|----------|
| Slice 0–4 Done | `docs/14`; `docs/27`; `docs/33` |
| `employer_profiles` exists; dual capability; no exclusive role | D-047; migration `20260803200000` |
| `verification_state` CHECK + trigger force `'unverified'` only | Same migration; comment defers Slice 5 |
| Employer drafts: `source=employer`, `publication_state=draft` only | `vacancies_employer_draft_only_chk`; D-050 |
| No publish RPC; readiness does not publish | `employer_vacancy_draft_readiness`; static security tests |
| Candidate visibility is seed + published + time window only | `visible_seed_vacancy_ids`; D-033 |
| Applications: candidate SELECT own; submit RPC; status `submitted` only | Slice 3; D-042 |
| No employer application read policies | `docs/24`; migrations |
| Exact private residential address not stored | D-051 |
| Location public surface: `city='Berlin'` + optional `public_locality` | Vacancy schema |
| Salary / languages / CV / interview-English exist on drafts | Slice 4 schema |
| Preview has **no** Preview-scoped Supabase configuration after Slice 4 teardown | `docs/33` |
| Production not authorized by any prior Slice 5 decision | New auth required (D-067 Proposed) |
| Applicant review = Slice 6; admin moderation/audit UI = Slice 7 | `docs/13` |

---

## Source-document tensions

### T1 — Manual verification vs Slice 7 admin UI

| Source | Says |
|--------|------|
| MVP (`docs/04`) | Type-specific **manual** employer verification; Administration includes verification queue |
| `docs/13` Slice 5 | Type-specific verification state; publish flows |
| `docs/13` Slice 7 | Admin authorization; employer review/approval; audit events |
| Current code | No admin role, no operator table, verification locked to `unverified` |

**Recommendation (D-056):** Slice 5 implements the **trust gate** (states + request +
approval mutation + publish gate) without a full admin product surface. Approval
is performed by a **platform operator** (founder allow-list) through an
authenticated, Auth-bound SECURITY DEFINER RPC / Server Action — not
self-declaration, not service-role in the browser, and not a full Slice 7 queue UI.
Full verification queue, suspension UI, and audit administration remain Slice 7.

### T2 — Six lifecycle words vs three DB states

| Source | Says |
|--------|------|
| `docs/13` Slice 5 | publish / pause / expire / fill |
| MVP | close, expire, filled |
| Current DB | `draft` \| `published` \| `withdrawn` only; employer forced draft |

**Recommendation (D-058):** Expand employer-capable states to
`draft | published | paused | filled | expired | withdrawn`. Keep seed behaviour
compatible (`published` / `withdrawn` + time window). Prefer **explicit RPCs** per
transition, not a generic status setter.

### T3 — “Public vacancy” vs current anon denial

| Source | Says |
|--------|------|
| `docs/13` | Public job visibility rules |
| D-033 / current RLS | Anon denied on vacancies; completed candidates see seed only |

**Recommendation (D-060):** Authenticated completed candidates see eligible
published employer vacancies **and** seed vacancies via an expanded visibility
helper. Add anonymous-readable **public** routes `/jobs` and `/jobs/[vacancyId]`
with a narrow published-active projection (privacy-safe fields only). Candidate
apply remains on authenticated `/candidate/jobs/[vacancyId]`. Do not invent a
second incompatible vacancy domain model — share loaders/projections where safe.

### T4 — Broad vacancy fields vs schema today

| Source | Says |
|--------|------|
| MVP / older Slice 4 wording | Contract, shift/schedule, experience requirements |
| Slice 4 Accepted (D-051) | Existing fields + readiness checklist; experience deferred; expiry at publish = Slice 5 |
| Current columns | `employment_types[]`, `shift_requirements[]` exist; no separate contract enum; no experience requirement column |

**Recommendation (D-059):** Publish readiness builds on existing
`employer_vacancy_draft_readiness` **plus** verified employer + publish-time
`expires_at`. Do **not** invent experience, exact address, or new contract enums
in Slice 5 unless owner acceptance expands scope. Treat existing
`employment_types` / `shift_requirements` as the contract/shift surface already
present.

### T5 — Hosted proof Preview gap

| Source | Says |
|--------|------|
| Slice 4 closure | Preview overrides cleared; no Preview-scoped Supabase vars |
| D-054 / D-045 history | Isolation preferred; Production needs new explicit auth |

**Recommendation (D-067):** Slice 5 hosted proof requires a **new** isolated
disposable or Staging project + matching Preview configuration. No prior
authorization carries forward. Do not silently point Preview at Production.

---

## Discovery answers (decision-ready)

### 1–5. Verification ownership and authority

| Option | Verdict |
|--------|---------|
| A. Self-declared verification | **Reject** — silently weakens “only verified may publish” |
| B. Email-domain verification alone | **Reject as sole gate** — weak for private employers; optional signal later |
| C. Manual founder/operator approval without full admin UI | **Recommend** |
| D. Full admin verification UI in Slice 5 | **Defer to Slice 7** (product surface) |
| E. Defer all approval to Slice 7 | **Reject** — would block publish or force weakening the gate |

**Proposed model:**

- Employer (completed) may move `unverified → pending` (request) with type-specific
  attestation fields already on the profile (no document upload).
- Platform operator (allow-listed `auth.uid()`) may `pending → verified` or
  `pending → rejected` via Auth-bound RPC + Server Action.
- Operator (or later Slice 7) may `verified → revoked`.
- Application runtime **does** expose request + operator approve/reject; it does
  **not** expose a service-role browser path.
- Temporary SQL/service-role approval is acceptable **only** as an emergency
  break-glass documented in the runbook, not as the default path.
- Revocation supported; suspension is **distinct** and remains Slice 7.
- No verification expiration in Slice 5.
- Private and organisation share the same state enum; evidence requirements differ
  (D-057).

### 6–8. Verification evidence

| Item | Classification |
|------|----------------|
| Organisation legal name | Required for org (already on profile) |
| Website | Optional |
| Auth account email | Required (identity channel; not a separate field) |
| Business email domain proof | Deferred (optional signal later) |
| Registration / tax number | Deferred |
| Identity document upload | **Prohibited** in Slice 5 |
| Business document upload | **Prohibited** in Slice 5 |
| Phone | Optional (already on profile) |
| Private-employer identity docs | **Prohibited** in Slice 5 |
| Address evidence / exact address | **Prohibited** |
| Lawful-hiring declaration | Required at completion (already) |
| Explicit verification request attestation | Required at request time (boolean + timestamp) |

**Rationale:** Data minimization and GDPR. Prefer no Supabase Storage in Slice 5.
Trust boundary is **manual human review of profile fields + attestation**, not
document vaulting. Document retention/access/deletion for uploads would pull
Slice 7/8 forward.

### 9. Verification state model

Proposed states: `unverified | pending | verified | rejected | revoked`.

| State | Entered by | Draft edit | Publish | Existing published vacancies |
|-------|------------|------------|---------|------------------------------|
| unverified | Default / after reject clear path | Yes if complete | No | N/A (none yet) |
| pending | Employer request | Yes | No | N/A |
| verified | Operator approve | Yes | Yes if ready | Remain if still eligible |
| rejected | Operator reject | Yes | No | N/A |
| revoked | Operator revoke | Yes | No | Forced non-public (D-064) |

Completion (`onboarding_completed_at`) remains independent of verification.
Store: `verification_state`, `verification_requested_at`, `verification_reviewed_at`,
`verification_reviewed_by`, optional short `verification_note` (reason).

Do **not** conflate with account suspension, vacancy moderation, or vacancy
lifecycle.

### 10–11. Publication lifecycle and routes

See transition matrix in `docs/36`. Summary:

- States: `draft`, `published`, `paused`, `filled`, `expired`, `withdrawn`
- Explicit RPCs: `publish`, `pause`, `resume`, `mark_filled`, `withdraw`,
  `expire` (lazy/ops), plus existing draft RPCs
- Routes: employer lifecycle controls on `/employer/vacancies/*`; public
  `/jobs`, `/jobs/[vacancyId]`; candidate `/candidate/matches`,
  `/candidate/jobs/[vacancyId]` (apply)

### 12. Matching integration

Expand visibility beyond seed-only:

- Eligible employer vacancy: `source=employer`, `publication_state=published`,
  time window, owning employer `verification_state=verified`, readiness fields
  present at publish (enforced at publish RPC)
- Drafts / paused / filled / expired / withdrawn never enter new matching
- Seed path unchanged
- Matcher algorithm stays pure TypeScript; loader inputs expand
- `submit_candidate_application` eligibility expands to include employer
  vacancies under the same rules; snapshots remain immutable

### 13. Existing applications

| Transition | Existing apps readable | Snapshots | New applications | Employer applicant UI |
|------------|------------------------|-----------|------------------|----------------------|
| pause | Yes (candidate own) | Unchanged | Blocked | Slice 6 |
| fill | Yes | Unchanged | Blocked | Slice 6 |
| withdraw | Yes | Unchanged | Blocked | Slice 6 |
| expire | Yes | Unchanged | Blocked | Slice 6 |
| verification revoke | Yes | Unchanged | Blocked; vacancy non-public | Slice 6 |

Candidate confirmation continues to use **snapshots**, not live vacancy rows
(D-039 Accepted). Application history dashboard remains deferred.

### 14. Location privacy

| Surface | Allowed |
|---------|---------|
| Public / candidate | `city` (Berlin) + `public_locality` (district/area) |
| Map coordinates | Prohibited |
| Street / house number | Prohibited |
| Postcode | Deferred / not stored |
| Exact private residential address | **Not stored** in Slice 5 |
| Remote / hybrid / on-site | Via existing `workplace_type`; still Berlin-scoped public locality rules |

Organisation and private employers share the same **public** location fields;
private employers must not enter street addresses.

### 15. Expiry

- Mandatory `expires_at` at publish (already required by published CHECK)
- Employer chooses date within min/max window (propose default 30 days, max 90)
- Eligibility uses `expires_at > now()` (seed-compatible)
- Materialize `publication_state=expired` lazily when accessed after expiry
  and/or via owner-controlled ops RPC — **no new always-on scheduler required**
  for MVP
- Republish after expiry: allowed as draft→publish only if verified + ready
  (treat as new publish; new `published_at` / `expires_at`)
- Extension while published: optional explicit RPC later; **defer** unless
  acceptance requires it
- Stale-vacancy admin ops remain Slice 7

### 16. Verification loss

When `verified → revoked` (or reject after verified path):

- Database trigger/RPC batch: all `published` employer vacancies for that owner
  → `paused` (reversible after re-verification) **or** force eligibility false
  even if state lags
- Prefer **both**: transition to `paused` + visibility helper requires verified
- Publish RPC refuses non-verified
- Prefer DB enforcement over UI-only hiding

### 17. Audit / notifications / admin dependency

| Concern | Slice 5 | Slice 7 |
|---------|---------|---------|
| Verification request/approve/reject/revoke | Timestamps + reviewer id + note | Full audit_events + queue UI |
| Publish/pause/resume/fill/withdraw/expire | State + timestamps on vacancy | Richer audit stream |
| Notifications | **Deferred** (all listed emails optional/deferred) | Transactional completeness |
| Suspension / reports / moderation | Out | In |
| Break-glass SQL approve | Documented temporary procedure | Replace with admin UI |

### 18. Preview / hosted proof

Recorded constraint from `docs/33`:

- Preview currently has no Preview-scoped Supabase variables
- Preview must not use Production Supabase
- Slice 5 hosted proof needs new isolated DB + matching Preview env
- Production fallback requires **new** explicit authorization
- No infrastructure provisioning in this planning package

---

## Existing schema audit (summary)

| Object | Reuse | Alter | Gap |
|--------|-------|-------|-----|
| `employer_profiles.verification_state` | Column exists | Expand CHECK; remove force-unverified trigger; add request/review columns | Approval authority |
| `companies` | Org ownership | None for publish | — |
| `vacancies.publication_state` | draft/published/withdrawn | Add paused/filled/expired; drop employer-draft-only chk | Lifecycle RPCs |
| `published_at` / `expires_at` | CHECKs exist | Publish sets both | Employer choose expiry |
| Readiness RPC | Checklist | Add verification gate at publish (not inside draft readiness alone) | Publish RPC |
| `visible_seed_*` | Seed path | New helper or expand for employer published | Matching integration |
| `submit_candidate_application` | Snapshots | Expand vacancy eligibility | Employer jobs |
| Applications RLS | Candidate own | Unchanged in Slice 5 | Employer read = Slice 6 |
| Storage | — | — | Not required if no uploads |

**Migration risks:** Expanding CHECKs; backfilling none expected (all employer rows
draft/unverified); seed rows must remain valid; visibility helper changes are
high-sensitivity.

**Backwards compatibility:** Seed Demo fixtures and Slice 3 apply path must keep
working; employer drafts remain private until publish.

---

## Critical unresolved decisions (owner review required)

These are **Proposed recommendations only**. They are **not** accepted product
facts. Owner acceptance of D-055–D-067 (or explicit amendment) is required
before PR 5.2 or any schema / RPC / RLS / UI implementation begins.

1. **Manual operator allow-list vs deferring all approval until Slice 7** —
   Recommendation: temporary founder/operator allow-list RPCs in Slice 5;
   full admin queue UI remains Slice 7. Alternative: block publish until Slice 7.
2. **Whether `pending`, `rejected`, and `revoked` all belong in Slice 5** —
   Recommendation: yes (full five-state model). Alternative: only
   `unverified`/`verified` with ops notes.
3. **Whether verification revocation automatically pauses published vacancies** —
   Recommendation: yes, in-transaction `published → paused` plus visibility
   helper requiring current `verified` (D-064).
4. **Default 30-day and maximum 90-day expiry** — Recommendation: yes (D-063).
   Values remain Proposed pending owner review.
5. **Lazy expiry materialization vs scheduled infrastructure** —
   Recommendation: lazy materialize `expired` when observed; no hosted
   scheduler assumed in Slice 5.
6. **Anonymous `/jobs` and `/jobs/[vacancyId]`** — Recommendation: yes, narrow
   public read of active published vacancies (D-060). Alternative:
   authenticated-only.
7. **Whether all active seed vacancies remain publicly visible** —
   Recommendation: yes, seed active published rows remain visible on the same
   public/candidate surfaces (Demo labelling unchanged).
8. **Whether employer published vacancies use the unchanged matcher** —
   Recommendation: yes — expand loader inputs only; keep deterministic
   TypeScript matcher and sort (D-062).
9. **Minimum publication readiness fields** — Recommendation: existing Slice 4
   readiness surface + verified + `expires_at` window; no new experience /
   exact-address / document fields (D-059).
10. **Whether source-row timestamps provide sufficient interim audit evidence** —
    Recommendation: yes for Slice 5; full `audit_events` deferred to Slice 7
    (D-065).

Also non-negotiable operationally (still Proposed as D-067 wording): Preview
must be explicitly re-isolated before any Slice 5 hosted proof; Production
requires a **new** explicit authorization.

### Distinctions the proposal must preserve

| Concern | Slice 5 treatment |
|---------|-------------------|
| Employer onboarding completion | Independent (`onboarding_completed_at`) |
| Verification state | Separate enum; gates publish only |
| Account suspension | **Out** — Slice 7 |
| Vacancy lifecycle | Separate `publication_state` transitions |
| Vacancy moderation | **Out** — Slice 7 |

### Operator model (Proposed — temporary until Slice 7)

- Employers request verification; they **cannot** self-declare `verified`
- Approval/reject/revoke: Auth-bound SECURITY DEFINER RPC + Server Action only
- Requires explicit `platform_operators` allow-list
- **Not** a browser-writable column; **not** a service-role client path
- Records verifier identity + timestamps (+ optional note)
- Described as **temporary** ops surface until Slice 7 admin product
- **No** document upload / Supabase Storage in Slice 5 (D-057)

---

## Scope exclusions (preserve)

Unless acceptance expands scope: applicant list/detail; application status
changes; interviews; messaging; scheduling; reports; moderation dashboard;
suspension UI; full admin UI; GDPR export/deletion; saved jobs; CV upload;
exact private address; opaque ranking; Slice 6/7/8 implementation.

---

## Exit of this planning package

Done when:

- `docs/34`–`docs/36` exist
- D-055–D-067 Proposed in `docs/10`
- Active status in `docs/13` / `docs/14` / README reflects Slice 5 discovery/planning
- Owner can accept or amend decisions without implementation having started
