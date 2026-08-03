# Decision Log

This file records product and technical decisions that should not be repeatedly reopened without new evidence.

## D-001 — Brand name

**Decision:** Stint

**Reason:** Short, memorable, international, and compatible with the idea that each period of work is one step in a larger journey.

## D-002 — Core brand emotion

**Decision:** Seen

**Reason:** The company exists to help people be recognised for what they can contribute.

## D-003 — Product expression

**Decision:** One step closer.

**Reason:** It describes meaningful progress across onboarding, applying, interviewing, hiring, and longer-term work journeys.

## D-004 — Initial market

**Decision:** Berlin first.

**Reason:** The problem is concrete, locally understood, and can be validated through direct candidate and employer relationships.

## D-005 — Initial user focus

**Decision:** People legally allowed to work in Germany who have limited German.

**Reason:** Language and application-system barriers create a specific, actionable access problem.

## D-006 — Initial product model

**Decision:** Verified employment-access and recruitment platform.

**Rejected alternatives:** unrestricted scraping platform; Helpling-style general gig marketplace; staffing agency; payroll platform.

**Reason:** Lower legal and operational risk, clearer employer responsibility, and faster MVP validation.

## D-007 — Candidate data sourcing

**Decision:** Candidates register voluntarily. External candidate profiles are never scraped.

## D-008 — Job data priority

**Decision:** Employer submissions, manual curation, and permitted feeds precede controlled aggregation.

**Reason:** Freshness, permission, and trust are more important than volume.

## D-009 — AI presentation

**Decision:** AI remains invisible labour.

**Reason:** Users should interact with useful outcomes such as simplification, translation, and explanation rather than technology labels.

## D-010 — Visual palette

**Decision:** Preserve the restrained oxblood, warm-neutral, clay, and olive system.

**Reason:** It creates a differentiated calm-editorial identity and avoids generic SaaS colouring.

## D-011 — MVP architecture

**Decision:** One Next.js application on Vercel with Supabase for PostgreSQL, authentication, and storage.

**Reason:** Supports public SEO pages, authenticated dashboards, and rapid solo development without premature infrastructure complexity.

## D-012 — Matching

**Decision:** Explainable deterministic matching first.

**Reason:** Initial matching criteria are structured, and candidates should understand why a job appears.

## D-013 — CV requirement

**Decision:** CV is optional by default.

**Reason:** Candidates should receive value and apply based on a reusable profile unless a role genuinely requires a CV.

## D-014 — Development method

**Decision:** Build vertical slices.

**Reason:** Each stage remains deployable and testable, reducing front-end/back-end drift and incomplete feature surfaces.

## D-015 — Scope control

**Decision:** Product documentation and the MVP exclusion list are the source of truth. New scope requires explicit evidence and a recorded decision.

## D-016 — Device strategy

**Decision:** Stint is a responsive web application. Candidate flows are mobile-first. Employer and admin flows are desktop-first, with functional mobile fallback. Native mobile applications are deferred until post-beta evidence.

**Reason:** Candidates primarily use phones; employers and admins primarily work on desktop. One responsive web app covers both without delaying beta for native clients.

## D-017 — Design token baseline

**Decision:** Stint v1 uses a compact two-layer token system consisting of primitive tokens and semantic tokens. The approved baseline defines exact colour, typography, spacing, breakpoint, radius, border, elevation, interaction, motion, layering, and step-motif values. Components and page-level SCSS should consume semantic tokens wherever a semantic equivalent exists. Primitive colour values must not be repeated in component styles.

**Reason:** PR 0.2 must encode the approved visual direction without implementers inventing foundational values. A restrained token baseline preserves visual consistency, accessibility, responsive behaviour, and solo-founder implementation speed while avoiding a premature full component library.

**Constraints:**

- SCSS Modules and CSS custom properties remain required.
- SCSS variables are used for media-query breakpoints because CSS custom properties are not suitable for standard media-query declarations.
- Candidate surfaces remain mobile-first.
- Employer and admin surfaces remain desktop-first with functional narrow-screen fallback.
- The UI uses a system sans-serif stack in Slice 0; no web font is installed.
- Dark mode is not part of the v1 baseline.
- Status must never be communicated by colour alone.
- The token set may be expanded later only in response to an implemented product need.

