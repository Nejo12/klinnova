# Slice 2 Discovery

> Analysis artifact only. No migrations or application code land here.
> **Status:** Architecture review applied (2026-08-01). Branch `docs/slice-2-discovery-decisions`.
> Implementation may begin only after this package is merged and PR 2.1 opens against Accepted D-026–D-033.

**Outcome to enable:** After completing essential onboarding, a candidate sees deterministic, explainable matches against seeded Berlin vacancies (`docs/13-implementation-plan.md`).

**Related:**

- Build plan — `docs/19-slice-2-build-plan.md`
- Schema + matching proposal — `docs/20-slice-2-schema-and-matching-proposal.md`
- Decisions — D-026–D-033 in `docs/10-decisions.md` (**Accepted**)

---

## Verified baseline (do not re-litigate)

| Fact | Evidence |
|------|----------|
| Slice 0–1 complete | `docs/14-founder-dashboard.md` |
| Candidate essentials + completion gate on `main` | PR #21–#23 |
| Hosted completion migration applied | `20260801160000` remote; no pending migrations |
| No jobs, matching, applications, employers, or vacancy schema | Schema / app inventory |
| Matching v1 is deterministic and explainable | D-012; `docs/04-mvp.md` |
| `onboarding_completed_at` is the Slice 2 gate | D-020 |
| Allow-lists for categories, employment, shifts, languages, German comfort, travel minutes | D-025 |
| Experience, phone, CV deferred from Slice 1 | `docs/17` deferred list |
| Shared `profiles` + employer tables deferred until employer role | D-019 |
| Complex recommendation / vector search deferred | `NOT_NOW.md` |

---

## Document tensions — resolved

When product docs conflicted, AGENTS.md required reporting. Architecture review resolved T1–T5 via Accepted D-026–D-033. Implementation must follow the Accepted decisions; broader MVP wording remains future intent where explicitly narrowed.

### T1 — Experience in matching — Resolved (D-027)

| Source | Said |
|--------|------|
| `docs/13` / `docs/04` / `docs/07` | Match includes experience |
| Slice 1 | Candidate experience not collected |

**Resolution:** Slice 2 has no experience fields, no experience eligibility, no experience ordering, no experience explanation, and no display-only pseudo-requirement. Experience matching remains later MVP intent after experience is collected.

### T2 — Travel radius without geography — Resolved (D-030)

| Source | Said |
|--------|------|
| Candidate model | Berlin + travel minutes; no coordinates |
| Matching docs | “location or travel radius” |

**Resolution:** Hard location filter is Berlin-only. Travel minutes are unused for eligibility, ordering, reasons, and match claims. No “within your travel preference” wording. Factual Berlin location may be displayed.

### T3 — Employer verification vs seeded vacancies — Resolved (D-026, D-031)

| Source | Said |
|--------|------|
| MVP / terminology | Verified employer / verified job |
| Slice 2 | Need vacancies before employers exist |

**Resolution:** Minimal `companies` + `vacancies` with `source = seed`. Fictional/demo companies only; no fake employer Auth; no verification claim. Environment-specific demo fixture rules in D-031 (no automatic Production business-data insertion via schema migrations).

### T4 — Job card richness vs Slice 2 vs Slice 3 — Resolved (D-032)

| Source | Said |
|--------|------|
| `docs/05` | Rich job discovery |
| Slice 3 | Detail, apply, save |

**Resolution:** Slice 2 owns only `/candidate/matches`. No detail route, apply, save, employer contact, or disabled future-action buttons. Cards show structured fields + match reasons sufficient to understand fit.

### T5 — Weighted ranking vs no opaque scores — Resolved (D-028)

| Source | Said |
|--------|------|
| `docs/07` | Weighted ranking |
| Exit / D-012 | Explainable; no opaque scores |

**Resolution:** Pure server-side TypeScript hard filters + deterministic sort (`published_at DESC`, `title ASC`, `id ASC`). No numeric scores. Explanations from the same rules as eligibility.

---

## Matching inputs available from Slice 1

| Input | Candidate field | Usable in Slice 2? |
|-------|-----------------|--------------------|
| Job category | `job_categories[]` | Yes — hard overlap with vacancy primary `job_category` |
| Languages | `candidate_languages` | Yes — vs `vacancy_language_requirements` |
| German comfort | `german_comfort` | Yes — vs vacancy `german_requirement` (aligned vocabulary) |
| Work authorisation | `work_authorisation_declared` (+ completion gate) | Gate only — not a match reason |
| Location | `city` | Yes — Berlin hard filter |
| Travel minutes | `travel_radius_minutes` | **No** — unused (D-030) |
| Availability | `available_from` | Yes — vs vacancy `available_from` |
| Employment types | `employment_types[]` | Yes — hard overlap |
| Shift preferences | `shift_preferences[]` | Yes — flexible / concrete overlap (see `docs/20`) |
| Experience | — | **No** (D-027) |

Gate: matches only when authenticated session owns a `candidate_profiles` row with `onboarding_completed_at IS NOT NULL`.

---

## Explicit non-goals for Slice 2

Do not implement:

- Applications, save/unsave, CV upload
- Job detail route; employer contact; disabled future-action buttons
- Employer registration, company editing UI, verification queue
- Admin moderation UI
- Public anonymous job board SEO pages
- Vector search, ML ranking, “AI matches” / perfect-match copy
- Scraping / external job ingestion adapters
- Multi-city; coordinates; travel-minute distance
- Candidate experience collection or display-only experience text
- Salary fields
- Automatic Production business-data seeding via schema migrations
- Temporary diagnostic or public match endpoints
- Persisted match tables
- Service-role browser/ordinary SSR session paths
- Items in `NOT_NOW.md`

---

## Accepted decision map

| # | Topic | Decision |
|---|-------|----------|
| 1 | Vacancy ownership without employers | D-026 Accepted |
| 2 | Experience | D-027 Accepted — excluded |
| 3 | Matching engine | D-028 Accepted — pure TS + server loader |
| 4 | German / languages | D-029 Accepted — aligned vocabulary |
| 5 | Location / travel | D-030 Accepted — Berlin only |
| 6 | Seed / demo environments | D-031 Accepted |
| 7 | Matches UI depth | D-032 Accepted — `/candidate/matches` only |
| 8 | Vacancy read RLS | D-033 Accepted |

---

## Acceptance order (complete for planning)

1. ~~Review discovery + schema/matching proposal~~ — architecture review done.
2. ~~Accept D-026–D-033~~ — Accepted 2026-08-01.
3. Merge this planning package.
4. Open implementation PRs per `docs/19` (schema first).

---

## Stop rule

If implementation would diverge from Accepted D-026–D-033 or reintroduce T1–T5 conflicts without a new decision, stop and revise decisions — do not implement around the conflict.
