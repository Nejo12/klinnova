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

## D-046 — Slice 4 boundary

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 4.1

**Context:** `docs/13` Slice 4 covers employer registration through structured draft vacancy. MVP also lists verification, publish, and rich vacancy fields. Slice 5 owns verification and publication; Slice 6 owns applicant review.

**Decision:** Slice 4 delivers employer registration; private or organisation employer profile; company profile only for organisation employers; employer-owned private structured draft vacancies; safe resume/edit; private draft lifecycle; and a draft publish-readiness checklist (no publish mutation).

Slice 4 does **not** include: verification approval or evidence upload; publication; public employer pages; applicant review; application status changes; messaging; interview scheduling; admin moderation; exact-address collection; teams and memberships; multiple organisations; or Slice 5 / Slice 6 functionality.

**Alternatives:** Include publish in Slice 4; require verification before drafting; company-only employers.

**Consequences:** Planning docs `docs/28`–`docs/30` and PRs 4.1–4.5 follow this boundary. Next implementation unit after this acceptance merges is PR 4.1 only.

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #39 discovery review, with refinements recorded in D-047–D-054.

## D-047 — Employer account capability model

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 4.1

**Context:** No shared `profiles` or application role exists (D-019). Login/register currently assume candidate intent via `ensureCandidateProfile`.

**Decision:** Add `employer_profiles` 1:1 with `auth.users` as an **additive** capability. Do **not** introduce exclusive `profiles.role` in Slice 4. One Auth user may hold both candidate and employer profiles. Candidate completion and employer completion remain independent. No organisation-membership graph and no separate Auth account per capability in Slice 4. Existing candidates may later create an employer profile. Employer routes must not silently create candidate profiles.

**Multi-capability routing:** Validated internal `next` always takes precedence. Employer registration returns to employer onboarding; candidate registration returns to candidate onboarding. `/candidate/*` and `/employer/*` remain explicit spaces. Dual-capability users receive visible navigation between both spaces. Generic login entered from a capability-specific route returns to that space. When no route intent exists and both capabilities are available, show a simple role-choice surface. Do **not** add a hidden or caller-writable default-role field in Slice 4. Do **not** silently guess between candidate and employer.

Employer-type changeability is governed by D-048 (not immutable on first insert).

**Alternatives:** Exclusive role column; organisation membership graph now; force separate Auth users per role; hidden default-role field.

**Consequences:** Candidate Auth path remains; employer entry points and proxy `/employer/*` protection are required; post-login landing must honour intent and role choice.

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #39 discovery review, including explicit intent-based multi-capability routing.

## D-048 — Private/organisation profiles and company ownership

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 4.1

**Context:** D-034 Accepted. Current `companies` are seed-only with no Auth owner. Vacancies require `company_id`.

**Decision:** `employer_profiles.id = auth.users.id`. Employer type is `private` or `organisation`. Private employers create no company row. Organisation employers own exactly one company in Slice 4 (`source=employer`, `owner_employer_id`). Retained Demo companies use `source=seed` and no owner. Vacancies are owned authoritatively by `employer_profile_id` when `source=employer`; organisation vacancies also reference the owner’s company; private vacancies have no `company_id`. Team membership and multiple companies are deferred.

**Employer-type locking:** Employer type may change while employer onboarding is incomplete **and** no employer-created company exists **and** no employer-created draft vacancy exists. Employer onboarding completion locks employer type. The server/database must reject type changes after completion. Conversion after completion is deferred; no private↔organisation conversion workflow is implemented in Slice 4. An Auth-bound RPC may enforce type selection/change with atomic consistency when needed. Do **not** describe employer type as immutable immediately on first insert.

**Alternatives:** Fake company for every private employer; company-only vacancy ownership; multi-company MVP; immutable type on first insert.

**Consequences:** Migrate `companies.source` and vacancy ownership FKs carefully; preserve Demo seeds; type-change invariants belong in PR 4.1 schema/RLS/RPC tests.

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #39 discovery review, with the incomplete-onboarding type-locking refinement.

## D-049 — Employer onboarding completion

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 4.1 / 4.2

**Context:** Candidate completion uses `onboarding_completed_at` + Auth-bound RPC (D-020).

**Decision:** Employer completion is independent from candidate completion. Current gate is `employer_profiles.onboarding_completed_at`. Completion is server-controlled (Auth-bound RPC after validating type-specific essentials). Invalid required employer-profile changes clear completion atomically. Re-completion is allowed. Private and organisation completion rules differ; organisation completion requires the owned company. Vacancy creation requires completed employer onboarding. Verification is **not** required to complete onboarding or save drafts.

**Alternatives:** Reuse candidate completion; client-writable status enum; require verification before drafting.

**Consequences:** Vacancy create gates on employer completion; dual-capability users may be complete in one role and incomplete in the other; completion locks employer type (D-048).

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #39 discovery review.

## D-050 — Draft lifecycle, source, ownership, and visibility

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 4.3

**Context:** `publication_state` is `published`|`withdrawn`; `source` is `seed` only; `expires_at` is NOT NULL.

**Decision:** `source` expands to `seed | employer`. Lifecycle expands to include `draft` (source and lifecycle are distinct). Employer-created rows are owned through `employer_profile_id`. Drafts have `published_at = NULL` and `expires_at = NULL`. Slice 4 has no draft→published transition. Drafts are invisible to anon, candidates, unrelated employers, matching loaders, candidate job-detail loaders, application submission, and public surfaces. Seed published/withdrawn behaviour remains intact.

**Draft deletion:** Allowed in Slice 4 when all of the following hold: row owned by the authenticated employer; `source=employer`; lifecycle is `draft`; no application row exists; no publication or historical state exists; deletion is database-enforced; wrong-owner deletion is denied generically. Do **not** include deletion of companies or employer profiles in Slice 4.

**Alternatives:** Separate `drafts` table; keep expires_at always set; disallow all draft deletion; allow candidate SELECT of own-employer’s drafts (rejected).

**Consequences:** Visibility helpers and submit RPC must exclude drafts; pgTAP matrix required; delete policy tested in PR 4.3+.

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #39 discovery review, including scoped draft deletion.

## D-051 — Draft fields, salary, location, language, expiry

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 4.3 / 4.4

**Context:** MVP requires structured salary, language, privacy-safe location, contract/shifts, etc. Current vacancy schema lacks salary/locality/workplace/frequency. Exact addresses must not be public (D-034).

**Decision:**

**Minimum initial draft:** completed employer; non-empty title; valid job category; `city = Berlin`; owner/source/lifecycle derived by server/database. Incomplete structured fields may remain null or empty while draft when constraints permit safe resume.

**Publish-readiness checklist only (no publish mutation in Slice 4):** description; privacy-safe locality; employment type; shift requirements; German requirement; normalized language requirements; structured salary; workplace type where required; frequency where required; explicit CV-required boolean; explicit English-interview boolean.

**Salary:** EUR only; integer cents; one amount (not a range); periods `hourly` | `monthly` | `fixed_job`; gross only; optional for draft save; required for publish-readiness; no free-text salary; no net, negotiable, range, or multi-currency support.

**Location:** store `city` and privacy-safe `public_locality`; do not collect exact residential or workplace address; no encrypted exact-address column in Slice 4; residential-workplace privacy warning in UI.

**Languages:** reuse normalized `vacancy_language_requirements`; use D-029 codes and proficiency semantics; no free-text language requirements; “no German required” uses `german_requirement = none`.

**Expiry:** `expires_at = NULL` while draft; publication lifetime and auto-expiry remain Slice 5.

**Alternatives:** Require full publish-ready fields on first save; free-text salary; store exact address encrypted now.

**Consequences:** Candidate-facing salary/locality appear only after Slice 5 publish; Slice 3 Demo detail remains schema-limited until then.

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #39 discovery review.

## D-052 — Employer form persistence boundary

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 4.2 / 4.4

**Context:** Candidate onboarding uses Actions+RLS; completion/submit use Auth-bound RPCs.

**Decision:** Hybrid model: browser form → Server Action → Zod validation → authenticated user verification → database-derived ownership. Direct RLS writes for simple owner-scoped fields. Auth-bound SECURITY DEFINER RPCs for employer completion; organisation profile plus company bootstrap; atomic language-requirement replacement; and other genuinely multi-table invariants (including type change with consistency when needed per D-048).

Caller must not supply: owner IDs; another employer profile; company ownership; verification state; source; publication state beyond permitted draft operations; publication timestamps; moderation state. Use generic safe errors for wrong-owner or unavailable resources.

**Alternatives:** RLS-only; RPC-only.

**Consequences:** Mirrors Slice 1/3 patterns; clearer audit of privileged writes.

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #39 discovery review.

## D-053 — Employer routes and RLS authorization

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 4.2 / 4.3

**Context:** Architecture lists `/employer/jobs*`; codebase uses `vacancies` terminology. Only `/candidate/*` is proxy-protected today.

**Decision:** Use `vacancies`, not `/employer/jobs`, for employer management routes. Accepted routes: `/employer/register`, `/employer`, `/employer/onboarding`, `/employer/vacancies`, `/employer/vacancies/new`, `/employer/vacancies/[vacancyId]/edit`, optional owner-only `/employer/vacancies/[vacancyId]`. Candidate-facing `/candidate/jobs/*` remains unchanged.

Layered authorization: proxy/session protection; server loader/action Auth verification; employer-completion gates; owner-scoped RLS; database constraints and RPC checks.

Behaviour: unauthenticated → login with validated `next`; candidate-only account → may start employer onboarding; incomplete employer → employer onboarding; wrong owner/missing vacancy → generic unavailable; completed owner → own draft routes; unrelated employer → denied; candidates cannot read drafts.

**Alternatives:** Public employer pages; `/employer/jobs` naming only; UI-only ownership checks.

**Consequences:** Proxy + loader + RLS layered authz; architecture doc `jobs` paths lag until separately updated.

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #39 discovery review; route terminology locked to `vacancies`.

## D-054 — Slice 4 hosted proof strategy

**Status:** Accepted
**Accepted:** 2026-08-03
**Must accept before:** PR 4.5 / Slice 4 Done

**Context:** Preview isolation is not configured; Slice 3 used owner-authorized Production fallback (D-045 / `docs/27`).

**Decision:** Local/CI proof first. Isolated Preview is preferred. The current Preview isolation problem remains unresolved. Accepting D-054 does **not** authorize Production hosted proof. Any Production fallback requires a **new** explicit owner authorization recorded in the decision log. Hosted proof must verify environment identity, migration state, fictional test identities, draft invisibility, ownership denial, candidate regressions, and cleanup/retention — without leaking secrets in evidence.

**Alternatives:** Pre-authorize Production now; close Slice 4 on local proof only.

**Consequences:** Preview infrastructure fix is a preferred-proof prerequisite, not a Slice 4 product scope item.

**Acceptance note:** Accepted 2026-08-03 by repository owner after PR #39 discovery review; Production remains unauthorized until a later explicit decision.

## D-055 — Slice 5 boundary

**Status:** Accepted
**Accepted:** 2026-08-05
**Must accept before:** PR 5.2 / any Slice 5 schema work

**Context:** Slice 4 Done (`docs/33`). Roadmap Slice 5 outcome: only verified employers publish public vacancies. MVP also lists admin verification queue (Slice 7) and applicant review (Slice 6).

**Decision:** Slice 5 includes:

- employer verification request and status;
- temporary operational verification approval authority;
- verification-gated publication;
- employer vacancy publish, pause, resume, fill, withdraw, expire, and renewal flows;
- anonymous public vacancy list and detail;
- candidate matching, detail, and application integration for eligible employer vacancies;
- privacy-safe public locality;
- deterministic expiry;
- verification-loss safety;
- local proof and isolated hosted proof.

Slice 5 excludes:

- applicant list and detail;
- application status changes;
- interview workflow;
- messaging;
- scheduling;
- moderation dashboard;
- reports;
- suspension UI;
- general admin UI;
- CV upload;
- saved jobs;
- exact residential addresses;
- GDPR export/deletion;
- Slice 6–8 implementation.

**Alternatives:** Bundle full admin UI into Slice 5; defer all verification to Slice 7; allow unverified publish.

**Consequences:** Trust gate lands before applicant review; Slice 7 still owns ops UI depth.

**Acceptance note:** Accepted 2026-08-05 by repository owner for PR 5.1 decision lock.

## D-056 — Verification authority and state model

**Status:** Accepted
**Accepted:** 2026-08-05
**Must accept before:** PR 5.2

**Context:** `verification_state` is locked to `unverified`. MVP requires manual verification. Slice 7 owns admin queue UI.

**Decision:** States: `unverified | pending | verified | rejected | revoked`.

Employer-controlled transitions (only when employer onboarding remains complete):

- `unverified → pending`
- `rejected → pending`

Operator-controlled transitions (database-enforced operator allow-list keyed to authenticated user identity; Auth-bound SECURITY DEFINER RPCs; no caller-supplied operator identity; no browser service-role path; no generic status setter; no public admin UI in Slice 5):

- `pending → verified`
- `pending → rejected`
- `verified → revoked`

Not allowed:

- `rejected → verified` directly
- `unverified → verified` directly
- `revoked → pending` without employer resubmission

Temporary operations may use an owner-controlled authenticated script or restricted internal invocation. Full admin review queue remains Slice 7.

Verification records must store: current state; `requested_at`; `reviewed_at`; `reviewed_by`; rejection or revocation reason where applicable; `updated_at`.

Employer completion and verification remain independent. Rejection or revocation must not erase employer profiles or draft vacancies. Private and organisation employers share the same state enum. No verification expiration in Slice 5. Suspension is distinct and deferred to Slice 7.

**Alternatives:** Self-declared verified; email-domain-only gate; full admin UI now; defer approval until Slice 7.

**Consequences:** Founder/operator must be allow-listed to unlock publish; full queue UX waits for Slice 7.

**Acceptance note:** Accepted 2026-08-05 by repository owner for PR 5.1 decision lock.

## D-057 — Verification evidence and storage

**Status:** Accepted
**Accepted:** 2026-08-05
**Must accept before:** PR 5.2 / PR 5.3

**Context:** Document vaulting pulls Storage, retention, and GDPR complexity forward. Profile already holds type-specific fields.

**Decision:** Slice 5 verification evidence is limited to structured profile data and an attestation. No Supabase Storage bucket or document-retention workflow is introduced.

Organisation employer evidence:

- completed organisation employer profile;
- company legal/display name already held by the product;
- public website, optional;
- business email/domain, optional;
- employer attestation that supplied information is accurate and that the employer is authorized to recruit.

Private employer evidence:

- completed private employer profile;
- employer attestation that supplied information is accurate and that the vacancy is genuine.

Not collected in Slice 5: tax number; identity-document upload; passport; business-registration document upload; utility bill; residential-address evidence; phone verification; exact private address; biometric data.

**Alternatives:** Require document uploads now; email-domain proof as hard requirement.

**Consequences:** Trust is human review of profile + attestation; Storage deferred.

**Acceptance note:** Accepted 2026-08-05 by repository owner for PR 5.1 decision lock.

## D-058 — Publication lifecycle

**Status:** Accepted
**Accepted:** 2026-08-05
**Must accept before:** PR 5.2

**Context:** DB allows `draft|published|withdrawn`; employer rows forced draft. Roadmap needs pause/expire/fill/renewal.

**Decision:** Employer-capable `publication_state`: `draft | published | paused | filled | expired | withdrawn`. Explicit Auth-bound RPCs per business transition. No generic unrestricted lifecycle status setter. Seed continues to use `published`/`withdrawn` + time window.

Accepted transitions:

- `draft → published`
- `published → paused`
- `paused → published` (resume)
- `published → filled`
- `paused → filled`
- `published → withdrawn`
- `paused → withdrawn`
- `published → expired`
- `paused → expired`
- `expired → draft` through an explicit renewal/edit-again transition

Terminal states: `filled`, `withdrawn` — cannot return to published or draft in Slice 5.

Expired vacancies cannot be republished directly. They must return to draft, receive a new expiry date, pass readiness again, then publish.

Publishing is idempotent only when the vacancy is already effectively published with the same valid state. Invalid duplicate transitions return deterministic business errors.

Existing candidate applications remain readable via snapshots; new applications only when effectively public.

**Alternatives:** Keep three states and overload withdrawn; UI-only hide without state changes.

**Consequences:** Migration expands CHECK; pgTAP must cover matrix in `docs/36`.

**Acceptance note:** Accepted 2026-08-05 by repository owner for PR 5.1 decision lock.

## D-059 — Publication readiness

**Status:** Accepted
**Accepted:** 2026-08-05
**Must accept before:** PR 5.2 / PR 5.4

**Context:** `employer_vacancy_draft_readiness` checks draft completeness without verification.

**Decision:** Publication requires:

- employer onboarding complete;
- employer verification state = `verified`;
- organisation employer owns the vacancy company;
- private employer vacancy has no company;
- title; category; description; Berlin public locality; workplace type; work frequency;
- salary amount in integer EUR cents; salary period; gross salary declaration;
- at least one normalized language requirement;
- CV requirement declaration; interview-English declaration;
- expiry date.

Expiry rules: must be later than the publication transaction time; default publication window 30 days; maximum 90 days; publish RPC may apply the 30-day default when no explicit expiry is supplied; caller may supply a shorter or longer period up to 90 days.

Do not add: experience minimum; exact address; coordinates; opaque score; document upload; fields not already accepted by the Slice 4/5 contract merely to satisfy older broad roadmap wording.

Readiness must be recalculated transactionally inside the publish RPC. A stale readiness result from an earlier UI request cannot authorize publication.

**Alternatives:** Require experience fields; allow publish without salary/languages (reject).

**Consequences:** Aligns publish gate with Accepted Slice 4 field surface + verification.

**Acceptance note:** Accepted 2026-08-05 by repository owner for PR 5.1 decision lock.

## D-060 — Public visibility and route model

**Status:** Accepted
**Accepted:** 2026-08-05
**Must accept before:** PR 5.5

**Context:** Anon currently denied; candidates see seed only. Roadmap asks for public visibility rules.

**Decision:** Routes `/jobs` and `/jobs/[vacancyId]` for anonymous and authenticated users to see only **effectively public** vacancies.

Effectively public means:

- `source = seed` and existing seed visibility rules pass; or
- `source = employer`; `publication_state = published`; `expires_at` in the future; owning employer complete; owning employer `verification_state = verified`; organisation company ownership remains valid.

Employer drafts and non-public lifecycle states are never public. Candidate authenticated routes remain `/candidate/matches` and `/candidate/jobs/[vacancyId]`. Employer owner routes remain `/employer/vacancies` and `/employer/vacancies/[vacancyId]`. Public and candidate views must share one canonical visibility contract rather than independently reproducing lifecycle rules.

**Alternatives:** Authenticated-only employer jobs (no public `/jobs`); fully public apply without Auth (reject).

**Consequences:** New anon SELECT policies must be narrow and field-safe; one effective-public helper is mandatory.

**Acceptance note:** Accepted 2026-08-05 by repository owner for PR 5.1 decision lock.

## D-061 — Location privacy

**Status:** Accepted
**Accepted:** 2026-08-05
**Must accept before:** PR 5.2 / PR 5.5

**Context:** D-034 / D-051 — no public exact private addresses; `public_locality` exists.

**Decision:** Public location may expose only: Berlin; `public_locality`; workplace type; remote, hybrid, or on-site semantics.

Do not expose or store for publication: street; house number; exact private residential address; latitude or longitude; precise map location; travel-time claim.

Organisation and private employers use the same public display contract. For private employers, `public_locality` must remain broad enough that it cannot reasonably reveal a household address.

**Alternatives:** Store encrypted exact address now (reject for Slice 5).

**Consequences:** Continues Slice 4 privacy posture into publication.

**Acceptance note:** Accepted 2026-08-05 by repository owner for PR 5.1 decision lock.

## D-062 — Candidate matching and application integration

**Status:** Accepted
**Accepted:** 2026-08-05
**Must accept before:** PR 5.2 / PR 5.5

**Context:** Matcher is seed-only via `visible_seed_*` and TypeScript rules.

**Decision:** Published employer vacancies enter the existing deterministic matcher through loader expansion. The matching algorithm remains unchanged unless implementation reveals a schema incompatibility requiring a separately reviewed decision.

Eligible candidate flows include active seed vacancies under existing rules and effectively public employer vacancies. Employer vacancies in draft, paused, filled, expired, or withdrawn never enter matches, candidate detail, or candidate application eligibility.

The application submit transaction must recheck effective visibility and expiry at submission time. Existing application records and immutable snapshots survive later pause, fill, expiry, withdrawal, and verification rejection or revocation. Slice 5 does not give employers access to applicant records.

**Alternatives:** Separate employer-only job board without matcher integration.

**Consequences:** Submit RPC and visibility helpers are high-sensitivity changes; require pgTAP + Slice 3 regression.

**Acceptance note:** Accepted 2026-08-05 by repository owner for PR 5.1 decision lock.

## D-063 — Expiry behaviour

**Status:** Accepted
**Accepted:** 2026-08-05
**Must accept before:** PR 5.2 / PR 5.4

**Context:** Published rows already require `expires_at`; drafts null. No cron infrastructure assumed.

**Decision:** Expiry is both (1) an effective visibility rule and (2) a materialized lifecycle state.

Authoritative safety rule: `expires_at > transaction time`. A vacancy with `publication_state = published` but `expires_at <= now` is not effectively public and cannot accept applications, even if not yet materialized as `expired`.

No scheduled infrastructure is required in Slice 5. Expired state may be materialized through owner vacancy loading, owner lifecycle action, public/candidate loader maintenance where safe, explicit expiry-maintenance RPC, or later scheduled infrastructure. Materialization must never be required for privacy or application safety.

Default duration 30 days; maximum 90 days. Expired vacancies may return only to draft, then pass readiness and publish again with a new expiry. Stale-vacancy admin tooling remains Slice 7.

**Alternatives:** Require always-on cron; unlimited expiry; rely on materialization alone for safety (reject).

**Consequences:** Deterministic without new infra; seed compatibility preserved.

**Acceptance note:** Accepted 2026-08-05 by repository owner for PR 5.1 decision lock.

## D-064 — Verification-loss behaviour

**Status:** Accepted
**Accepted:** 2026-08-05
**Must accept before:** PR 5.2

**Context:** Revocation must not leave public vacancies reachable by UI-only hiding.

**Decision:** Verification rejection or revocation must immediately make all employer-owned published vacancies ineffective for anonymous visibility, candidate visibility, matching, and new applications.

For `verified → revoked`: the verification transition and pausing of all currently published owned vacancies occur atomically in one database transaction; paused vacancies remain owned and editable; existing applications and snapshots remain intact; drafts remain drafts; filled, withdrawn, and expired states remain unchanged.

For `pending → rejected`: no publication should already exist; any inconsistent published record must still be excluded by the effective visibility helper.

Profile invalidation that clears employer completion also makes published vacancies ineffective through the canonical visibility contract. Re-verification does not auto-resume; employer resumes explicitly while verified.

**Alternatives:** Auto-withdraw on revoke; leave published and hide in UI only (reject UI-only).

**Consequences:** DB-enforced safety; pause remains reversible after re-verify.

**Acceptance note:** Accepted 2026-08-05 by repository owner for PR 5.1 decision lock.

## D-065 — Audit / event model

**Status:** Accepted
**Accepted:** 2026-08-05
**Must accept before:** PR 5.2

**Context:** Full `audit_events` and admin audit browsing are Slice 7 roadmap items.

**Decision:** Slice 5 does not add the general `audit_events` platform planned for Slice 7. Durable source-row evidence must include:

Verification: `requested_at`; `reviewed_at`; `reviewed_by`; review reason; verification state.

Vacancy lifecycle: `published_at`; `paused_at`; `filled_at`; `withdrawn_at`; `expires_at`; `updated_at`.

Where one timestamp cannot represent repeated pause/resume cycles accurately, add the minimum narrow immutable vacancy lifecycle event table rather than silently losing material transition history. The schema proposal / PR 5.2 must explicitly decide whether repeated pause/resume evidence requires that narrow event table.

Full moderation and administrative audit remain Slice 7.

**Alternatives:** Land full audit_events now; omit pause/resume history entirely (reject silent loss).

**Consequences:** Smaller Slice 5 schema; PR 5.2 owns the pause/resume event-table call.

**Acceptance note:** Accepted 2026-08-05 by repository owner for PR 5.1 decision lock.

## D-066 — Implementation security and RPC boundary

**Status:** Accepted
**Accepted:** 2026-08-05
**Must accept before:** PR 5.2

**Context:** Slice 4 established Server Action → Zod → Auth-bound RPC; no client-trusted ownership/verification/publication.

**Decision:** Use Server Actions and Zod for form validation; authenticated Supabase sessions; database RLS; explicit SECURITY DEFINER RPCs only where multi-table invariants require them; fixed `search_path`; explicit ownership and allow-list checks; transaction-level row locking for verification and publication transitions.

Caller-controlled fields must not set: verification state; `reviewed_by`; `reviewed_at`; publication state; publication timestamps; source; employer ownership; company ownership; moderation fields.

Required concurrency: publish locks the vacancy and employer verification rows; verification revocation locks the employer and affected published vacancies; application submit rechecks vacancy eligibility in the same transaction; edit and publish races resolve against the latest committed row; duplicate transitions return deterministic results; no UI-only authorization or visibility gate is accepted.

No service-role key may be exposed in browser or public environment variables.

**Alternatives:** Client-writable verification_state (reject).

**Consequences:** Continues Slice 3/4 security posture with stronger concurrency rules.

**Acceptance note:** Accepted 2026-08-05 by repository owner for PR 5.1 decision lock.

## D-067 — Slice 5 hosted-proof and Production authorization boundary

**Status:** Accepted
**Accepted:** 2026-08-05
**Must accept before:** PR 5.6 / PR 5.7 / any hosted Slice 5 mutation

**Context:** After Slice 4 teardown, Preview has no Preview-scoped Supabase configuration (`docs/33`). Prior Production authorizations do not carry forward.

**Decision:** Local and CI proof come first. Hosted proof requires:

1. a newly isolated disposable Supabase project or dedicated Staging project;
2. Preview or Staging frontend variables pointing only to that project;
3. explicit frontend/database alignment verification;
4. read-only migration preflight;
5. separate owner authorization before migration or fixture creation;
6. fictional deterministic fixtures;
7. cleanup through project deletion where disposable;
8. durable closure evidence.

Preview currently has no Preview-scoped Supabase configuration. Preview must never silently fall back to Production Supabase variables.

Production fallback requires a new explicit authorization that names: Production project reference; Production deployment URL; migrations; commands; schema effects; data effects; fixtures; cleanup or retention; rollback limitations. No prior authorization carries forward. Accepting D-067 does **not** authorize Production hosted proof by itself.

**Alternatives:** Pre-authorize Production now; treat uncleansed Preview as isolated (reject).

**Consequences:** Infrastructure re-isolation is a proof prerequisite, not optional product scope.

**Acceptance note:** Accepted 2026-08-05 by repository owner for PR 5.1 decision lock.

## D-068 — Canonical SQL eligibility evaluator (PR 5.5c)

**Status:** Accepted
**Accepted:** 2026-08-06
**Must accept before:** PR 5.5c merge

**Context:** D-041 (2026-08-03) accepted that "the full matcher is not duplicated in SQL" — the TypeScript matcher in `src/lib/matching/` was the sole eligibility source of truth, with `submit_candidate_application` enforcing only a narrow category-membership check plus visibility/completion/duplicate protection (confirmed by the pre-existing pgTAP comment in `13_applications_submit_rpc_test.sql`: "Narrow category membership only — not a full matcher; miss → unavailable"). PR 5.5b's database-contract audit found this insufficient for candidate discovery of *employer* vacancies: the fields the TypeScript matcher requires (`employment_types`, `shift_requirements`, `german_requirement`, `available_from`) are not exposed by the PR 5.5a public projection, and no RLS policy lets a candidate read another employer's `vacancies` row directly.

**Decision:** Add one canonical, non-short-circuiting SQL evaluator (`_evaluate_candidate_vacancy_eligibility`, internal only — no anon/authenticated grant) that ports every TypeScript matcher rule (category, employment type, shift, German, other languages, availability) rule-for-rule, verified against the TypeScript source before implementation. This evaluator is shared by two new narrow authenticated RPCs (`resolve_current_candidate_vacancy_match(uuid)`, `list_current_candidate_vacancy_matches()`) and by a modified `submit_candidate_application(uuid)`, which now rejects an ineligible submission transactionally with `{"result":"ineligible","missing_requirements":[...]}` instead of only checking category. This **supersedes D-041's "not duplicated in SQL" premise for the transactional submission path only** — the TypeScript matcher remains the source of truth for `/candidate/matches` and `/candidate/jobs/[vacancyId]` in this PR (both untouched; PR 5.5d will integrate the new RPCs there) and both implementations were proven to agree via pgTAP fixtures exercised through both paths.