Exact values live in `docs/06-design-system.md` under **V1 design token baseline**.

## D-018 — Slice 1 PR decomposition

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 1.1

**Context:** Slice 1 needs schema, Auth, onboarding UI, and journey proof without oversized PRs.

**Decision:** Four PRs — (1.1) schema + RLS, (1.2) Auth foundation, (1.3) registration + essential persistence UI, (1.4) resume/gate + E2E. Details: `docs/16-slice-1-build-plan.md`.

**Alternatives:** Three PRs (merge 1.3+1.4); five PRs (split registration from onboarding).

**Consequences:** Schema/RLS reviewable without UI; Auth reviewable without forms; exit proven in 1.4.

**Acceptance note:** Accepted for Slice 1 delivery. PR 1.1 (schema + RLS) complete. Authentication decisions D-021 and D-022 Accepted with PR 1.2 (2026-08-01).

## D-019 — Slice 1 minimum candidate schema

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 1.1

**Context:** Architecture describes shared `profiles` + role tables; Slice 1 only has candidates.

**Decision:** Two tables — `candidate_profiles` (1:1 `auth.users`) and `candidate_languages` (1:N). No shared `profiles`, no `candidate_preferences` misc table, no jobs/employers. See `docs/17-slice-1-schema-proposal.md`.

**Alternatives:** Keep shared `profiles` + `candidate_profiles` now; put languages in arrays on one table.

**Consequences:** Simpler Slice 1; shared `profiles` deferred until employer role (Slice 4) needs it — intentional narrowing, not a silent architecture override.

**Acceptance note:** Accepted as the Slice 1 schema boundary for PR 1.1 migrations. Allow-lists and Auth-related decisions remain separate.

## D-020 — Onboarding completion model

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 1.1

**Context:** Resume and Slice 2 gating need a durable server signal without a workflow engine.

**Decision:** `onboarding_completed_at timestamptz` is the **current** Slice 2 completion gate (null = incomplete). Server-only completion after validating required fields. UI screen count is not authoritative. Invalid essential mutations clear the timestamp in the same database transaction (triggers). Re-completion after a clear sets a new timestamp. Not a historical-immutable “once completed” marker. See `docs/17`.

**Alternatives:** Three-value status enum; compute completion only (no stored marker); historical immutable completion timestamp (rejected — gate must track current essentials).

**Consequences:** Avoids client-writable status; atomic trigger invalidation prevents a stale completed gate after committed invalid edits.

**Acceptance note:** Accepted for the `candidate_profiles` completion column and server-controlled write path in PR 1.1+. PR 1.4: `complete_candidate_onboarding()` (authenticated `SECURITY DEFINER`, profile `FOR UPDATE`) sets the gate; BEFORE/AFTER triggers clear it and sync `work_authorisation_declared_at`. No application reconcile RPC. No service-role browser/SSR client.

## D-021 — Slice 1 authentication method

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 1.2

**Context:** MVP allows email or social authentication.

**Decision:** Email/password via Supabase Auth for Slice 1 exit: registration, email verification, login, logout, SSR sessions (`src/proxy.ts` cookie refresh), protected `/candidate/*`. Password recovery classified **before pilot** (not PR 1.2 acceptance). Social/magic/phone/passkeys/MFA deferred.

**Alternatives:** Add social in Slice 1; require password recovery for exit.

**Consequences:** Smaller Auth surface; recovery should land before Berlin pilot even if after Slice 1 exit.

**Acceptance note:** Accepted with owner confirmation for PR 1.2. Incomplete-candidate recovery uses idempotent `candidate_profiles` creation (D-024).

## D-022 — Hosted Supabase timing for Auth

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 1.2 Preview verification

**Context:** Placeholders cannot exercise real Auth email/redirects.

**Decision:** Local CLI for development and CI; hosted Supabase for Preview/Production Auth. Vercel holds browser-safe URL + publishable key. Site URL `https://stint.company` with redirect allow-list for localhost, production, and Preview wildcard. No service-role in browser or ordinary SSR session paths. No credentials in git.

**Alternatives:** Delay all Auth Preview until later; use only local forever (blocks real Preview Auth).

**Consequences:** Preview/Production Auth demos use the hosted project; local and CI remain on CLI.

