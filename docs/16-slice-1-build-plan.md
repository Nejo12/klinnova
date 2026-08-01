# Slice 1 Build Plan

> Planning artifact only. No application code, migrations, or auth implementation lands here.
> **Status:** PR 1.1–1.2 merged; PR 1.3 essential onboarding in progress.
> D-018–D-025 Accepted (2026-08-01). PR 1.4 implements the controlled completion / resume gate.

**Outcome:** A candidate can register and persist the minimum essential onboarding information required to continue toward matching (`docs/13-implementation-plan.md`).

**Schema proposal:** `docs/17-slice-1-schema-proposal.md`
**Tracking:** `docs/14-founder-dashboard.md`

---

## Source of truth

| Doc | Role |
|-----|------|
| `docs/04-mvp.md` | Essential onboarding data sequence; auth “email or social”; exclusions |
| `docs/05-features.md` | Onboarding UX (one decision per screen, auto-save, resume, step motif) |
| `docs/07-architecture.md` | Stack, RLS direction; shared-profiles direction (narrowed for Slice 1 — see schema) |
| `docs/08-non-functional.md` | Privacy, security, a11y |
| `docs/12-terminology.md` | Work-authorisation declaration; candidate |
| `docs/13-implementation-plan.md` | Exit criteria |
| `docs/17-slice-1-schema-proposal.md` | Tables, RLS, completion model |
| `docs/10-decisions.md` | D-018–D-025 Accepted |
| `NOT_NOW.md` | Do not implement |

### Document tensions (not silently invented)

| Tension | Proposed resolution for Slice 1 |
|---------|----------------------------------|
| MVP “email **or** social” | Email/password only; social deferred (D-021) |
| Architecture shared `profiles` + role tables | Slice 1 uses `candidate_profiles` keyed to `auth.users` only (D-019); shared `profiles` when employer role lands |
| “Verification gates from Slice 0/1” | Candidate ownership only; employer/vacancy gates in Slices 4–5 |
| MVP “six-step” sequence | **Data groups** from MVP; UI may use six screens provisionally; schema/APIs are **not** named by step number |

---

## What Slice 1 is not

- Complete candidate profile or progressive fields (phone, CV, experience, introduction)
- Matching, vacancy feed, applications, employer discoverability
- Admin review, jobs, companies
- Social login, magic links, phone auth, passkeys, MFA
- Production-scale account tooling beyond register/verify/login/logout/session/resume
- Sentry, PostHog, MSW (unless a concrete test needs MSW later)

---

## Exit criteria

1. Candidate registers with email/password and obtains a session (with email-verification behaviour defined below).
2. Candidate persists all **required essential fields** (schema proposal traceability table).
3. Progress resumes after reload or re-login without data loss.
4. No CV or phone required.
5. Fields needed as Slice 2 matching inputs are stored (languages, German comfort, work-authorisation declaration, Berlin + travel minutes, categories, available-from, employment types, shifts).
6. Cross-user reads/writes denied (RLS + server checks).
7. CI green; Preview/Production remain deployable.

---

## Data requirements vs UI grouping

MVP lists an essential **sequence** of six information groups. That is a product sequence, not a database schema.

| Layer | Rule |
|-------|------|
| Data | Required fields in `docs/17`; `onboarding_completed_at` is the current Slice 2 gate (cleared atomically when essentials become invalid) |
| UI | Provisional grouping may follow the six MVP bullets (one decision per screen, step motif) |
| Schema / API | No `step_1` columns, no status tied to screen count; regrouping screens must not need a migration |

---

## Proposed PR sequence (four)

```text
PR 1.1 Schema + RLS
  -> PR 1.2 Authentication foundation
    -> PR 1.3 Registration + essential persistence UI
      -> PR 1.4 Resume, completion gate, critical journey
```

**Why four (kept after review):**

| PR | Single review concern | Deployable alone? |
|----|----------------------|-------------------|
| 1.1 | Data model + RLS | Yes — shell unchanged; validate with local Auth users + SQL/RLS tests, **no app UI** |
| 1.2 | Session security + Auth routes | Yes — register/login without onboarding forms |
| 1.3 | Onboarding product UX + writes | Yes — complete essentials; completion screen (no fake matches) |
| 1.4 | Resume/gate proof + E2E | Yes — closes Slice 1 exit criteria |

Schema before Auth remains justified: RLS is tested against Supabase Auth users without shipping application authentication. Not split only to hit “four.”

---

## Authentication scope

| Capability | Classification | Notes |
|------------|----------------|-------|
| Email + password registration | **Required for Slice 1 exit** | Accepted method (D-021) |
| Email verification | **Required for Slice 1 exit** | Supabase confirmation; see behaviour below |
| Login / logout | **Required for Slice 1 exit** | |
| SSR session cookies + refresh | **Required for Slice 1 exit** | Official `@supabase/ssr` + middleware/proxy as required by current Next.js guidance |
| Protected `/candidate/*` | **Required for Slice 1 exit** | Anonymous redirected |
| Onboarding resume when session restores | **Required for Slice 1 exit** | |
| Password recovery | **Required before pilot** — not Slice 1 exit | May ship in 1.2 if cheap; must not block exit if register/login/verify/resume work |
| Social / magic / phone / passkeys / MFA | **Deferred** | |

### Behaviour (D-021 / D-022 Accepted)

- **Duplicate email:** Auth uniqueness; avoid account enumeration in copy where practical.
- **Unverified users:** May authenticate per project config; must **not** set `onboarding_completed_at` until email is verified (if confirmation is enabled).
- **Redirects:** After auth, incomplete → next missing field group UI; complete → Slice 1 completion screen (matches are Slice 2).
- **Session expiry:** Supabase defaults; document refresh path in PR 1.2.
- **Row creation:** Idempotent app upsert of `candidate_profiles` after signup (D-024) — not silent.