The new `ineligible` result is purely additive to `submit_candidate_application`'s existing JSONB shape; the existing `submitApplicationRpcResultSchema` Zod discriminated union (PR 5.5b/earlier) does not yet include it and will fail-safe into the existing generic `{status:"failure"}` path until PR 5.5d updates the caller. The one pre-existing pgTAP assertion that encoded the old category-only/`unavailable` behavior was updated to expect `ineligible`, with the change documented inline.

**Alternatives:** Leave `submit_candidate_application` category-only and only add discovery RPCs (rejected — reopens the exact gap D-041/PR 5.5b's audit found, since a candidate could still successfully apply to a vacancy they don't actually match on shift/German/language); duplicate the evaluator logic separately per RPC instead of one shared internal function (rejected — risks discovery/mutation rule drift, which PR 5.5c's own pgTAP suite explicitly guards against).

**Consequences:** `submit_candidate_application` is stricter than before (closes a real eligibility gap); one pre-existing pgTAP fixture required updating from a category-only-eligible candidate to a genuinely fully-eligible candidate for its target seed vacancy; PR 5.5d owns integrating the new RPCs into candidate-facing routes and updating `submitApplicationRpcResultSchema`/the Server Action for the `ineligible` result.

**Acceptance note:** Accepted 2026-08-06 for PR 5.5c implementation, based on the rule-by-rule audit recorded in the PR 5.5c pre-commit report.

## D-069 — Candidate routes fully switched to the canonical eligibility contract (PR 5.5d)

**Status:** Accepted
**Accepted:** 2026-08-06
**Must accept before:** PR 5.5d merge

**Context:** D-068 built the canonical RPCs (`resolve_current_candidate_vacancy_match`, `list_current_candidate_vacancy_matches`) but left `/candidate/matches` and `/candidate/jobs/[vacancyId]` on the TypeScript matcher, deferring integration to PR 5.5d. Integrating the RPCs means these routes may no longer read `vacancies`, `vacancy_language_requirements`, `employer_profiles`, `companies`, verification tables, or `candidate_languages` directly — only the effective-public projection (`get_effective_public_vacancy[_languages]`, PR 5.5a) plus the two canonical RPCs, with the candidate-owned `applications` read (RLS: `applications_select_own`, `candidate_id = auth.uid()`) as one approved exception. This closes off the data the TypeScript matcher and the old "Application preview" section (D-043) were built from. A first pass of this PR also collapsed `/candidate/matches`'s existing profile-completion redirect guards into the list RPC's own empty-result behavior; that collapse was reviewed and **rejected** — the accepted product requirement is that the existing onboarding/missing-profile redirect guards on `/candidate/matches` are preserved exactly, unchanged from pre-PR-5.5d behavior.

**Decision:** `/candidate/matches` and `/candidate/jobs/[vacancyId]` now use `list_current_candidate_vacancy_matches`/`resolve_current_candidate_vacancy_match` as the sole eligibility authority — this fully supersedes D-041 for these routes (D-068 superseded it only for the transactional submit path). The TypeScript matcher (`src/lib/matching/rules.ts`, `ranks.ts`, `match-candidate-to-vacancy(ies).ts`) and its old callers (`load-candidate-matches.ts`, `resolve-candidate-vacancy-match.ts`, `load-candidate-vacancy-detail.ts`, `application-preview.ts`) are left in place, unused by any candidate route, rather than deleted. A new narrow completion guard, `loadCandidateCompletionStatus` (`src/lib/onboarding/candidate-completion-status.ts`), is the one approved exception to the "no `candidate_profiles` read" rule: it selects only `onboarding_completed_at` — no job category, employment type, shift, German, availability, or language column — scoped by the existing `candidate_profiles_select_own` RLS policy (`(select auth.uid()) = id`). `/candidate/matches` calls this guard first; `list_current_candidate_vacancy_matches()` is only ever called once the guard reports `complete`, so the RPC's own empty-array result can only mean "zero current eligible matches" for a genuinely complete candidate — never "incomplete" or "missing profile". Two UX consequences follow directly from the tighter read boundary; a third, previously proposed, collapse of the redirect guards was rejected and reverted:

1. **No `not_matching` status.** An ineligible candidate now sees the full vacancy detail (same effective-public projection a public visitor sees) plus an accessible list of missing-requirement labels (`category`, `employment_type`, `shift`, `german`, `language`, `availability` — never the raw codes, never *why* a specific value failed), instead of a blanket "this job no longer matches" hide. The eligible-only list RPC still excludes ineligible vacancies from `/candidate/matches` itself.
2. **Application preview (D-043) is dropped.** Its fields (matched category, German comfort, relevant languages, work authorisation, availability, employment/shift preferences) all come from `candidate_profiles`/`candidate_languages`, which this integration does not read. D-043's disclosure-before-submit requirement is preserved via the existing submit-disclosure copy and explicit Submit button; the post-submission confirmation at `/candidate/applications/[applicationId]` is unaffected — it already renders from immutable snapshot columns, not a live profile read.
3. **Rejected/reverted: `/candidate/matches` does *not* change its redirect behavior.** An unauthenticated visitor still redirects to `/login`; a missing-profile candidate still redirects to `/auth/error?reason=profile`; an incomplete candidate still redirects to `/candidate/onboarding` — all exactly as before PR 5.5d, now sourced from the narrow completion guard instead of the broad `loadCandidateOnboarding()` read. `/candidate/jobs/[vacancyId]` was never affected either way: `resolve_current_candidate_vacancy_match` reports `incomplete` as a distinct RPC-provided status (not a table read), so its onboarding redirect was always preserved.

**Alternatives:** Let `list_current_candidate_vacancy_matches()`'s empty result stand in for "incomplete" and drop the `/candidate/matches` redirect guards (tried first in this PR, rejected on review — an approved product requirement is that these guards are preserved, and the resulting UX regression — an incomplete candidate silently seeing an empty match list instead of being routed to finish onboarding — was not an acceptable trade for the narrower read); reuse the existing broad `loadCandidateOnboarding()` loader for the guard (rejected — it selects `job_categories`/`employment_types`/`shift_preferences`, i.e. matching-input columns, which is exactly what this integration is scoped to avoid reading); keep the TypeScript matcher as a client-side "why this matches" explainer alongside the RPCs (rejected — would let stale/duplicated eligibility reasoning drift from the canonical evaluator, the exact risk D-068 was written to prevent); delete the orphaned matcher files (rejected — out of scope for this PR and no product decision has retired the matcher itself, only its use as an authority in these two routes).

**Consequences:** `/candidate/matches` and `/candidate/jobs/[vacancyId]` are privacy-scoped identically to the public jobs routes plus eligibility, with one narrow, single-column `candidate_profiles` read for completion status only; existing redirect behavior for unauthenticated/missing-profile/incomplete candidates is unchanged; a future slice that wants matcher-derived "why this matches" copy back on these routes needs a new decision, not a revert of this one; E2E/unit coverage for both routes was rewritten to the new eligibility source while preserving the pre-existing redirect assertions (see the PR 5.5d pre-commit report).

**Acceptance note:** Accepted 2026-08-06 for PR 5.5d implementation.

## D-070 — Slice 6 boundary: application status and employer review (PR 6.1)

**Status:** Accepted
**Accepted:** 2026-08-06
**Must accept before:** PR 6.1 implementation

**Context:** `docs/13-implementation-plan.md`'s Slice 6 entry (written before Slices 3–5 were built) describes broader scope than this unit implements: *"applicant list and detail; application status changes; interview invitation metadata without full messaging; candidate-visible timeline updates; status notification emails."* D-039 (2026-08-03) already deferred every status beyond `submitted` pending *"a later Accepted decision, defined transition ownership, authorization rules, and an additive migration"* — this decision is that decision. D-055 (2026-08-05) confirmed Slice 5 excludes applicant list/detail, status changes, interview workflow, messaging, and scheduling, deferring all of it to Slice 6. D-062 (2026-08-05) confirmed Slice 5 gives employers zero access to applicant records — D-070 is the first decision to grant any employer read of `applications`. Per `AGENTS.md` ("when documents conflict, stop and report the conflict, do not invent a resolution"), the gap between `docs/13`'s broader description and this narrower MVP is recorded here rather than silently resolved, following the identical precedent of D-035/D-046/D-055 narrowing their own slices' earlier `docs/13` descriptions.

**Decision:** Slice 6 MVP includes employer applicant review and an application-status workflow with exactly five statuses: `submitted`, `reviewing`, `shortlisted`, `accepted`, `rejected`. `accepted` and `rejected` are terminal (no reversal). Transitions are forward-only; valid intermediate states may be skipped (e.g. `submitted` → `accepted` directly). Employer applicant review requires an authenticated, completed employer profile (`employer_profiles.onboarding_completed_at is not null`) plus ownership of the application's vacancy (`vacancies.employer_profile_id = auth.uid()`) — **current verification is not required**, matching the existing `requireCompletedEmployer()` gate already used by every other employer vacancy-management route, and consistent with verification-revocation already only pausing vacancies rather than hiding them or their history from their owner. Employer review reads the existing immutable submission-time `candidate_snapshot`/`vacancy_snapshot` (D-038), never a live `candidate_profiles`/`candidate_languages` join. Candidate-safe status/history projections exclude `reason` and actor identity entirely — an employer's rejection reason (optional, accepted only on a `rejected` transition, 1–1000 trimmed characters) is visible to that employer only, never to the candidate. Vacancy lifecycle and application lifecycle remain two independent state machines: accepting an application does not automatically fill its vacancy, and filling a vacancy does not automatically reject its remaining applications; employer review and status transitions remain available regardless of the owned vacancy's lifecycle state (paused, filled, withdrawn, expired) or the employer's current verification state. Slice 6 explicitly excludes, pending a separate future decision: candidate-initiated withdrawal; interview invitation metadata or scheduling of any kind; email, SMS, or any other notification channel; messaging; CV/document upload or storage; employer notes visible to candidates; internal scoring or AI ranking; bulk status changes; automated/system-initiated rejection; operator participation in applicant review; and the general `audit_events` platform (reserved for Slice 7 per D-065).

**Alternatives:** Build the full `docs/13`/`docs/05-features.md` 9-state aspirational pipeline (`viewed`, `interview invited`, `interview scheduled`, `offer`, `hired`, `not selected` as distinct from `rejected`) with interview tracking and notifications now (rejected — none of it is evidenced as required for a working review-and-decide loop, and D-039 explicitly asked for a narrower, later decision rather than blanket adoption of the discovery-stage brainstorm); require current employer verification for applicant review (rejected — strictly more restrictive than every other existing employer surface, and inconsistent with revocation's own "pause, don't hide" precedent); let employers read live `candidate_profiles` for review instead of the immutable snapshot (rejected — reopens exactly the unnecessary-PII exposure D-038 was written to prevent); couple `accepted` to automatic vacancy fill, or vacancy fill to automatic rejection of remaining applications (rejected — adds cross-domain side-effect complexity disproportionate to this MVP; may be revisited as a later, separately-decided enhancement).

**Consequences:** `submit_candidate_application`'s signature and JSON result contract are unchanged; a successful submission now also writes its initial `application_status_history` event atomically in the same transaction. `applications.status` is widened from the single Slice 3 value to the five-value state machine above (additive migration, 12th). A new `application_status_history` table is append-only and RPC-mediated only — zero direct `authenticated` grant. Four new narrow `SECURITY DEFINER` RPCs (`list_current_employer_applications`, `get_current_employer_application`, `transition_current_employer_application_status`, `list_current_candidate_application_status_history`) are the only read/write surface for employer- and candidate-side application status; no RLS policy is added to `applications` itself. A future slice that wants interview scheduling, notifications, candidate withdrawal, or richer audit infrastructure needs its own new decision, not a silent extension of this one.

## D-071 — Slice 7 boundary and admin authorization reuse

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 7.2

**Context:** `docs/13-implementation-plan.md`'s Slice 7 entry lists a broader set of capabilities (admin authorization, employer review/approval, vacancy moderation, reports, suspension, stale-vacancy handling, audit events, transactional email completeness, privacy/terms/Impressum placeholders, basic funnel analytics) than this plan's first implementation contract covers. Employer verification review/approval is already Done (Slice 5). Per `AGENTS.md`'s conflict-reporting rule, this narrowing is recorded here rather than silently resolved, following the identical precedent of D-039/D-046/D-055/D-070 narrowing their own slices' earlier `docs/13` descriptions.

**Decision:** Slice 7's first implementation contract is: employer suspension, vacancy moderation, and one general operator-audit ledger, built entirely on the existing `verification_operators`/`_is_active_verification_operator`/`requireActiveOperator` authorization foundation from D-056 — no second admin/operator identity model, no operator self-management (grant/revoke) RPC. Operator provisioning remains owner-controlled/direct-database administration, as today. Reports, analytics, transactional email, and legal placeholders receive the minimum treatment identified in `docs/41` (mostly deferred, or a small separate final PR), not full features. Candidate suspension and a new stale-vacancy subsystem are explicit non-goals.

**Alternatives:** Build the full `docs/13` list in one slice (rejected — no product evidence most of it is needed for a controlled pilot's safety exit criteria, and it would force a generic admin dashboard disproportionate to a founder-operated pilot); add a second, general-purpose "admin" role distinct from "verification operator" (rejected — the existing mechanism already generalizes cleanly with no naming or authorization conflict).

**Consequences:** Slice 7 exit criteria ("administrators can suspend unsafe actors and remove vacancies; sensitive admin actions are audited; pilot funnel events are measurable") are met by the narrower contract above; funnel measurability is satisfied by existing database evidence (D-075) rather than a new analytics integration; PR 7.2 is not authorized until this PR merges.

**Acceptance note:** Accepted 2026-08-07 by repository owner for PR 7.1 decision lock, after two corrective review passes recorded in D-072/D-074.

## D-072 — Employer suspension semantics

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 7.2

**Context:** No suspension concept exists today. `verification_revoked` is not equivalent to suspension (`docs/41` §3) — it only fires from `verified`, is reversible by employer resubmission alone, and is a trust-gate reset rather than a punitive hold. An audit of every authoritative employer mutation and sensitive read path (`docs/41` §3.1, `docs/43` §4.1) found the employer mutation surface is not RPC-only: direct-table `UPDATE` paths on `employer_profiles` are authorized by RLS alone. An earlier draft of this decision incorrectly cited D-070's "review survives verification revocation" precedent to exempt Slice 6 employer applicant-review access from suspension — that citation was a reasoning error, since D-070 describes *revocation*, not a punitive *suspension* imposed on an actor already judged unsafe — and withdrawn. A second review pass additionally found that "suspension does not rewrite `vacancies.publication_state`" had been incorrectly treated as equivalent to "suspension leaves public/candidate visibility unaffected" — also withdrawn.

**Decision:** A new, independent employer-suspension state (`employer_suspension` table): two states only (suspended / not suspended), operator-only, required bounded reason, DB-derived actor/timestamp. While an employer is suspended:

- Supabase Auth login/session is **not** disabled;
- historical data remains stored, untouched;
- the employer's own UI may render a neutral suspended state;
- **every authoritative employer mutation path is blocked** — every `SECURITY DEFINER` employer/vacancy/verification/onboarding-mutating RPC, **and** every existing authenticated own-profile `UPDATE` path on `employer_profiles`, closed by narrowing the `employer_profiles_update_own` RLS policy itself (not achievable by RPC-body checks alone, since those paths never call an RPC);
- **application status transitions are blocked** — `transition_current_employer_application_status` returns its existing `employer_unavailable` result while suspended;
- **employer applicant list/detail access is blocked** — `list_current_employer_applications` returns zero rows and `get_current_employer_application` returns `{"status":"unavailable"}`, both reusing existing deny-branch results, while suspended;
- **no candidate snapshot is returned** to a suspended employer through any Slice 6 employer-review RPC, for as long as the suspension is active;
- candidate-owned application/history views (Slice 6 candidate side) are **unaffected** — a candidate can still see their own application and its status timeline regardless of the employer's suspension state;
- operator moderation/audit surfaces continue to work regardless of any employer's suspension state;
- **unsuspension restores ordinary employer access** according to the employer's *current live* verification/vacancy/application states at the moment of unsuspension — it does not resurrect or replay any state that changed, or would have changed, during the suspension window;
- **suspension itself does not mutate `verification_state`**;
- **suspension itself does not mutate any `applications.status` value**;
- **suspension itself does not rewrite any `vacancies.publication_state` value** — a currently-published vacancy stays `published` in the database; suspension never touches stored lifecycle state;
- **all of the suspended employer's vacancies nonetheless become non-effective-public while the suspension is active** — achieved without rewriting `publication_state`: the canonical `is_vacancy_effectively_public` predicate gains an independent `employer_not_suspended` condition, composed the same way vacancy moderation (D-073) already narrows the same predicate: `effective_public = existing_conditions AND employer_not_suspended AND vacancy_not_moderated`. Every public/candidate read and write path that delegates to that one predicate (public list/detail, candidate match list/detail, application submission) is covered automatically, with no candidate-facing "employer suspended" reason exposed — a suspended employer's vacancy is simply the existing `'unavailable'` discriminant, the same one already used for paused/expired/withdrawn/unverified-employer vacancies;
- **unsuspension does not republish anything and does not restore any captured state** — it only removes the suspension gate; each vacancy becomes visible again solely if its current live publication/verification/expiry/moderation state independently qualifies it.

Suspension is independent of `verification_state`; suspending does not itself change verification, and revoking verification does not itself suspend. This is a **stronger** hold than verification revocation — an explicit operator safety action against an actor already judged unsafe, not a trust-gate reset.

**Alternatives:** Reuse `verification_state = 'revoked'` for suspension (rejected — conflates two different concepts with different reversal rules); block Auth login (rejected for MVP — would require deeper Auth-hook work not evidenced as necessary; RLS/RPC-layer enforcement is sufficient for the stated exit criterion); exempt Slice 6 applicant-review access from suspension by analogy to D-070's revocation precedent (rejected — this was the original, now-corrected error; a suspended employer's continued candidate-snapshot access is a real privacy exposure); enforce suspension only via RPC-body checks (rejected — would leave direct-table `employer_profiles` update paths completely unblocked); leave public/candidate visibility unaffected by suspension, blocking only mutations and reads (rejected — this was the original, now-corrected error; an operator-judged-unsafe employer's vacancies remaining publicly discoverable and applicable-to defeats the purpose of the safety hold).

**Consequences:** One new small table with a real FK to `employer_profiles`; every employer-mutating RPC and all three Slice 6 employer RPCs gain one additional internal check; **one existing RLS policy (`employer_profiles_update_own`) is narrowed** — a real, if small, RLS change, stated explicitly rather than claimed as "no RLS changes"; the canonical `is_vacancy_effectively_public` predicate also gains one additional condition — a `SECURITY DEFINER` function-body change, not a further RLS change — which every public/candidate read and write path inherits automatically by delegation, with no per-path duplication and no new candidate-facing "suspended" oracle.

**Acceptance note:** Accepted 2026-08-07 by repository owner for PR 7.1 decision lock, after two corrective review passes: the first added the direct-table/RLS mutation-path coverage and Slice 6 applicant-review denial; the second added the effective-public employer-suspension visibility gate.

## D-073 — Vacancy moderation semantics

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 7.2

**Context:** No operator-initiated, single-vacancy hold exists today. The closest existing mechanism (revoking the owning employer's verification) has blast radius across every published vacancy that employer owns, not one specific unsafe listing, and none of the six existing `publication_state` values cleanly represents an operator hold without overloading employer-controlled semantics (`docs/41` §4).

**Decision:** A new, independent vacancy-moderation state (`vacancy_moderation` table), composing with rather than replacing `publication_state`. The canonical `is_vacancy_effectively_public` predicate gains one additive narrowing condition: a vacancy is never effectively public while moderated, regardless of its `publication_state`. Restoration re-reads the vacancy's *current* live `publication_state` rather than assuming a prior one, so a since-withdrawn vacancy is not resurrected by restoration alone. Operator-authored moderation events are written to the new general audit ledger (D-074), never to `vacancy_lifecycle_events` (whose owner-readable RLS would leak the operator's identity to the employer being moderated).

Employer suspension (D-072) and vacancy moderation (D-073) are kept as two separate, deliberately not collapsed, concepts: suspension is an **actor-level** safety gate narrowing visibility for every vacancy a suspended employer owns; moderation is a **vacancy-level** safety gate narrowing visibility for one specific vacancy regardless of who owns it. Both compose into the same canonical predicate without either subsuming the other:

```
effective_public =
  existing_publication_conditions
  AND employer_not_suspended   -- D-072
  AND vacancy_not_moderated    -- D-073
```

Both conditions can independently be true or false for the same vacancy (a moderated vacancy owned by a suspended employer is hidden by both; restoring only one leaves it hidden by the other).

**Alternatives:** Overload `withdrawn` or `paused` for moderation (rejected — both remain employer-reversible via existing RPCs, which would let an employer silently undo an operator's moderation hold); write moderation events into `vacancy_lifecycle_events` (rejected — that table's RLS already exposes `actor_user_id` to the owning employer).

**Consequences:** One new small table; one additive (narrowing-only) change to the single canonical `is_vacancy_effectively_public` predicate, inherited by delegation across every public/candidate read and write function that depends on it, with every existing pgTAP assertion about them required to keep passing unchanged.

**Acceptance note:** Accepted 2026-08-07 by repository owner for PR 7.1 decision lock.

## D-074 — Admin audit ledger architecture

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 7.2

**Context:** D-065 explicitly deferred the general `audit_events` platform to Slice 7 rather than building it in Slice 5. No such table exists today. Two narrower audit patterns already exist and diverge: `vacancy_lifecycle_events` (owner-readable RLS, closed event-type enum) and `application_status_history` (zero-grant, RPC-mediated, actor never client-exposed).

**Decision:** One general, append-only `admin_audit_events` ledger, following `application_status_history`'s zero-`authenticated`-grant, RPC-mediated pattern — not `vacancy_lifecycle_events`'s owner-readable pattern. Fields: `id`, `event_type`, `target_kind`, `target_id`, `actor_user_id`, `occurred_at`, `reason`, bounded `metadata`. `event_type` is the closed action/event discriminator (`employer_suspended | employer_unsuspended | vacancy_moderated | vacancy_restored | verification_approved | verification_rejected | verification_revoked`); `target_kind` is an independently bounded enum (`employer | vacancy`) — **not** the same field as `event_type`, and not derived from it by string matching. Covers employer suspend/unsuspend, vacancy moderate/restore, and re-emits verification approve/reject/revoke as first-class events from the three already-shipped Slice 5 RPCs, whose parameters/result contracts/existing pgTAP assertions remain unchanged.

`event_type`/`target_kind` pairing is declaratively **CHECK-constrained** — both columns live in the same row (unlike `target_id`'s cross-table problem below), so their legal pairing is an ordinary same-row CHECK, the same class already used for `application_status_history`'s `reason`/`to_status` pairing: `target_kind = 'employer'` only for `event_type in ('employer_suspended', 'employer_unsuspended', 'verification_approved', 'verification_rejected', 'verification_revoked')`; `target_kind = 'vacancy'` only for `event_type in ('vacancy_moderated', 'vacancy_restored')`.

`target_id` existence has **no polymorphic FK and no cross-table CHECK** — PostgreSQL CHECK constraints cannot perform cross-table existence queries. Referential integrity for `target_id` is procedural instead: every audit-producing RPC resolves and locks its target *before* writing the event; `target_kind` is hard-coded per RPC, never caller-supplied (and additionally constrained by the same-row CHECK above); `target_id` is the id of the row the RPC just locked, never a separately re-typed parameter; **there is no generic client-callable "append an audit event" RPC** — every event is a side effect of a specific, already-authorized domain RPC. The implementation PR's pgTAP suite must prove this behaviorally: an invalid `event_type`/`target_kind` pairing is rejected by the table CHECK directly; a valid pairing succeeds only through an approved domain RPC; a nonexistent target cannot create an event through any approved RPC; `target_kind` cannot be caller-supplied independently by any domain RPC; actor/timestamp remain DB-derived; no direct `authenticated` INSERT/UPDATE/DELETE succeeds against the table.

Actor and timestamp are always DB-derived (`auth.uid()`, `clock_timestamp()`); reason is required for punitive event types, optional/absent for restorative ones; no event's `reason` is exposed to the moderated employer or any candidate by default. State transition and its audit event are written atomically, sharing one captured timestamp — the Slice 6 shared-timestamp pattern, re-proven for this table.

**Retention is deliberately not `ON DELETE CASCADE` from the target.** `target_id` remains historical evidence even if the employer/vacancy row it refers to is later deleted — this decision does not decide Slice 8's final GDPR retention/deletion policy, but locks the constraint Slice 8 must respect: Slice 8 must explicitly reconcile administrative-audit retention with account-deletion requirements, and the implementing PR must not accidentally erase the ledger merely because a domain row is deleted. This is distinct from the two *current-state* tables (`employer_suspension`, `vacancy_moderation`), which legitimately use real FKs with `on delete cascade`, since they represent live state tied to a still-existing row, not durable cross-domain audit history.

**Alternatives:** Extend domain-specific histories only (rejected — `vacancy_lifecycle_events`'s existing RLS is unsuitable for operator actions without either weakening it per-row or building a second table anyway); land the full general ledger in Slice 5 instead (rejected already, by D-065, prior to this decision); a literal polymorphic foreign key or cross-table CHECK on `target_id` (rejected — not implementable in PostgreSQL; procedural integrity via the RPC boundary is the corrected design).

**Consequences:** One new table with no FK to any domain table (by design — see retention above), but with a same-row `event_type`/`target_kind` CHECK constraint; three existing Slice 5 RPCs gain one additional insert each inside their existing transactions, with no change to their external contracts; the implementing PR's pgTAP suite carries the full `target_id`-existence integrity burden that a declarative constraint cannot express, while the CHECK constraint carries the `event_type`/`target_kind` pairing burden declaratively.

**Acceptance note:** Accepted 2026-08-07 by repository owner for PR 7.1 decision lock, after two corrective review passes: the first withdrew an unimplementable cross-table CHECK claim for `target_id` and moved to procedural integrity; the second added the declarative same-row `event_type`/`target_kind` CHECK.

## D-075 — Slice 7 pilot-readiness scope (reports, analytics, email, legal)

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 7.4 (does not block PR 7.2/7.3)

**Context:** `docs/13-implementation-plan.md`'s Slice 7 entry also lists reports, stale-vacancy handling, transactional-email completeness, basic funnel analytics, and (via `docs/04-mvp.md`'s Administration MVP) implies legal/privacy readiness. `docs/41` audited each and found the current state is zero integration for analytics/email/legal, and no report-intake schema, while stale-vacancy handling is already fully solved by existing Slice 5 expiry/renewal.

**Decision:** Reports: operator-initiated moderation only (D-072/D-073's suspend/moderate RPCs), no user-submitted report-intake UI in Slice 7. Stale-vacancy handling: no new subsystem — existing expiry/renewal already satisfies it. **Analytics: no third-party integration in Slice 7 — but the "pilot funnel events are measurable" exit criterion is not deferred along with it.** It is proven instead by a concrete, committed deliverable: a deterministic, read-only funnel-proof script (proposed `scripts/proof/pilot-funnel.mts` or a final agreed equivalent name), running one query per accepted funnel stage against existing tables/columns only, plus a documented sample run recorded in the Slice 7 exit-proof doc. Deferring PostHog is explicitly not the same decision as deferring measurability — this decision exists specifically so that distinction is never silently collapsed. Transactional email: none added in Slice 7 for candidates or employers (unchanged from D-070's own notification non-goal); no operator-facing email either, since it is not required to meet the stated exit criteria. Legal/privacy: route placeholders + footer links with explicit "draft — legal review required" text only, in a small final PR (7.4), containing no real legal content and no claim of legal review.

**Alternatives:** Build a full user-submitted report/ticketing workflow now (rejected — no pilot evidence of need, disproportionate for a founder-operated, controlled Berlin pilot); integrate PostHog or similar now (rejected — existing DB evidence already satisfies "measurable" for pilot scale; introduces an unreviewed privacy/consent surface); treat "no PostHog" as "no funnel measurement" and drop the exit criterion entirely (rejected — the exit criterion is binding regardless of which mechanism proves it); add status-change emails now (rejected — D-070 already excluded notifications as a Slice 6 non-goal, and the core journeys already work without email).

**Consequences:** The implementing PR is small and low-risk (static routes + one read-only proof script); the "pilot funnel events are measurable" exit criterion is met with a named, verifiable deliverable rather than an implicit claim; a future slice may still add live product analytics or transactional email as its own, separately-decided feature.

**Acceptance note:** Accepted 2026-08-07 by repository owner for PR 7.1 decision lock; must be re-confirmed (not reopened) before PR 7.4, per its "Must accept before" gate.

**Acceptance note:** Accepted 2026-08-06 by repository owner for PR 6.1 implementation.

## D-076 — Slice 8 PR decomposition

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 8.2 (does not block PR 8.1, which is this planning unit itself)

**Context:** `docs/45-slice-8-discovery.md` and `docs/47-slice-8-data-removal-proposal.md` establish the full export/deletion contract. Following the Slice 5/6/7 precedent (planning PR, then database-contract PR, then UI/API PRs, then closure), Slice 8 needs its own small, individually-reviewable PR sequence rather than one large mixed PR.

**Decision:** Five PRs are accepted for the current Slice 8 plan. If implementation evidence requires changing the decomposition, update this planning record explicitly before proceeding; do not silently broaden a PR. **PR 8.1** (this unit) — discovery, proposed decisions, build plan, no code. **PR 8.2** — deletion/export database contract: `account_deleted_at` tombstone state on `candidate_profiles`/`employer_profiles`; the `deletion_requests` table (concurrency-constrained per D-081); request/cancel/claim/process transition RPCs; the candidate and employer anonymization `SECURITY DEFINER` RPCs (D-078/D-079); canonical deleted-account helper functions (`_is_current_candidate_deleted()`/`_is_current_employer_deleted()`, mirroring the PR 7.2 suspension-helper pattern) composed into every RLS policy/RPC enumerated in `docs/45` §3.3; any narrow read RPCs export needs. One additive migration, pgTAP proof, no UI — a materially larger schema surface than "one table + two RPCs," reflecting the D-080/D-081 corrections below. **PR 8.3** — account export UI/API on top of PR 8.2's read RPCs (or directly on existing RLS reads where sufficient), following the immediate-JSON-download design in `docs/47` §2. **PR 8.4** — deletion request + processing UI: request/cancel UI, the isolated Auth-scrub processing path (the one place `service_role`-equivalent privilege is used), confirmation screens, independent local verification of the exact `deleteUser(id, true)` behavior. **PR 8.5** — local exit proof + Slice 8 closure doc, mirroring `docs/44`'s pattern. No PR after 8.1 may start until the decisions gating it (below) are Accepted.

**Alternatives:** One large PR covering schema + UI (rejected — every prior slice in this project used small reviewable PRs; Slice 8 touches the most cross-user-sensitive graph in the whole schema, the opposite case for bundling); skip database-contract-only PR and build schema alongside UI (rejected — PR 7.2/7.3's split let pgTAP carry the full authorization/integrity burden before any UI existed, which this project has consistently found valuable).

**Consequences:** Matches established project rhythm; each PR has a narrow, auditable diff; implementation cannot start until export/deletion semantics are actually Accepted, preventing a repeat of any premature-implementation risk.

**Acceptance note:** Accepted 2026-08-07 by repository owner as part of the Slice 8 PR 8.1 decision lock, following a corrective review pass that closed the export/deletion behavioral contracts in D-077–D-082 (see each decision's own acceptance note). PR 8.2 is now the first authorized implementation unit.

**Amendment — 2026-08-08:** PR 8.3 is split into **PR 8.3a** and **PR 8.3b** after implementation discovery confirmed that D-077's employer application-process export cannot be satisfied through existing database read boundaries without exposing candidate data. **PR 8.3a** adds the dedicated narrow employer application-process read contract (**D-089**). **PR 8.3b** implements the role-scoped candidate/employer export API and download UI under D-077/**D-088**. **PR 8.4 and PR 8.5 retain their existing numbers and scope, unchanged.** This is the explicit implementation-evidence decomposition update this decision's own text already permits ("If implementation evidence requires changing the decomposition, update this planning record explicitly before proceeding"); it does not reopen the rest of D-076, and D-076 remains Accepted as of its original 2026-08-07 date.

## D-077 — Export format and scope

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 8.3

**Context:** `docs/45` §4/§5 and `docs/47` §2 propose exact candidate and employer export payloads, with the employer boundary explicitly excluding any candidate snapshot content.

**Decision:** Adopt the candidate and employer export boundaries exactly as proposed in `docs/47` §2: versioned JSON envelope (`"version": 1`), server-generated, immediate download, bounded by `auth.uid()` with no caller-supplied target parameter. **Auth account metadata scope is decided, not left open: `email` and `created_at` only, for both roles** — `last_sign_in_at` is excluded (no concrete user-value requirement identified for it), and password/session/token material is never included regardless. Candidate export body: own `candidate_profiles` fields, `candidate_languages`, own applications (own `candidate_snapshot` + narrow public-safe `vacancy_snapshot` projection), candidate-safe status-history projection (`to_status`/`occurred_at` only), onboarding/completion timestamps. Employer export body: own `employer_profiles` fields, own `companies` row (organisation only), owned vacancies plus their structured `vacancy_language_requirements`, and **narrow application process metadata only** (id/status/submitted_at/count) — **never** `candidate_snapshot` content, candidate name/email/profile fields, candidate Auth identity, `application_status_history.actor_user_id`, operator IDs, or operator moderation/verification reasons; no password hashes or session/token material in either export. No background job, no object storage, no email delivery.

**Alternatives:** Include full `candidate_snapshot` content in employer export (rejected — `docs/45` §5 treats this as a materially different privacy posture from per-application viewing, with no current product precedent); email-delivered export archive (rejected — reopens D-075's transactional-email deferral without a new justification); persisted export job with polling (rejected — current data volume does not require it, per `docs/47` §2's architecture-principle citation).

**Consequences:** Export implementation (PR 8.3) is a synchronous read-and-serialize operation, no new background infrastructure; the employer/candidate snapshot-field audit required by `docs/45` §13 must happen at PR 8.3 implementation time against the current `candidateSnapshotV1Schema`/`vacancySnapshotV1Schema` shape.

**Acceptance note:** Accepted 2026-08-07 by repository owner, after the Auth account-metadata scope (`email`/`created_at` only) was closed from a flagged proposal into a firm decision, and the employer export boundary was tightened to explicitly exclude candidate Auth identity, operator IDs, and operator moderation/verification reasons alongside the previously-listed exclusions.

## D-078 — Candidate deletion semantics

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 8.2

**Context:** `docs/45` §6 traces the candidate deletion graph and evaluates six strategies; a naive hard delete via the existing `ON DELETE CASCADE` chain would silently destroy the employer's own applicant-review record.

**Decision:** Adopt Strategy C from `docs/45` §6, with an exact row-level field matrix — no field left ambiguous. `candidate_profiles`: **preserved as a structural tombstone row** (preserved `applications` rows depend on this FK anchor); `account_deleted_at` is set; `display_name`/`german_comfort`/`work_authorisation_declared`/`work_authorisation_declared_at`/`city`/`travel_radius_minutes`/`available_from`/`job_categories`/`employment_types`/`shift_preferences` are cleared/replaced with fixed placeholders; `onboarding_completed_at`/`created_at` are preserved as lifecycle facts. `candidate_languages`: **all rows DELETED**, not anonymized in place. `applications` per row: `id`/`vacancy_id`/`status`/timestamps/`vacancy_snapshot` preserved unchanged; `candidate_snapshot` replaced with one fixed, versioned tombstone shape — conceptually `{"version": 1, "deleted": true}`, matching the existing `applications.snapshot_version = 1` constraint (extended only if the current `candidateSnapshotV1Schema` requires additional structural fields, confirmed at PR 8.2 — the *contract* of "fixed, versioned, non-identifying placeholder" does not change based on that detail). `application_status_history`: preserved unchanged, including `actor_user_id`; access by the deleted candidate is blocked by the D-080 database gate, not by modifying the row. Auth side processed per D-080 (never a literal `auth.users` DELETE). No shared `profiles` table is introduced; `account_deleted_at` lives on `candidate_profiles` directly.

**Alternatives:** Hard delete + cascade (Strategy A, rejected — destroys employer business record); nullable-FK/tombstone candidate row (Strategy D, rejected for MVP — a larger schema change than the anonymize-in-place approach requires, deferred as a future option if Strategy C proves insufficient); legal-retention hold (Strategy E, explicitly not decided here — flagged for legal review, not assumed absent); operator-mediated manual review (Strategy F, rejected — disproportionate for a self-service GDPR action, inconsistent with D-072/D-073's narrow operator scope).

**Consequences:** `applications`/`application_status_history` rows are never deleted for a candidate-initiated request; PR 8.2's migration adds the anonymizing RPC and its fixed-placeholder contract, not a schema change to the FK graph itself; the local proof script (D-084) must assert the employer-visible application row is provably unchanged after a candidate deletion.

**Acceptance note:** Accepted 2026-08-07 by repository owner, after `candidate_profiles` was named explicitly as a preserved structural tombstone row, `candidate_languages` was closed to an exact DELETE-all-rows contract, and `candidate_snapshot`'s replacement was given an exact conceptual versioned tombstone shape (`{"version": 1, "deleted": true}`).

## D-079 — Employer deletion semantics

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 8.2

**Context:** `docs/45` §7 traces the employer deletion graph, confirming today's `NO ACTION`/`RESTRICT` FK defaults already prevent a naive hard delete from silently cascading into candidate application history — the risk is an implementer "fixing" the resulting FK errors by weakening those defaults, not the current schema itself.

**Decision:** Adopt Strategies B+C from `docs/45` §7, with an exact field matrix and a resolved slug rule — no open question left inside this decision. `employer_profiles`: **preserved as a structural tombstone row** (`vacancies.employer_profile_id`/`companies.owner_employer_id` are `NO ACTION`); `account_deleted_at` is set; `display_name`/`berlin_locality`/`phone`/`website`/`organisation_legal_name` are cleared/replaced with fixed placeholders; `verification_state`/`verification_reviewed_by`/`verification_reviewed_at` are preserved as operator-facing historical fact. `companies` (organisation employers only): `name` replaced with a fixed placeholder; **`slug` replaced with a deterministic, non-PII tombstone value, `deleted-company-<uuid>`, derived only from the company's own immutable `id` — never from name or email.** **The pre-deletion slug is not automatically freed for reuse by a different employer** and remains permanently retired unless a separate, explicit future product decision introduces a slug-release mechanism — no such mechanism exists or is proposed here. Every vacancy the employer owns is withdrawn first (reusing the existing `withdraw_employer_vacancy` RPC pattern, self-scoped to the requester) so it immediately stops being effective-public via the existing canonical predicate. `vacancies`, `vacancy_language_requirements`, `applications`, and `application_status_history` are **never written to, deleted, or cascaded** by this process. Auth side per D-080. No shared `profiles` table is introduced.

**Alternatives:** Hard delete employer + vacancies + applications (Strategy A, rejected — would require weakening `applications.vacancy_id` from `RESTRICT` to `CASCADE`, directly destroying candidate-owned history the candidate never asked to remove); operator-reviewed deletion request (Strategy E, rejected — same disproportionality objection as D-078).

**Consequences:** No FK default is weakened by Slice 8; candidate application history is preserved by construction (the proposal never touches those tables), not by careful cascade tuning; PR 8.2's migration adds the anonymizing RPC and reuses the existing withdrawal RPC, no change to `vacancies`/`applications`/`companies` FK definitions. Directly answers the kickoff's question H: employer deletion cannot destroy candidate application history — confirmed by construction, not assumption.

**Acceptance note:** Accepted 2026-08-07 by repository owner, after `employer_profiles` was named explicitly as a preserved structural tombstone row and the company-slug-reuse question was closed: tombstone slugs are deterministic (`deleted-company-<uuid>`, derived only from the immutable `id`), and the pre-deletion slug is explicitly not auto-reusable absent a separate future decision.

## D-080 — Auth-user deletion privilege mechanism

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 8.2 (schema readiness) and PR 8.4 (the actual Auth-scrub processing path)

**Context:** `docs/45` §3.1 compares **three distinct Supabase Auth Admin API mechanisms** for the Auth-side step — **A.** hard `deleteUser(userId)` / `deleteUser(userId, false)`, **B.** soft `deleteUser(userId, true)`, **C.** manual `updateUserById` scrub + `ban_duration` — and treats them as materially different, not interchangeable. A literal hard `auth.users` DELETE has different current behavior per role: for a **candidate**, it is technically possible today — `candidate_profiles`/`candidate_languages`/`applications`/`application_status_history` all cascade — but would destroy the D-078 tombstone and preserved application/history records; for an **employer**, it is additionally blocked outright today by the `NO ACTION`/`RESTRICT` FK graph whenever dependent company, vacancy, review, or actor records exist. Separately, `docs/45` §3.2 identifies the **stale-JWT problem**: none of A/B/C invalidate an already-issued, unexpired access token, so the Auth mechanism alone cannot be relied on for real-time authorization enforcement.

**Decision, part 1 — Auth mechanism: adopt B, `auth.admin.deleteUser(userId, true)`.** Comparison basis (full table `docs/45` §3.1): **A** is rejected. For candidates, a hard `auth.users` deletion is technically possible under the current cascade graph but would destroy the structural candidate tombstone and preserved application/history records required by D-078. For employers, hard deletion is additionally blocked by the current `NO ACTION`/`RESTRICT` FK graph when dependent company, vacancy, review, or actor records exist. In both roles, hard deletion is incompatible with the accepted tombstone/preservation contract. **B** is preferred — Supabase's own explicit soft-deletion primitive; the `auth.users` row remains (sidestepping the FK landmine entirely, not working around it); requires no custom synthetic-email lifecycle; non-reversible, matching deletion's intent; requires `service_role`. **C** is rejected as the primary mechanism — semantically a temporary-restriction primitive (reversible via `ban_duration` expiry), not a genuine deletion signal, and does not by itself avoid the need for a custom scrub. Mechanism B is invoked via one self-scoped `SECURITY DEFINER` RPC (public-schema anonymization from D-078/D-079, `auth.uid()`-scoped, no caller-supplied target) plus one narrowly isolated, server-only processing path (never client-bundled) that calls `deleteUser(userId, true)` — the only point in the whole design touching `service_role`/Auth Admin credentials, built in PR 8.4. **Mechanism B is the accepted choice; the method is not called anywhere in PR 8.1, and PR 8.4 must independently verify the exact local Supabase behavior of `deleteUser(userId, true)` (FK/session/reversibility behavior against this project's actual local stack) as an implementation-verification step before this decision's proof is treated as complete — this is a verification requirement, not an open behavioral question about which mechanism is chosen.**

**Decision, part 2 — the stale-JWT problem requires an independent database gate, not just the Auth mechanism.** "Cannot sign in again" is **not sufficient** authorization enforcement, because a previously issued access token remains cryptographically valid until its own expiry regardless of which of A/B/C runs. Adopt the `docs/45` §3.3 proposal: nullable `account_deleted_at timestamptz` on `candidate_profiles` and `employer_profiles` directly (**no shared `profiles` table introduced solely for this**), composed into every candidate/employer RLS policy and `SECURITY DEFINER` RPC via canonical self-scoped helper functions (`_is_current_candidate_deleted()`/`_is_current_employer_deleted()`, mirroring the existing `_is_current_employer_suspended()`/`is_current_employer_suspended()` pattern from PR 7.2 exactly — zero-argument, `auth.uid()`-derived, no caller-supplied target). The full required composition scope (candidate profile/languages/onboarding/matching/applications/status-history; employer profile/company/onboarding/vacancy-lifecycle/verification/applicant-review) is enumerated in `docs/45` §3.3 and is a required, non-optional part of PR 8.2 — not deferred, not left open.

**Alternatives:** Mechanism C as primary (rejected — reversible-by-design, semantically wrong for permanent deletion, see above); Mechanism A with weakened FK defaults (`CASCADE`/`SET NULL`) to make hard delete "work" (rejected — exactly the failure mode `docs/45` §3/§7 warns against); relying on Auth deletion alone without a database gate (rejected — does not solve the stale-JWT problem, and would leave a completed "deletion" that a live unexpired token can still exploit); a shared `profiles` table to host `account_deleted_at` for both roles (rejected — `candidate_profiles`/`employer_profiles` are already the canonical per-role identity tables in this schema; introducing a new shared table purely for one boolean-like column adds a migration and a join for no behavioral benefit); operator-mediated worker (rejected — disproportionate, same reasoning as D-078/D-079).

**Consequences:** `service_role`-equivalent privilege is introduced to this codebase for the first time since the project's "no service-role runtime client" principle was established, but confined to one narrow, explicitly-triggered, server-only processing path — never the ordinary authenticated runtime. PR 8.4 must include a static-security test proving this confinement, mirroring the PR 7.3/7.4 convention, **and** must independently verify `deleteUser(userId, true)`'s exact local behavior before relying on it. The `auth.users` row is never deleted by this design — "deletion" in user-facing language means "your data is removed and your account can no longer access anything, including with a token issued before deletion," not "the account row itself no longer exists." PR 8.2 must add `account_deleted_at` to both profile tables and the canonical helper functions/RLS-RPC composition as first-class, required schema work — this is materially more schema surface than a bare anonymization RPC pair.

**Acceptance note:** Accepted 2026-08-07 by repository owner, after this decision was corrected from a two-mechanism comparison into the required three-way A/B/C comparison (preferring soft-delete mechanism B) and the stale-JWT problem/database gate was added as a first-class, separately-verified part of this decision rather than left implicit.

## D-081 — Deletion-request state machine and confirmation semantics

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 8.2 (state machine schema) and PR 8.4 (UI/confirmation)

**Context:** `docs/45` §10 compares four request models and answers the kickoff's specific operational questions (reversibility, cooling-off, password re-entry, session handling, confirmation without email, partial failure, retry, idempotency).

**Decision:** Adopt option 2 from `docs/45` §10: `pending` → `processing` → `completed`/`failed`, with the following contract closed exactly, not left as implementation detail:

- **Concurrency:** at most one **active** (`pending`/`processing`) request per user, enforced at the schema level. A duplicate request while `pending` returns the existing request. The processor claims `pending` → `processing` under a row lock/deterministic single-writer transition.
- **Cancellation:** allowed only while `pending`. Once claimed into `processing`, cancellation is impossible — there is no mid-processing cancel state.
- **Cooling-off period — decided: NONE for MVP.** `pending` is a process state, not a promised waiting window. If a deliberate cooling-off window is wanted later, that is its own separate, explicitly-authorized future decision with its own exact duration — not implied here.
- **Target identity:** never caller-supplied, on either the request-creation path (`auth.uid()` only) or the privileged processing path (derived exclusively from the claimed request row).
- **Processing phases (exact, six steps — full detail `docs/45` §10.2):** 1) claim under row lock; 2) run domain anonymization transaction (D-078/D-079); 3) record domain-scrub evidence (`domain_scrubbed_at` or equivalent durable marker); 4) invoke Auth soft delete (D-080 mechanism B); 5) verify the Auth result; 6) record Auth-deletion evidence (`auth_deleted_at`) and transition to `completed` — only once both markers exist.
- **Failure handling:** if step 4 fails, the request remains safely retryable (steps 2/3 are idempotent). If step 4 succeeds but step 6's persistence fails, the now-deleted user cannot authenticate to retry anything — a narrow, manually-invoked, privileged **reconciliation operation** (not a scheduled background worker) re-confirms the Auth deletion independently via the Auth Admin API and completes the request, without requiring the user to authenticate. This reconciliation mechanism is required scope for PR 8.2/8.4, not an unspecified future addition.
- **Error surfacing:** raw Auth/database errors are never persisted to user-visible fields; `failed` carries a fixed, generic reason code only.
- **Session/confirmation semantics:** no password re-entry (no recent-auth mechanism exists today; not built in Slice 8). The user sees a final processing/success confirmation screen **before** their local session ends (not deferred to a later sign-in attempt); session/refresh tokens are then revoked as supported. After deletion, any future login attempt receives the ordinary generic Auth failure state — no special "account deleted" message, and no identifier is retained solely to enable one. In-app confirmation only, no transactional email, consistent with D-075.

**Alternatives:** Immediate one-click deletion (option 1, rejected — no natural place to persist/report partial-failure state, and the underlying multi-step privileged process needs a durable state regardless); reauthentication-gated immediate deletion (option 3, rejected — the required recent-auth mechanism does not exist in this codebase today; building it is new authentication-surface scope, not a Slice 8 data-removal concern); operator-mediated request (option 4, rejected — same reasoning as D-078/D-079); a mandatory cooling-off period (considered, rejected for MVP — adds complexity with no identified user-safety requirement beyond the existing cancel-while-pending guarantee); retaining the original email as a tombstone identifier purely to show a "this account was deleted" login message (rejected — unnecessary PII retention for a cosmetic purpose; the ordinary generic Auth failure state is sufficient).

**Consequences:** PR 8.2's migration includes a `deletion_requests` table with an explicit status column, the active-request uniqueness constraint, and the two evidence-marker columns; PR 8.4 builds the request/cancel/confirm UI, the processing trigger, and the manual reconciliation operation. No cooling-off duration is deferred — none is used for MVP, full stop.

**Acceptance note:** Accepted 2026-08-07 by repository owner, after this decision was corrected to close the concurrency contract exactly (at-most-one-active-request, row-locked claim, cancel-only-while-pending, no mandatory cooling-off for MVP), specify the six-phase processing order with durable evidence, define the manual reconciliation mechanism for the Auth-succeeded/evidence-write-failed case, and remove the earlier "account deleted" post-delete sign-in message in favor of the ordinary generic Auth failure state.

## D-082 — Audit-event retention and redaction under account deletion

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 8.2

**Context:** `docs/45` §8 confirms `admin_audit_events.target_id` has no FK and survives any anonymization/deletion trivially at the SQL level — the open question is privacy of the free-text `reason` field, not schema mechanics. D-074's own migration comment explicitly flagged this as a Slice 8 responsibility.

**Decision:** Retain `admin_audit_events` rows unconditionally after any employer/vacancy anonymization under D-079 — `id`/`target_id`/`target_kind`/`event_type`/`actor_user_id`/`created_at` are never modified or removed. **`reason` free text is redacted for rows whose target is the deleted employer or one of its vacancies** — replaced with a fixed marker, `"[redacted after account deletion]"`, at the moment deletion processing anonymizes that employer. This is a **closed technical MVP contract, not a flagged-open legal question**: free-text moderation reasons can contain identifying/user-provided information (e.g. a business name an operator quoted) that the audit system's own author did not control, while the event's fact/taxonomy/time remain fully auditable without retaining arbitrary free text indefinitely — the taxonomy alone already answers "what kind of action was taken against this account, and when," which is the audit trail's load-bearing property.

**This is an explicit, narrow Slice 8 exception/supersession to D-074's immutable-reason contract — stated as such, not left to imply both contracts hold simultaneously.** D-074 remains the general rule for every audit row whose target has not been deleted; this decision carves out one specific, narrowly-scoped exception that applies only when the row's own subject has exercised a GDPR-motivated account deletion, and only replaces `reason` with the fixed marker — no other field, no other trigger.

**Alternatives:** Delete/null entire audit rows targeting a deleted account (rejected — silently destroys the tamper-evident taxonomy record D-074 was built to guarantee, which is broader than the privacy risk `reason` text alone poses); retain `reason` unredacted for MVP (considered as the alternative technical contract; rejected because it would permanently retain user-provided identifying text with no product justification once the account itself has been anonymized — if this project ever prefers retention instead, that must be stated as the actual contract with its privacy consequence accepted, not left as an open question, which is exactly what this decision closes); automatically redact `reason` text via content-aware pattern-matching instead of a fixed marker (rejected — no reliable pattern exists to detect an arbitrary business name or identifying phrase without false positives/negatives; a fixed marker is simple, deterministic, and does not require pretending to know what was in the original text).

**Consequences:** No change to `admin_audit_events`'s schema or grants (redaction is a data-write during deletion processing, not a schema change); PR 8.2's anonymization RPC for employers must also perform this `reason` replacement as part of the same transaction (§8/D-079); PR 8.5's closure doc records this as a settled MVP contract, not an open legal question; the local proof script (D-084) must assert `reason` matches the fixed marker for affected rows post-deletion.

**Acceptance note:** Accepted 2026-08-07 by repository owner, after this decision was corrected from a self-contradictory "retain unredacted but unresolved" position into a single closed technical MVP contract (redact to a fixed marker), explicitly framed as a narrow, named exception to D-074 rather than a silent conflict with it.

## D-083 — Private-document/storage interpretation

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 8.5 (closure — this decision documents a proof, not a build)

**Context:** `docs/45` §9 confirms, by direct inspection of `supabase/config.toml` and the codebase, zero configured Storage buckets and zero user-uploaded private documents anywhere in the current product. `NOT_NOW.md` independently confirms this was a deliberate Slice 5 deferral specifically to avoid pulling retention/GDPR work forward.

**Decision:** The Slice 8 exit criterion *"deletion does not leave private documents publicly reachable"* is satisfied by proof of absence: no private-document object exists in the current MVP surface, and neither D-078 nor D-079 introduces any new public-reachability path. No Storage work is added in Slice 8. Future CV/document upload (if ever built) must trigger its own retention/deletion review at that time — this decision does not pre-approve any future Storage design.

**Alternatives:** Add Storage scaffolding now "to be safe" (rejected — `docs/45` §9 and the kickoff's own instruction both reject adding Storage solely to prove a currently-vacuous exit criterion); defer this exit criterion entirely (rejected — proof of absence is itself sufficient evidence and should be documented, not silently skipped).

**Consequences:** PR 8.5's closure doc records this as evidence (a grep/config audit, not a test suite) for exit-criterion satisfaction; no code or migration is produced by this decision.

**Acceptance note:** Accepted 2026-08-07 by repository owner as part of the Slice 8 PR 8.1 decision lock; unchanged in substance from the original proposal.

## D-084 — Local proof boundary and hosted-proof timing

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 8.5

**Context:** `docs/45` §14 proposes a local deletion/export proof script mirroring `scripts/proof/pilot-funnel.mts`'s pattern, but notes this proof necessarily performs real writes against disposable local fixtures, unlike the read-only funnel proof — a materially different risk class if ever pointed at a hosted environment.

**Decision:** Slice 8 closure (PR 8.5) requires a local-only deterministic proof (`scripts/proof/account-deletion.mts` or an agreed equivalent name) asserting the full candidate/employer deletion and export contracts from D-077–D-079, reusing the existing `local-environment-guard.ts`/localhost-only discipline. **The proof must include, for both candidate and employer fixtures, an explicit stale-JWT test (per D-080's stale-JWT finding): obtain a valid JWT before deletion; process deletion to completion; attempt protected reads/mutations using that same, still-unexpired, pre-delete JWT; prove they are denied by the `account_deleted_at` gate** — proving "cannot sign in again" alone is not treated as sufficient. **Hosted deletion/export proof is not authorized by this decision and is not scheduled for Slice 8** — it would require its own separate, explicit, owner-authorized follow-up, exactly as Slice 3/4's hosted-proof pattern already established for lower-risk operations, and more conservatively than any of them given the destructive nature of what is being proven.

**Alternatives:** Require hosted proof before Slice 8 can be marked Done (rejected — no accepted Slice 8 exit criterion requires it, and it introduces disproportionate risk for a planning-stage decision to pre-authorize); skip local proof entirely and rely on pgTAP alone (rejected — pgTAP proves schema/RLS/RPC correctness in isolation; a local script proves the end-to-end contract the way `pnpm proof:pilot-funnel` already does for Slice 7, and D-075 established that pattern as the project's preferred evidentiary style).

**Consequences:** PR 8.5 is local-only, following the exact established pattern of every prior slice's closure PR; Slice 8 can be marked Done locally without hosted execution, mirroring Slice 7's own closure; a hosted proof, if ever pursued, remains a distinct, separately-authorized unit of work outside Slice 8's scope as currently decided.

**Acceptance note:** Accepted 2026-08-07 by repository owner, after this decision was corrected to explicitly fold in the stale-JWT proof requirement (pre-delete JWT reuse denied post-deletion, for both candidate and employer) as required local-proof scope rather than leaving it implicit.

## D-085 — Whole-account deletion across capabilities

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 8.2

**Context:** D-047 permits one `auth.users` identity to own both `candidate_profiles` and `employer_profiles` simultaneously — a shipped, reachable dual-capability account state (`src/lib/employer/capability-routing.ts`, `/account/choose`). The accepted Slice 8 Auth mechanism, `auth.admin.deleteUser(userId, true)` (D-080), acts on the shared `auth.users` identity, not on an individual Stint capability. Candidate-only or employer-only deletion semantics (D-078, D-079) therefore cannot be treated as independent when both profiles exist on the same identity — this gap was discovered during PR 8.2 implementation, before any migration was written, and is resolved here rather than left implicit.

**Decision:** Account deletion is **whole-account** deletion. A deletion request always targets the authenticated Stint account represented by `auth.uid()`, never an individual role/capability. The privileged processor derives existing capabilities from the database at processing time, not from any caller-supplied scope. Three possible account shapes: (1) candidate profile only — apply D-078 candidate anonymization; (2) employer profile only — apply D-079 employer anonymization; (3) both profiles exist — apply **both** D-078 and D-079 domain anonymization contracts in **one atomic domain transaction** before the Auth soft-delete step. If either side of a dual-capability domain scrub fails, the whole domain transaction rolls back — a same-identity account must never end up "candidate deleted, employer active" or "employer deleted, candidate active."

**Request model:** the deletion request target is the `user_id`/Stint account, never a caller-selected `candidate`/`employer` scope. `deletion_requests` does not store a caller-supplied `account_role` column; if a capability descriptor is stored at all, it is DB-derived and diagnostic/descriptive only (`candidate` | `employer` | `dual`), never authoritative over processing scope. At most one active request (`pending`/`processing`) per `user_id`, regardless of which capability or UI surface originated it — no user may hold parallel candidate and employer deletion requests.

**Auth consequence:** once the domain transaction commits, `account_deleted_at` is set on **every** existing role profile for that identity in the same transaction, so the stale-JWT business gate (D-080 §3.3) denies both capability surfaces immediately; the later Auth soft-delete step then applies once to the shared `auth.users` identity, exactly as D-080 already specified.

**UI consequence (PR 8.4, not built here):** if both capabilities exist, confirmation copy must state plainly that deletion removes/anonymizes both candidate and employer account data and ends access to the entire Stint account — the user must not be told they are deleting only the currently-viewed role. No separate dual-role deletion workflow is required; the same request/confirm flow applies uniformly.

**Alternatives:** role-scoped deletion, rejecting the request outright when both roles exist until the user explicitly acknowledges whole-account consequences (rejected — adds a UI-facing special case that still resolves to whole-account deletion, with no behavioral benefit over deciding it directly here); role-scoped deletion leaving the untouched role nominally active despite the shared Auth soft-delete (rejected — silently orphans a capability that appears active in the database but can never be signed into again, which is a worse and more confusing outcome than committing to whole-account semantics up front).

**Consequences:** PR 8.2's processor-bound domain anonymization RPC accepts a `deletion_request_id` only, never a role parameter; it resolves `request.user_id`, determines which profile(s) exist, and runs the applicable anonymization contract(s) transactionally; `account_deleted_at` composition (D-080 §3.3) is unaffected — every existing profile row is gated identically regardless of whether the account was single- or dual-capability at deletion time.

## D-086 — Current moderation state is removed on employer account deletion

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 8.2

**Context:** `employer_suspension.suspended_reason` and `vacancy_moderation.moderated_reason` are `NOT NULL` free-text current-state columns. D-082 governs durable `admin_audit_events.reason` redaction but did not decide what happens to these current-state reason copies when the employer/vacancy rows themselves are tombstoned rather than physically deleted. Because Slice 8 preserves `employer_profiles`/`vacancies`, the existing `ON DELETE CASCADE` from those tables to `employer_suspension`/`vacancy_moderation` never fires — this gap was discovered during PR 8.2 implementation and is resolved here.

**Decision:** during employer account anonymization, **DELETE** the current `employer_suspension` row for that employer if one exists, and **DELETE** current `vacancy_moderation` rows for every vacancy owned by that employer if they exist. Do not preserve these rows in place; do not redact them; do not introduce a tombstone moderation-state representation. The durable historical record remains exclusively in `admin_audit_events`, where — per D-082 — `reason` on rows targeting the deleted employer or its vacancies is replaced with `"[redacted after account deletion]"`, while `id`/`event_type`/`target_kind`/`target_id`/`actor_user_id`/`occurred_at` are preserved unchanged.

**Why current-state removal is correct:** `employer_suspension`/`vacancy_moderation` represent *current* operational restrictions, not history. After account deletion: `account_deleted_at` is the stronger, permanent business-access gate; all owned vacancies are withdrawn; effective-public visibility is independently blocked for a deleted employer (D-080 §3.3/PART F); the historical moderation fact already survives in `admin_audit_events`. Retaining a current suspension/moderation row after permanent account deletion adds no required operational behavior and needlessly keeps a second free-text copy of the same class of content D-082 already decided to redact in the audit ledger.

**Interaction with D-072/D-073:** unchanged for any non-deleted employer/vacancy — this decision narrows only the account-deletion transaction, not ordinary suspension/moderation behavior.

**Interaction with unsuspension/restoration:** deletion processing does **not** call `unsuspend_employer` or `restore_vacancy` — those RPCs carry different business semantics and would generate misleading `employer_unsuspended`/`vacancy_restored` audit events for a state change that was never actually a business restoration. Deletion processing removes the current-state rows directly through its own authoritative, privileged deletion/anonymization path; no ordinary `authenticated`/`anon` grant exists on `employer_suspension`/`vacancy_moderation` DELETE, and this cleanup is reachable only from that one path. No new audit event of type `employer_unsuspended`/`vacancy_restored` is generated as a side effect of this cleanup; the pre-existing moderation audit events remain, redacted per D-082.

**Alternatives:** preserve `employer_suspension`/`vacancy_moderation` rows unredacted, treating them as ongoing safety records independent of the audit ledger (rejected — retains the same free-text identifying-content risk D-082 already decided to redact, for a restriction that no longer has any operational meaning once the account is permanently gated); redact `suspended_reason`/`moderated_reason` in place instead of deleting the rows (rejected — the CURRENT-state tables have no historical-retention purpose once the restriction itself is superseded by permanent deletion, unlike `admin_audit_events`, whose entire purpose is the historical record; deleting is simpler and avoids inventing a parallel redaction convention for state that should not persist at all).

**Consequences:** PR 8.2's employer anonymization RPC deletes both current-state rows transactionally as part of the same domain-scrub transaction that performs D-079 anonymization and D-082 audit redaction; no ordinary grant is added to `employer_suspension`/`vacancy_moderation` for this cleanup; pgTAP must prove the target rows are absent, unrelated rows are unchanged, and no spurious `employer_unsuspended`/`vacancy_restored` audit event is created.

## D-087 — Deleted-candidate application transition boundary

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 8.2

**Context:** D-078 preserves applications, current application status, vacancy snapshot, and application status history after candidate account deletion. D-080 terminates the deleted candidate's own business access immediately via `account_deleted_at`. D-070 defines the ordinary employer application-status transition state machine, but does not address candidate account deletion. The application remains a legitimate historical recruitment record, but the candidate is no longer an active participant in Stint after account deletion.

**Decision:** Once the candidate that owns an application has `candidate_profiles.account_deleted_at IS NOT NULL`, the application becomes historical/read-only from the employer recruitment perspective. Employer may continue to READ the preserved application, vacancy information, submitted timestamp, current application status, status history, and the neutral "Deleted candidate" identity state. Employer may NOT perform any further application-status transition. The authoritative RPC, `transition_current_employer_application_status(...)`, returns its existing `{"result": "unavailable"}` result when the application's candidate profile is deleted — no new result variant is introduced solely for candidate deletion. **No mutation on denied transition:** the check happens before mutation, so `application.status` and `application.updated_at` remain unchanged, no `application_status_history` row is appended, no transition reason is stored, and no audit/lifecycle event is generated. **Historical readability:** the application itself remains available for employer list/detail reads — the already-accepted deleted-candidate list/detail behavior (`candidate_deleted = true`, "Deleted candidate", no fabricated candidate attributes) is unchanged; this decision blocks only future status mutation. **Detail `allowed_transitions` contract:** for a deleted-candidate detail, `get_current_employer_application(...)` returns `allowed_transitions: []` rather than the ordinary transition matrix — the database detail RPC must never advertise a transition the transition RPC will reject. **Authoritative signal:** `candidate_profiles.account_deleted_at`, never `candidate_snapshot`'s presentation-only `deleted` marker — the snapshot marker is presentation/history data, not access-control state.

**Alternatives:** Introduce a new transition-RPC result variant (e.g. `candidate_deleted`) specific to this case (rejected — the existing `unavailable` result already covers "this application cannot be acted on" without adding a new client-visible enum value, consistent with this repository's no-existence-oracle discipline); use the `candidate_snapshot` JSON `deleted` marker as the authorization condition (rejected — the snapshot is presentation/history data written once at anonymization time, not a live access-control signal, and conflating the two would let stale/malformed snapshot data affect authorization); collapse the deleted-candidate application to `status: "unavailable"` in the detail RPC (rejected — contradicts D-078's preserved-application-is-a-legitimate-record contract and the already-accepted historical-readability requirement).

**Consequences:** PR 8.2's migration (`20260807220000_...`) adds one `candidate_profiles.account_deleted_at is null` condition to `transition_current_employer_application_status`'s existing ownership check, reusing the existing `unavailable` result and running before any row lock/mutation; `get_current_employer_application`'s deleted-candidate branch always returns `allowed_transitions: []`. The employer applicant detail UI renders no transition controls for a deleted candidate's application as a consequence of the empty array (`ApplicationTransitionForm`'s existing zero-length branch), not via a new UI-only check — the database denial remains authoritative. D-070 remains authoritative and unaffected for any application whose candidate account is active; this decision does not reopen D-070 generally. "Preserved application" means a frozen historical record, not an ongoing recruitment workflow — candidate deletion freezes that candidate's application at its current state.

## D-088 — Account exports are role-scoped, including dual-capability accounts

**Status:** Accepted
**Accepted:** 2026-08-08
**Must accept before:** PR 8.3b

**Context:** D-077 defines two distinct export payloads — a candidate export (candidate profile, languages, candidate-owned applications/history, candidate-owned snapshot/context) and an employer export (employer/company/vacancy data, narrow application process metadata, explicitly no candidate PII/snapshots). The product also has fully separate candidate and employer account spaces (`/candidate/*`, `/employer/*`), with no shared account dashboard — `/account/choose` is a role-disambiguation redirect only. D-047 permits one `auth.users` identity to hold both capabilities simultaneously. D-085 establishes whole-account *deletion*, but does not establish whole-account *export* semantics. Discovery at PR 8.3 implementation time (auditing D-077, `docs/45` §4/§5/§11/§12, and `docs/47` §2 in full) found no previously Accepted decision specifying whether a dual-capability user receives one combined export or two role-scoped exports — every "dual"/"whole-account" mention in the accepted docs governs deletion scope only. `docs/45` §12's own unaccepted-proposal text ("candidate role sees only the candidate export shape; employer role sees only the employer export shape") and both illustrated envelopes (each showing only a `candidate` or only an `employer` key, never both) point toward two independent exports, but this was never promoted into an Accepted decision the way D-085 was explicitly created to resolve the analogous deletion-scope gap.

**Decision:** Exports are **role-scoped**. A candidate export contains only the D-077-accepted shared Auth metadata plus D-077-accepted candidate capability data. An employer export contains only the D-077-accepted shared Auth metadata plus D-077-accepted employer capability data. For a dual-capability account: the candidate account surface produces a candidate export only; the employer account surface produces an employer export only. Candidate and employer data are never combined into one download, and no new shared whole-account export envelope or shared account dashboard is created solely for export.

**Identity:** both role-scoped exports derive the same underlying `auth.uid()` — no caller-supplied user ID. The role/capability is determined by the authenticated route/account surface and validated server-side; no query/body parameter (e.g. `?role=candidate`) may choose export scope.

**Shared Auth metadata:** each role-scoped export may independently include the D-077-accepted `email`/`created_at` account metadata. This duplication across a dual-capability user's two exports is intentional — each download is independently useful and belongs to the same authenticated Stint identity. `last_sign_in_at`, tokens, sessions, provider identities, and password material remain excluded per D-077.

**Dual-capability consequence:** a dual-capability user who wants both sets of their Stint data downloads two files — a candidate export and an employer export — each with its own `version`/`exported_at`/`account`/role-specific body. Candidate data never appears in the employer export merely because the same Auth identity also has a candidate profile, and vice versa.

**Relationship to D-085:** unchanged and intentionally different. Deletion is whole-account, because it disables the shared identity and must operate across every capability. Export is a read operation whose privacy boundary follows the current candidate/employer capability surface, not the shared identity.

**Alternatives:** one combined whole-account export envelope with optional `candidate`/`employer` sections (rejected — no accepted doc illustrates this shape, it would require a new shared account surface that does not exist today, and it does not match the "role determined server-side, sees only one shape" signal already present in the unaccepted `docs/45` §12 proposal text); inferring whole-account export scope silently from D-085 (rejected — D-085's own text scopes it to deletion, and the export sections of `docs/45`/`docs/47` were never updated to reference it, unlike the analogous deletion gap that received its own explicit D-085).

**Consequences:** PR 8.3b's export builders/routes are implemented per-role, each independently authorized and independently downloadable; no route/API accepts a role or target-user parameter; a dual-capability account's UI surfaces its export control once per role space, not once globally.

## D-089 — Employer export gets a dedicated narrow application-process read RPC

**Status:** Accepted
**Accepted:** 2026-08-08
**Must accept before:** PR 8.3a

**Context:** D-077 requires the employer export to include narrow application process metadata (id/status/submitted_at/vacancy association), explicitly excluding `candidate_snapshot`, candidate name/email/profile fields, candidate Auth identity, `application_status_history.actor_user_id`, and operator/moderation reasons. Discovery at PR 8.3 implementation time found `applications` has no employer-scoped direct SELECT RLS policy (`applications_select_own` is candidate-owned only), and the existing employer-facing RPCs (`list_current_employer_applications`, `get_current_employer_application`) already return candidate-identifying/profile fields that D-077 forbids in bulk export. Filtering those broader RPC responses in TypeScript was rejected: the forbidden candidate information has already crossed the database→server read boundary by the time it reaches application code, which is exactly the privacy posture D-077/`docs/45` §5 already rejected for the equivalent per-application-view-vs-bulk-export distinction.

**Decision:** Add one dedicated narrow authenticated employer-export RPC, `list_current_employer_export_applications()`. Zero arguments; identity from `auth.uid()` only, no caller-supplied user/employer/candidate/vacancy id and no role parameter. Returns exactly `application_id uuid`, `vacancy_id uuid`, `status text`, `submitted_at timestamptz` — nothing else — for applications against the caller's own owned vacancies (`vacancies.employer_profile_id = auth.uid()`, `source = 'employer'`), ordered by `submitted_at` ascending then `application_id` ascending as a stable tiebreak. `vacancy_id` is included because the employer owns the vacancy and needs it to associate the process record with their own exported vacancy; the export builder computes any needed count from the result set, so no separate count RPC is added.

**Gating — an own-data read, not a business operation:** the RPC composes `_is_employer_deleted(uid)` only (deleted employer, including with a stale pre-delete JWT, gets zero rows — the employer's vacancies/applications are preserved per D-079, not withdrawn from the underlying tables, so this check is required, not redundant). It does **not** compose `_is_employer_suspended()`, current verification state, or onboarding completion. Suspension (D-072) blocks employer *business* operations for safety; it does not erase the employer's ability to obtain a copy of their own already-existing role-scoped data, and this decision treats that as a deliberate, narrow interpretation specific to export, not a reopening of D-072. Verification state (unverified/pending/verified/rejected/revoked) similarly controls publication/business eligibility, not data access. Onboarding completion is not composed either, though it has no observable effect either way: `create_employer_vacancy_draft` already requires `onboarding_completed_at is not null` before any vacancy can be created, so an incomplete employer structurally owns zero vacancies and this RPC returns zero rows for them regardless.

**Deleted-candidate applications:** a preserved application belonging to a deleted candidate (D-078) still returns as a process-metadata row — the recruitment-process fact ("an application at status X was submitted on date Y against vacancy Z") does not depend on the candidate's current identity/presentation state. `candidate_deleted` is deliberately not exposed by this RPC at all; that is presentation data (already handled by `list_current_employer_applications`/`get_current_employer_application` for ordinary review), not a process fact this narrow export projection needs. D-087's transition freeze is unrelated to this read projection.

**Security:** `SECURITY DEFINER`, fixed `search_path = pg_catalog, public`, no dynamic SQL. `REVOKE ALL` from `public`/`anon`/`service_role`; `GRANT EXECUTE` to `authenticated` only. No employer-scoped SELECT RLS policy is added to `applications` — this RPC is the sole new employer-export application-process boundary, exactly as narrow as D-077 requires.

**Alternatives:** widen `list_current_employer_applications`'s existing RETURNS shape and let the export builder select a subset of columns client-side (rejected — the candidate-identifying columns would still cross the database→server boundary inside the same query, which is the precise risk D-077/`docs/45` §5 already rejected for bulk candidate-snapshot exposure); add a general employer-scoped SELECT RLS policy on `applications` instead of a narrow RPC (rejected — RLS is row-scoped, not column-scoped, so it cannot itself exclude `candidate_snapshot`/`vacancy_snapshot` from a direct table read without either a restrictive view or widening what "employer-scoped" means for that table beyond this one narrow purpose; a single-purpose RPC keeps the boundary exact and auditable); compose `_is_employer_suspended()`/onboarding-completion/verification-state gates to mirror the ordinary business RPCs (rejected — export is a GDPR-adjacent own-data-access operation, and conflating it with business-eligibility gating would incorrectly deny a suspended or unverified employer their own data).

**Consequences:** PR 8.3a adds one additive migration (the 15th) containing only this RPC, its grants, and its comment — no table, column, index, RLS policy, trigger, or view. PR 8.3b's employer export builder calls this RPC as its sole applications data source, never `list_current_employer_applications`/`get_current_employer_application`.

## D-090 — Deletion processing lease and stranded-request recovery

**Status:** Accepted

**Accepted:** 2026-08-08

**Must accept before:** PR 8.4

**Context:** The merged PR 8.2 deletion contract's `_claim_deletion_request(uuid)` atomically claims only `pending`/`failed` requests. Implementation discovery during PR 8.4 found that an already-`processing` request returns `{"status":"no_op","current_status":"processing"}` and never `user_id`, and that `service_role` has, and retains, zero direct SELECT/INSERT/UPDATE/DELETE grant on `deletion_requests` (confirmed empirically: `SET ROLE service_role; SELECT ...` → `permission denied`). Consequently, if the privileged application process terminates after a successful claim but before either `_process_deletion_domain_scrub(...)` or `_record_deletion_failure(...)` runs, the request is permanently stranded at `status='processing'` with no existing RPC able to re-derive its persisted target `user_id`. This is incompatible with D-081's retryable/idempotent processing requirement — D-081's own "Failure handling" clause enumerates exactly two recoverable cases (step 4 Auth-delete failure; step 4 succeeds but step 6 evidence-write fails), neither of which covers a crash strictly between claim and any subsequent step ever running.

An initial proposal to base recovery directly on the existing `processing_started_at` column was reviewed and rejected: `processing_started_at` is set via `coalesce(processing_started_at, clock_timestamp())` at claim time specifically so it records the *first* processing attempt and is never reset on a failed-request retry claim. Basing staleness on it directly would incorrectly treat a legitimately-just-retried request as already stale merely because its original processing attempt happened long ago.

**Decision:** Add a dedicated `processing_lease_started_at timestamptz` column to `deletion_requests`, distinct from `processing_started_at`, representing the start of the *current* processing ownership period. `_claim_deletion_request(uuid)`'s argument/return contract is unchanged; every successful claim (fresh pending claim or failed-request retry claim) now also sets `processing_lease_started_at = clock_timestamp()`, while `processing_started_at` continues to preserve its existing first-processing-attempt semantics untouched. A new function, `_reclaim_stale_deletion_request(p_request_id uuid)` — request-id-only, never a caller-supplied user id, staleness interval, timeout, role, or email — reclaims a request only when `status = 'processing' AND processing_lease_started_at <= clock_timestamp() - interval '5 minutes'` (a fixed constant owned entirely by the database, not caller-selectable), in one atomic `UPDATE ... WHERE`, returning the persisted `user_id` on success. A `deletion_requests_processing_lease_chk` CHECK constraint (`status <> 'processing' OR processing_lease_started_at IS NOT NULL`) makes the invariant permanent going forward, audited safe against every code path that can transition a row into `processing`. Existing `processing` rows at migration time are backfilled (`processing_lease_started_at = processing_started_at`) so a pre-existing processing row becomes eventually reclaimable rather than permanently frozen by this migration itself.

**No automatic worker:** recovery remains explicitly invoked, never a scheduled sweep/cron/background worker. `_reclaim_stale_deletion_request` is reachable only from the privileged `reconcileAccountDeletionRequest(requestId)` reconciliation path (PR 8.4 application code); ordinary self-service `processAccountDeletionRequest(requestId)` never attempts stale recovery and keeps returning its existing generic `processing` result for an in-flight request, exactly as before this decision.

**Auth-evidence invariant preserved:** this decision does not modify `_record_deletion_auth_evidence()`. Implementation discovery found it trusts its privileged caller (its precondition is only `domain_scrubbed_at is not null`, not independent Auth-state verification) — confirmed empirically that calling it directly, without ever having called `deleteUser`, still marks a request `completed` with `auth_deleted_at` set while the real `auth.users.deleted_at` remains null. This caller-trust model remains acceptable exactly as before: only `service_role` has EXECUTE, and it is an application-level invariant (proved by PR 8.4's tests) that `reconcileAccountDeletionRequest` always independently re-verifies Auth deletion via `getUserById(...).deleted_at` before ever calling this RPC — evidence is never written merely because `domain_scrubbed_at` exists.

**Alternatives:** widen `_claim_deletion_request` itself to unconditionally accept `processing` (rejected — breaks single-writer semantics for a genuinely active, non-crashed request); add a separate new lease column distinct from `processing_started_at` under a different name/shape (considered and effectively what was adopted, distinguishing it explicitly from the rejected direct-`processing_started_at`-based proposal); an automatic background sweep/cron to detect and reconcile stale rows (rejected — reintroduces a scheduled worker, explicitly out of MVP scope); document permanently-stranded `processing` as an accepted MVP limitation (rejected — no Accepted decision authorized it, and D-081 requires retryability).

**Consequences:** PR 8.4 adds one additive migration (the 16th, `20260808220000_deletion_processing_lease_and_recovery.sql`) containing the new column, the CHECK constraint, the `_claim_deletion_request` lease-refresh update, and the new `_reclaim_stale_deletion_request` function with its grants/comment. No table, index, trigger, RLS policy, new deletion status, or new failure code is added. `reconcileAccountDeletionRequest`'s runtime gains a stale-reclaim branch, reachable only when `_claim_deletion_request` itself reports an already-`processing` row; `processAccountDeletionRequest`'s behavior is otherwise unchanged. pgTAP proves, among other properties, that a just-retried request whose historical `processing_started_at` is old is never treated as stale merely because of that — staleness is judged from the lease alone.

## D-092 — M5/Cohort A employer pricing: private-beta free policy

**Status:** Accepted

**Accepted:** 2026-08-13

**Context:** `docs/51-m5-operating-plan.md` §18 lists payments/payroll and subscriptions as explicit M5 non-goals, and the product has no payment/billing/subscription mechanism in this slice. No prior decision recorded whether employers are charged during Cohort A. `docs/54-cohort-a-employer-acquisition-playbook.md` §13 flagged this as an open founder decision blocking finalized outreach messaging (the "Do I need to pay?" objection, the discovery-call script's commercial-terms step, and the interested-employer response template).

**Decision:** During the current M5/Cohort A private beta, employer participation is free. Specifically:

- no subscription fee;
- no placement fee;
- no commission;
- no other paid employer service of any kind during Cohort A.

Candidate participation remains free, unchanged from existing practice.

This is a **private-beta commercial policy**, not a permanent pricing commitment. It does not establish, imply, or foreclose any future monetization model, price, subscription, commission, or fee structure. Future commercial/pricing terms for Klinnova beyond Cohort A are explicitly unresolved and remain a separate, later founder-gated decision.

**Approved external wording:**

> During the current Klinnova private beta, participation is free for employers. There are no subscription fees, placement fees, or commissions during this beta phase. Future commercial terms are not yet defined.

Do not say "Klinnova is free forever," "there will never be fees," or "all future services will be free" — none of those are approved; only the Cohort A private-beta scope above is decided.

**Alternatives:** charge a placement fee or commission during Cohort A (rejected — adds friction/complexity to a trust-building beta with only 3–5 employers, and no billing infrastructure exists to support it); leave pricing unstated/ambiguous in outreach (rejected — this was the prior status quo and was blocking finalized outreach messaging per `docs/54` §13); commit to permanent free pricing beyond the beta (rejected — forecloses a future monetization decision without evidence or need to decide it now).

**Consequences:** `docs/54-cohort-a-employer-acquisition-playbook.md`'s outreach templates, call script, and objection handling are updated to state this policy directly instead of deferring the question. This decision does not authorize, imply, or require any product/billing implementation work — no payment feature exists or is being built, and none is proposed by this decision.

**Acceptance note:** Accepted 2026-08-13 by repository owner (founder) as part of M5.1 Klinnova readiness coordination.

## D-093 — K6 Production/public-domain cutover decision lock

**Status:** Accepted

**Accepted:** 2026-08-21

**Must accept before:** K6 Production/public-domain cutover implementation

**Context:** K0-K5 Klinnova public-identity readiness, KDS, Unit I, merged
legal-surface work, and Production schema catch-up are complete enough for the
Founder to move K6 into the primary execution track. Current Production still
serves through `stint.company`; `klinnova.com` is the final intended public
identity established by K3/K4/K5; Production `NEXT_PUBLIC_SITE_URL` has not
been cut over; `src/lib/proof/local-environment-guard.ts` still lists only
`stint.company` / `www.stint.company` as Production application hosts.

**Decision:** Lock K6 as the current Production/public-domain cutover track to
canonical origin `https://klinnova.com`. K6-0/K6-1 are the current
decision/discovery unit. After PR #135 is merged and verified, K6-2 is
authorized to become the next implementation unit subject to its normal bounded
implementation approval.

`stint.company` and `www.stint.company` are retirement targets, not desired
final-state public domains. `preview.klinnova.com` is also a retirement target
as a custom public Klinnova host. Additive coexistence is allowed as a technical
safety phase during cutover, but must not be documented as the desired final
state. K6-5 will decide and execute the exact retirement mechanics after
`https://klinnova.com` is proven.

K6 must not rename internal Stint infrastructure identifiers, historical
documents, Supabase project names or refs, Vercel project name, Sentry
organization/project names, package name, repository name, migration history, or
Git history merely because the public domain changes.

The repository-side K6 implementation must include the `NEXT_PUBLIC_SITE_URL`
Production-origin flip and the `PRODUCTION_HOSTS` safety-guard update as one
coordinated change. `PRODUCTION_HOSTS` must include the Klinnova Production
hosts while retaining Stint Production hosts during coexistence, so local proof
guards continue to fail closed for every active Production hostname.

Unit H is closed for current launch sequencing by Founder decision. The current
merged legal surfaces are accepted provisionally for this launch path. The
Founder will review/correct legal wording in the nearest future. This is not a
qualified legal-review claim, not a complete legal-compliance claim, and not a
GDPR-compliance claim. Unit H must not block K6.

Cohort A intentionally launches without Production Sentry. Production Sentry
remains OFF/unwired by deliberate Founder decision. It is not an unresolved K6
blocker and must not be activated in K6.

Employer acquisition, candidate recruitment, founder-assisted onboarding,
support/moderation operating preparation, and other Cohort A operational work
are ON HOLD. They are not complete, they do not block K6, and their plans are
preserved for later resumption.

N1-N3 business transactional mail must not be falsely marked complete where
repository/hosted evidence says otherwise, but unresolved mail configuration
must not be treated as a generic blocker to beginning K6 repository/domain
cutover work. Any exact mail-domain/config dependency required for final
Production acceptance is a K6 execution dependency to handle at the correct K6
step.

K6 does not itself authorize N1-N3 Resend transactional-mail configuration,
auth-sender-domain migration away from `auth.stint.company`, legal drafting,
schema/RLS changes, product feature work, old-domain decommissioning before
K6-5, Preview rebuilding, Production Sentry activation, or Cohort A traffic.
Those remain independently gated unless a future authorization explicitly
includes them.

**Execution order:** K6 sequence is: K6-0 decision lock -> K6-1 exact
cutover discovery -> K6-2 repository Production-host conversion -> K6-3
hosted Production cutover -> K6-4 Production + Design acceptance -> K6-5 old
public-domain retirement -> K6-6 durable closure -> operational readiness
remains ON HOLD until Founder resumes it.

**Verification boundary:** K6 acceptance requires real Production verification
of canonical Klinnova serving, `www` behavior, retirement-target behavior for
old public domains/custom Preview host, signup confirmation, login/logout/
re-login, password recovery/reset, candidate journey, employer journey
including approved verification procedure and vacancy publication, application
review/outcome recording, account export, legal/support navigation,
metadata/favicon/Klinnova branding, stale user-visible Stint scan, Production
Sentry OFF/unwired, approved step-specific transactional-mail state, and no
Preview degradation. K6-4 must also verify the approved Production/design
baseline from PR #119, PR #120, PR #121, PR #122, PR #125, and PRs #126-#132 on
live `https://klinnova.com`. K6 completion still does not start Cohort A;
explicit Founder GO/NO-GO remains required afterward.

**Consequences:** `docs/55-k6-production-cutover-discovery.md` becomes the
durable K6 discovery/runbook source for the later implementation units. Current
documentation must classify K6 as decision locked and the primary execution
track, not blocked by Unit H, Production Sentry, or operational readiness. This
decision records no hosted mutation and authorizes no Production/Preview/DNS/
Vercel/Supabase/Resend/Sentry/domain change.