**Acceptance note:** Accepted after owner confirmed hosted project, migration apply, Vercel env, Site URL, redirects, and email confirmation.

## D-023 — Slice 1 RLS ownership model

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 1.1

**Context:** Candidate PII must not be readable cross-user.

**Decision:** Owner-only select/insert/update with `USING` + `WITH CHECK` (`auth.uid()`); ownership keys immutable; anon denied; no admin policies; completion timestamp not broadly client-writable. See `docs/17`.

**Alternatives:** Looser select for “public profiles” (rejected for Slice 1).

**Consequences:** Matches least-privilege; tests must prove isolation.

**Acceptance note:** Accepted as the RLS model for PR 1.1 policy migrations and tests.

## D-024 — Candidate row creation strategy

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 1.1

**Context:** Auth user can exist briefly without a candidate row.

**Decision:** Application-controlled idempotent upsert of `candidate_profiles` after signup / first authenticated load. Database triggers on `auth.users` deferred unless later evidence requires them.

**Alternatives:** Trigger-only creation on `auth.users` insert.

**Consequences:** Explicit errors and tests; implementers must handle idempotency; not left unspecified in PR 1.1.

**Acceptance note:** Accepted for Slice 1. PR 1.1 must not add an `auth.users` insert trigger. Application upsert behaviour is implemented with Auth in PR 1.2/1.3; partial Auth-without-row state must be handled explicitly there.

## D-025 — Slice 1 onboarding allow-lists

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 1.3

**Context:** Essential onboarding needs stable constrained values for German comfort, travel time, job categories, employment types, shifts, languages, and proficiency before forms and database checks ship.

**Decision:** Use product-owned allow-lists with stable stored codes and candidate-facing English labels:

- **German comfort:** `none`, `basic`, `conversational`, `comfortable` (self-reported; not CEFR; no `fluent` in v1).
- **Travel time:** integer minutes `15`, `30`, `45`, `60` (maximum one-way travel time; not geographic radius).
- **Job categories:** `cleaning`, `hospitality`, `logistics`, `warehousing`, `food_production`, `moving`, `retail` (no unrestricted other).
- **Employment types:** `full_time`, `part_time`, `mini_job`, `temporary`.
- **Shift preferences:** `morning`, `daytime`, `evening`, `night`, `weekend`, `flexible`.
- **Language proficiency:** `basic`, `conversational`, `proficient`, `native`.
- **Language codes:** BCP-47/ISO-style lowercase set including Berlin-relevant languages plus `other` (no free-text language name in this PR).

Central typed module in application code; database check constraints enforce the same sets. Empty arrays and null scalars remain valid during partial onboarding.

**Alternatives:** Lookup tables; free-text categories; CEFR scale for German comfort.

**Consequences:** PR 1.3 migration + UI share one vocabulary; expansion requires a later decision and migration.

**Acceptance note:** Accepted for PR 1.3 allow-list constraints and essential onboarding persistence.

## D-026 — Slice 2 vacancy ownership without employers

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 2.1

**Context:** Slice 2 needs Berlin vacancies before employer Auth, company self-serve, or Slice 5 verification exist (`docs/13`; discovery T3 in `docs/18-slice-2-discovery.md`).

**Decision:** Introduce minimal `companies` and `vacancies` tables with one constrained ownership vocabulary: `source = seed` for Slice 2. Companies are fictional/demo only. No fake employer Auth users. No verification claim or verified-employer badges. Do not add `is_platform_seed` (redundant with `source`). Schema remains extensible later for real employer ownership via future migrations (additional sources/FKs) — not implemented in Slice 2.

**Alternatives:** Fake employer Auth accounts for seeds; `is_platform_seed` flag; skip `companies` and orphan vacancies; wait for Slice 4–5 before any matches.

**Consequences:** RLS and matching treat seed companies/vacancies as curated demo fixtures; employer product surfaces remain Slice 4+. See `docs/20-slice-2-schema-and-matching-proposal.md`.

**Acceptance note:** Accepted after architecture review. PR 2.1 must not create employer Auth users or verification columns for seeds.

## D-027 — Experience omitted from Slice 2 matching

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 2.2