---

## Onboarding completion (summary)

See `docs/17` for full model. `onboarding_completed_at` null/non-null current gate; server-only completion RPC; trigger invalidation in the same transaction as essential edits; UI steps non-authoritative.

---

## PR 1.1 — Schema and RLS

**Intent:** Land approved tables/policies; no product Auth UI.

**Status:** Complete (merged).

**Includes:** Migrations for `docs/17`; RLS; column privileges for server-owned timestamps; constraint/RLS pgTAP tests; CI Schema and RLS job; generated `src/types/database.ts`.

---

## PR 1.2 — Authentication foundation

**Intent:** Email/password session path without onboarding field forms.

**Status:** In progress.

**Includes:** Register (display name + email/password), email confirmation callback, login, logout, `src/proxy.ts` cookie refresh + `/candidate/*` protection, idempotent `candidate_profiles` creation (D-024), minimal authenticated candidate landing, tests/docs. D-021/D-022 Accepted in this PR.

**Excludes:** Essential-field onboarding forms (PR 1.3); social providers; password recovery UI (before-pilot); employer signup; service-role session paths.

**Password recovery:** Deferred to before-pilot (not PR 1.2 acceptance).

**Depends on:** PR 1.1; D-021/D-022 Accepted; hosted Auth configured by owner.

**Acceptance:** Register → verify → login → logout; session survives refresh; protected routes reject anon; no browser service-role; CI green.

**Session refresh:** Proxy calls `getClaims()` after creating the SSR client so cookies stay fresh; protected server pages use `getUser()`.

---

## PR 1.3 — Registration entry and essential persistence

**Intent:** Persist all required essentials with durable auto-save.

**Includes:** Candidate registration entry; provisional multi-screen UI over MVP data groups; Zod + server mutations; progress from **server field state**; completion screen without match feed.

**Excludes:** Matching, jobs, CV/phone, employer flows.

**Depends on:** PR 1.2; D-025 allow-lists Accepted.

**Acceptance:** All required essentials persist without CV/phone; back navigation and reload keep values; provisional review when essentials appear valid (**not** authoritative completion); persists `work_authorisation_declared` boolean; **does not** write `onboarding_completed_at` or `work_authorisation_declared_at` (PR 1.4); accessible forms.

---

## PR 1.4 — Resume, gate, critical journey

**Intent:** Prove resume and Slice 1 exit with E2E.

**Includes:** Controlled completion RPC with profile-row lock; atomic trigger invalidation; resume routing; incomplete ≠ Slice-2-ready; Playwright Auth → onboarding → confirm → invalidate journey; concurrency lock proof; docs/dashboard update only when criteria truly met.

**Excludes:** Seed vacancies, match algorithm.

**Depends on:** PR 1.3.

**Acceptance:** Exit criteria met; local journey green via CI Schema job (`pnpm test:e2e:onboarding` + Mailpit); shell smoke still passes; no matching UI.

---

## Testing layers

| Layer | PR | Focus |
|-------|-----|--------|
| Schema / RLS | 1.1 | Constraints; two-user isolation; anon deny |
| Unit | 1.2–1.4 | Validation; completion rules |
| Component | 1.3 | Forms, progress, errors, a11y |
| Integration | 1.2–1.4 | Session + DB writes |
| Playwright | 1.4 | Register → verify → persist → reload → resume/complete |

---

## Environment and owner actions

| Stage | Supabase | Public env | Email |
|-------|----------|------------|-------|
| Local | CLI | From `supabase status` | Inbucket/Mailpit |
| Unit/CI build | None / mocks | Scaffold placeholders | N/A |
| Preview Auth demo | **Hosted** (owner) | Vercel → hosted URL + publishable key | Confirmation policy + redirects |
| Production | Hosted | Vercel → hosted | Configured delivery |

**Repository-owner actions (no credentials in git):**

1. Create/select hosted Supabase project.
2. Set Vercel Preview/Production `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Configure Auth site URL and redirect allow-list.
4. Decide email-confirmation behaviour for Preview vs Production.
5. Configure Production email delivery when leaving default limits.
6. Decide CI strategy for confirmation (test project vs local-only e2e).

No service-role key in Vercel for the candidate browser/auth flow unless a later approved server operation requires it.

**Timing:** Required before PR 1.2 Preview verification of real Auth (local 1.2 can use CLI). Placeholders remain OK for shell-only builds.

---

## Decision gates

| Before | Decisions |
|--------|-----------|
| PR 1.1 | D-018, D-019, D-020, D-023, D-024 — **Accepted** (2026-08-01); follow `docs/17` |
| PR 1.2 | D-021, D-022 — **Accepted** (2026-08-01) |
| PR 1.3 | D-025 allow-lists — **Accepted** (2026-08-01) |
| PR 1.4 | Controlled completion write + resume/gate E2E |

---

## Privacy

Data minimisation to essentials; work-authorisation wording Pending legal/product review; no discoverability consent until employers can see candidates; retention Pending; deletion Slice 8. Not legal advice.

---

## Slice 1 close checklist

- [ ] PRs 1.1–1.4 merged
- [ ] Exit criteria on Auth-capable environment (local CI + Preview smoke by owner)
- [ ] RLS + critical journey green
- [ ] No Slice 2 matching or `NOT_NOW.md` items shipped
- [ ] Dashboard: Slice 1 Done → Slice 2 planning

Update the checklist and founder dashboard to Done only after PR 1.4 merge and exit proof — not while this PR is open.