**Context:** `docs/04`, `docs/07`, and `docs/13` list experience in Matching v1 / Slice 2 includes, but Slice 1 deferred candidate experience collection (`docs/17`). Discovery T1.

**Decision:** Slice 2 intentionally narrows Matching v1: **no** experience fields on vacancies or candidates; **no** experience eligibility; **no** experience ordering; **no** experience explanation; **no** display-only pseudo-requirement. Experience matching remains later MVP intent after experience is collected.

**Alternatives:** Collect experience in Slice 2 before matches; invent default experience; display-only experience text that is not a filter.

**Consequences:** Implementers must not invent experience inputs or copy; revisit when experience onboarding lands.

**Acceptance note:** Accepted. Narrows `docs/13` Slice 2 includes for this slice only.

## D-028 — Slice 2 matching engine shape

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 2.2

**Context:** D-012 requires explainable deterministic matching. Architecture mentions weighted ranking; exit criteria forbid opaque scores (discovery T5).

**Decision:** Matching runs as pure TypeScript functions in `src/lib/matching/` that **do not fetch**. An authenticated server loader performs reads under RLS. Identity comes from the verified session only (`auth.uid()`); no candidate UUID from the browser. Incomplete candidates are rejected **before** vacancy loading. No persisted matches table. No numeric scores. Explanations are produced by the same rules as eligibility. No temporary diagnostic or public match endpoint. Deterministic ordering: (1) `published_at DESC`, (2) `title ASC`, (3) `id ASC`.

**Alternatives:** SQL-only matcher; weighted score with UI percentage; materialised `matches` table; temporary diagnostic endpoint.

**Consequences:** Unit-testable rules without DB; loader owns authz-sensitive reads; ranking sophistication deferred.

**Acceptance note:** Accepted. PR 2.2 must not ship diagnostic/public match endpoints.

## D-029 — Vacancy German and language requirements

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 2.1

**Context:** Candidates have `german_comfort` and `candidate_languages` (D-025). Vacancies need aligned deterministic German/language filters.

**Decision:** Use the same German vocabulary for candidate comfort and vacancy requirement: `none`, `basic`, `conversational`, `comfortable`. Canonical ordinal ranks: `none`=0, `basic`=1, `conversational`=2, `comfortable`=3. Eligibility: `rank(candidate) >= rank(requirement)`. Additional languages use normalized `vacancy_language_requirements` (D-025 codes + proficiency); zero rows allowed; when rows exist all are mandatory and must be satisfied; `other` matches only `other`; no preferred-language scoring. No `english_ok` column. No CEFR.

**Alternatives:** `none_required` vacancy code; CEFR; `english_ok` flag; Fluent German before allow-list expansion.

**Consequences:** PR 2.1 CHECKs + matcher share one vocabulary; expansion needs a later decision + migration.

**Acceptance note:** Accepted. Removes earlier draft `none_required` / `english_ok` proposal.

## D-030 — Slice 2 location and travel rule

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 2.2

**Context:** Candidates store Berlin + travel minutes without coordinates. Matching docs say “location or travel radius.” No GIS stack (discovery T2).

**Decision:** Hard location filter is Berlin-only: candidate `city = Berlin` and vacancy `city = Berlin`. Travel minutes are unused for eligibility, unused for ordering, not returned as a reason, and not displayed as a match claim. No “within your travel preference” wording. Factual Berlin location may be displayed. No lat/lng, PostGIS, or district polygons.

**Alternatives:** Require coordinates; approximate districts; soft-rank by travel minutes; travel-fit copy on cards.

**Consequences:** Intentional narrowing of travel-radius matching until geography exists; seeds CHECK city Berlin.

**Acceptance note:** Accepted.

## D-031 — Seed and demo fixture environments

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 2.1

**Context:** Slice 2 needs matchable demo vacancies without treating schema migrations as a Production business-data pipeline, and without a Slice 5 employer publish workflow.

**Decision:** Replace automatic published Production seeding. Environment contract:

- **Local:** deterministic fictional fixtures through local seed tooling.
- **CI:** deterministic fixtures during reset/test setup.
- **Preview:** optional explicit owner-applied demo fixture set.
- **Production:** no automatic business-data insertion through schema migrations; explicit owner-controlled demo-data operation only.

Matchable demo rows use `publication_state = published`, non-null `published_at`, `source = seed`, and `expires_at`. Production/Preview demo records must be fictional, visibly labelled **Demo vacancy**, expiring/removable, with no real company names and no verified-employer claim. Lifecycle includes `withdrawn` for removal without delete when needed.

**Alternatives:** Insert Production demo inventory in schema migrations; match drafts; perpetual non-expiring fake jobs.

**Consequences:** PR 2.1 ships schema/RLS + local/CI fixtures only; PR 2.4 documents hosted owner-controlled fixture procedure.

**Acceptance note:** Accepted. Supersedes the earlier “seeds inserted published via migration for all environments” draft.

## D-032 — Slice 2 matches UI depth

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 2.3

**Context:** `docs/05` describes rich job discovery; Slice 3 owns detail, apply, and save (discovery T4).

**Decision:** Slice 2 owns only `/candidate/matches`. Cards may show enough structured information and match reasons (≤4 prioritized codes) to understand fit. No detail route. No apply. No save. No employer contact action. No disabled future-action button. Empty state when none match. Full job detail, save/unsave, and apply remain Slice 3.

**Alternatives:** Optional read-only detail route; full apply in Slice 2; public anonymous SEO job board in Slice 2.

**Consequences:** Protects Slice 3 boundary; exit focuses on explainable seeded matches on one route.

**Acceptance note:** Accepted. Removes optional detail-route escape hatch from the draft proposal.

## D-033 — Vacancy read RLS for Slice 2

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 2.1

**Context:** Candidate documents and PII stay private (D-023). Seed vacancies must not become an anonymous public board in Slice 2.

**Decision:** `anon` has no privileges on `companies`, `vacancies`, or `vacancy_language_requirements`. Authenticated candidates receive **SELECT only**, and only when: verified session; own `candidate_profiles` row exists; `onboarding_completed_at IS NOT NULL`; company `source = seed`; vacancy `source = seed`; vacancy `publication_state = published`; `published_at <= now()`; `expires_at > now()`; language rows belong to a vacancy visible under those rules. Identity from `auth.uid()` only — no candidate UUID parameter. `service_role` may exist for owner-controlled seed/admin ops; never used in browser or ordinary SSR candidate clients.

**Alternatives:** Public anon read; any authenticated (including incomplete) read; SELECT without expiry/`published_at` checks.

**Consequences:** Matches gate aligns RLS with product gate and lifecycle; incomplete users resume onboarding without vacancy inventory access.

**Acceptance note:** Accepted. PR 2.1 policies must encode expiry and publish-time visibility.

## D-034 — Private and organisation employers

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** Slice 4 employer registration / Slice 5 verification design

**Context:** Early product docs assumed company-style employers. Initial Berlin hiring also includes private households, residents, landlords, property managers, shops, and retail-store operators — especially for legitimate household and premises-support work such as cleaning. Treating every employer as a registered company with a public website would exclude important legitimate hiring.

**Decision:** Stint supports both **private employers** and **organisation employers**. Every employer has an employer profile; a company profile applies only to organisation employers. Employer verification is type-specific. Private households do not need a legal company name, commercial website, or company registration merely to create an employer account. Exact private residential addresses are sensitive and must not be publicly exposed; job cards may show a privacy-safe approximate area, with precise location disclosed only at an appropriate, consented stage. All jobs must remain legitimate and subject to trust, moderation, reporting, suspension, and vacancy expiry. Stint does not support undeclared work, cash-in-hand arrangements, or freelancer marketplace operations.

This decision does **not** add employer implementation, schema, Auth, verification UI, or private-address storage to Slice 2. Detailed employer schema and workflows belong to later employer slices (Slice 4+). Slice 2 Demo fixtures may remain fictional organisation-style seed records without real private residential addresses.

**Alternatives:** Company-only employer model; require website/registration for all employers; public full residential addresses on job cards; treat private hiring as out of scope.

**Consequences:** Product docs (`docs/03`–`docs/05`, `docs/12`) distinguish private vs organisation employers; later employer slices must design type-specific verification and location privacy; Slice 2 matching/fixtures remain unchanged.

**Acceptance note:** Accepted as a product-domain clarification during Slice 2 PR 2.4 documentation correction.

## D-035 — Slice 3 boundary

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 3.1

**Context:** `docs/13` Slice 3 and `docs/04`/`docs/05` describe a broad apply surface (salary, distance, verification, save/unsave, CV, timeline, applications dashboard). Current schema and the owner Slice 3 objective support a smaller vertical: detail → preview → submit → confirm → duplicate prevention. D-032 previously parked save/unsave in Slice 3.

**Decision:** Slice 3 delivers authenticated candidate job detail for RLS-visible seed vacancies, profile-based application preview, atomic submission, reload-safe confirmation, and Applied-state feedback on matches/detail. Journey: matched vacancy → candidate job detail → application preview → explicit submission → persistent confirmation → Applied state. It ends at successful candidate submission. Deferred from this slice: save/unsave; application history; withdrawal; resubmission; employer review; employer status changes; interviews; messaging; CV upload/Storage; salary; experience requirements; precise private addresses; distance/verification/interview-language fields. Broader MVP items remain later intent. This supersedes **only** the save/unsave placement in D-032; it does not reinterpret the rest of D-032.

**Alternatives:** Implement full `docs/13` Slice 3 includes list; include save/unsave now; include CV optional upload now.

**Consequences:** Planning docs `docs/22`–`docs/24` and implementation PRs 3.1–3.5 follow this narrowing. PR 3.1 is the next implementation unit; implementation has not started in this acceptance update.

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #31 discovery review.

## D-036 — Slice 3 job-detail route and authorization

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 3.2

**Context:** Architecture lists public `/jobs/[slug]`. D-033 keeps seed vacancies off the anonymous public board. Matches already use vacancy UUIDs.

**Decision:** Accepted candidate routes are `/candidate/jobs/[vacancyId]` (job detail) and `/candidate/applications/[applicationId]` (confirmation). Both are authenticated candidate routes. Access requires authenticated session and completed onboarding (same gate family as `/candidate/matches`). Unauthenticated users are redirected to login. Incomplete candidates are redirected to onboarding. No public job-detail route and no public vacancy HTML in Slice 3. No protected vacancy or application content appears in unauthorized HTML. A completed candidate may access only inventory visible through existing RLS and Slice 3 loaders (any RLS-visible active seed vacancy by id for detail). Demo vacancy labelling remains required.

**Alternatives:** Public `/jobs/[slug]`; slug-based candidate route; detail only when currently matching.

**Consequences:** Detail and confirmation loaders are server-only and RLS-backed; public SEO board remains a later decision.

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #31 discovery review.

## D-037 — Slice 3 detail content and missing fields

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 3.2

**Context:** Feature docs require salary, responsibilities, CV flags, interview language, verification, and richer location. Vacancy schema has title, summary, Berlin, category, employment, shifts, German, language requirements, available_from, published_at, expires_at, company name.

**Decision:** Slice 3 detail shows only current schema-backed fields plus derived match reasons and the existing work-authorisation notice: title; employer display name; Demo/source label; privacy-safe city/location; category; employment type; shift requirements; German requirement; additional language requirements; available-from date; match reasons; work-authorisation declaration notice; useful lifecycle/freshness dates (`published_at` / `expires_at`). Deferred because absent or outside the boundary: salary; exact address; responsibilities; experience; employer verification display; interview language; CV requirement; save/unsave. Do not invent empty UI for deferred fields. No vacancy schema expansion for those fields in Slice 3 unless a separate Accepted decision says otherwise.

**Alternatives:** Block Slice 3 until salary/location columns exist; show “not provided” placeholders for missing MVP fields.

**Consequences:** Credible Demo detail uses current seeds; MVP richness waits for employer vacancy schema (Slice 4+).

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #31 discovery review.

## D-038 — Application schema and snapshot strategy

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 3.1

**Context:** No `applications` table exists. Candidates and vacancies may change after submit. Future employer review needs stable evidence without copying unnecessary PII.

**Decision:** Add `applications` with `id`, `candidate_id` → `candidate_profiles`, `vacancy_id` → `vacancies`, `status`, `submitted_at`, `snapshot_version integer not null`, `candidate_snapshot` jsonb not null, `vacancy_snapshot` jsonb not null, timestamps, and `UNIQUE (candidate_id, vacancy_id)`. Persist both live FKs and immutable submission snapshots (strategy C). Initial `snapshot_version = 1`. Snapshots are generated inside the Auth-bound RPC from trusted database rows only — never caller-supplied; immutable after insert; versioned permanently; used for historical confirmation; coexist with live FKs. Snapshot field lists are fixed in `docs/24` (candidate v1: display name, matched job category, German comfort, vacancy-relevant languages, work-authorisation declaration, availability, employment preferences, shift preferences; vacancy v1: vacancy ID, title, employer display name, source, Demo label, privacy-safe city, category, employment types, shifts, German requirement, language requirements, available-from). Excluded: email, phone, CV, exact address, Auth metadata, unrelated onboarding answers, unsupported future fields. Any snapshot version after 1 requires a later Accepted decision. Vacancy delete is restricted; candidate delete cascades. No candidate UPDATE policy on applications in Slice 3.

**Alternatives:** References only; snapshots only; denormalize email into applications now; caller-supplied snapshot JSON.

**Consequences:** PR 3.1 migration + types; confirmation renders historical values from snapshots after profile or vacancy edits.

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #31 discovery review.

## D-039 — Application status vocabulary

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 3.1

**Context:** `docs/05` defines a full status machine. Slice 3 only creates submissions. Pre-authorizing unsupported workflow states in the database invites premature UI and policy assumptions.

**Decision:** Database `status` is constrained, not free-form. Slice 3 constrains and creates only `submitted` (`CHECK (status = 'submitted')` or equivalent). No withdrawal action exists in Slice 3. Do not pre-authorize viewed, shortlisted, interview invited, interview scheduled, offer, hired, not selected, or withdrawn. Future status values require a later Accepted decision, defined transition ownership, authorization rules, and an additive migration.

**Alternatives:** Pre-seed the full `docs/05` status CHECK now; implement withdrawal in Slice 3.

**Consequences:** Slice 3 UI and RPC never pretend employer progress or withdrawal exists; later slices own additive status migrations.

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #31 discovery review.

## D-040 — Duplicate prevention and idempotency

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 3.1

**Context:** Exit criterion requires exactly one application per vacancy per candidate. UI-only guards are insufficient under concurrency and retries.

**Decision:** Enforce `UNIQUE (candidate_id, vacancy_id)` for all time in Slice 3 — one application per candidate and vacancy permanently under this slice. Concurrent duplicate attempts are resolved by the database constraint and cannot create a second row. Duplicate or retry returns deterministic idempotent `already_applied` plus the existing application id; the UI routes to that confirmation. No withdrawal action and no resubmission-after-withdrawal behavior exist. Future withdrawal/resubmission requires a later Accepted decision and migration.

**Alternatives:** Partial unique excluding withdrawn from day one; allow multiple historical rows.

**Consequences:** RPC/Server Action treat duplicate as safe idempotent outcome, not a hard crash.

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #31 discovery review.

## D-041 — Submit-time match and completion rules

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 3.3

**Context:** Detail may be opened for any RLS-visible vacancy; preferences and lifecycle can change while a tab is open. Matching lives in TypeScript; security/lifecycle must live in the database.

**Decision:** The existing TypeScript matcher is the product-level matching source of truth. The Server Action resolves the authenticated session, loads the completed candidate profile, loads the RLS-visible vacancy, runs the TypeScript matcher, rejects `not_matching`, and calls the RPC with vacancy ID only. The RPC/database is authoritative for authenticated identity, candidate ownership, onboarding completion, vacancy visibility, lifecycle validity, allowed inventory/source restrictions, duplicate prevention, snapshot construction, and atomic insert or existing-application result. The full matcher is not duplicated in SQL. The RPC does not claim to execute TypeScript matching. Stale state must fail safely: incomplete → `incomplete`; unavailable vacancy → `unavailable`; matcher failure → `not_matching`; existing row or concurrent retry → `already_applied`. No denied state may create a new row. Any future move to database-authoritative matching requires a separate decision and parity tests.

**Alternatives:** Allow apply to any visible vacancy without match re-check; freeze match at detail-open time only; reimplement matcher in SQL now.

**Consequences:** Explainability stays aligned with eligibility; RPC never claims to reuse the TypeScript matcher.

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #31 discovery review.

## D-042 — Application insertion mechanism and candidate RLS

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 3.1

**Context:** Completion already uses an Auth-bound RPC. Application insert needs multiple atomic checks and server-built snapshots.

**Decision:** Accepted flow is Server Action → Auth-bound RPC. Authenticated clients call `submit_candidate_application(p_vacancy_id uuid)` (`SECURITY DEFINER`, locked `search_path`). The caller supplies only vacancy ID and must not supply candidate ID, snapshot JSON, status, submitted timestamp, or application ID. The RPC derives identity from `auth.uid()`, verifies ownership/completion and vacancy lifecycle/visibility/source rules, builds versioned snapshots from trusted rows, inserts `status = 'submitted'`, and returns `already_applied` on unique conflict. Candidates receive SELECT on own applications only. Authenticated clients have no direct application INSERT, UPDATE, or DELETE. No employer/admin read policies in Slice 3. No browser or SSR service-role access. Incomplete and unauthorized candidates cannot submit.

**Alternatives:** Direct RLS INSERT; Server Action-only without RPC; caller-supplied snapshots.

**Consequences:** pgTAP must prove privilege boundaries; Server Action remains the match gate; RPC remains the integrity gate.

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #31 discovery review.

## D-043 — Application preview and confirmation UX

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 3.3

**Context:** Features require preview before submit and confirmation after. Email/phone/CV are not collected for apply yet.

**Decision:** Preview is a detail-route section/step showing only submission-relevant data currently collected and approved for snapshots: vacancy title; employer display name; candidate display name; German comfort; relevant languages; work-authorisation declaration; availability; employment preferences; shift preferences; matched category; and a disclosure that submitted profile information will be available to a future employer workflow. Explicit Submit button and clear disclosure are sufficient — no additional checkbox is required. Confirmation at `/candidate/applications/[applicationId]` is reload-safe, reads historical values from immutable snapshots, uses factual copy, and does not promise an employer response or response time. No email, phone, CV, exact address, or unrelated profile data is shown as submission data or copied into the application.

**Alternatives:** Modal-only preview; require an extra checkbox; confirmation as toast only.

**Consequences:** Editing returns to onboarding group URLs; re-completion may be required after invalidation.

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #31 discovery review.

## D-044 — Applied state and application history boundary

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 3.4

**Context:** Architecture lists `/candidate/applications` as a dashboard. Owner objective needs confirmation and duplicate-safe revisit, not a full history product.

**Decision:** Slice 3 includes persistent confirmation, Applied state on matches, Applied state on job detail, and duplicate submission routing to the existing confirmation. Slice 3 does not include an application index, application timeline, employer status updates, withdrawal, resubmission, interview tracking, or messaging.

**Alternatives:** Ship `/candidate/applications` index in Slice 3; omit Applied badges.

**Consequences:** Matches loader may fetch own application vacancy ids; timeline remains later-slice work.

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #31 discovery review.

## D-045 — Slice 3 hosted proof strategy

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 3.5 / Slice 3 Done

**Context:** Production Demo fixtures exist until 2026-09-02. Applications introduce persistent candidate-linked rows and snapshots. D-031 forbids automatic Production business-data insertion via migrations.

**Decision:** Local CI proves schema/RLS/journey before hosted proof. Preview is preferred for Slice 3 hosted proof and iterative application-record testing. Production may be used only after explicit owner authorization, against current Demo fixtures while active, with credentials only via temporary `SUPABASE_DB_URL`, unset after use, and no secrets in evidence. Before Slice 3 can be marked Done, hosted proof must verify detail, preview, submission, confirmation, reload, Applied state, duplicate handling, unauthenticated denial, incomplete-candidate denial, lifecycle rejection, and no unauthorized data exposure. Application test records and test candidates require a documented retention or safe cleanup decision before hosted closure. Owner-run application cleanup (non-migration, scoped) should be available. No automatic Production application seeding.

**Alternatives:** Production-only proof; Preview-only closure; retain Production applications indefinitely without cleanup tooling.

**Consequences:** Closure docs record environment, project ref, fixture IDs used, application retention/cleanup outcome — never connection strings or tokens.

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #31 discovery review.
