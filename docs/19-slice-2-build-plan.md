# Slice 2 Build Plan

> Planning artifact locked to Accepted D-026–D-033 (2026-08-01). Discovery in `docs/18-slice-2-discovery.md`.
> No application code or migrations land in the planning PR.

**Outcome:** After essentials, a candidate sees deterministic, explainable matches against seeded Berlin vacancies (`docs/13-implementation-plan.md`).

**Schema / matching proposal:** `docs/20-slice-2-schema-and-matching-proposal.md`

**Tracking:** `docs/14-founder-dashboard.md`

**Decisions:** D-026–D-033 Accepted in `docs/10-decisions.md`

---

## Source of truth

| Doc | Role |
|-----|------|
| `docs/04-mvp.md` | Matching v1 criteria; exclusions |
| `docs/05-features.md` | Job discovery UX (narrowed — D-032) |
| `docs/07-architecture.md` | Deterministic matching; no vector DB |
| `docs/08-non-functional.md` | Privacy, a11y, performance |
| `docs/12-terminology.md` | job / vacancy / match |
| `docs/13-implementation-plan.md` | Exit criteria + Accepted narrowings |
| `docs/18-slice-2-discovery.md` | T1–T5 resolutions |
| `docs/20-slice-2-schema-and-matching-proposal.md` | Tables, RLS, rules |
| `docs/10-decisions.md` | D-012, D-020, D-025; D-026–D-033 Accepted |
| `NOT_NOW.md` | Do not implement |

---

## Intentional narrowings (Accepted)

| Broader doc statement | Slice 2 boundary |
|-----------------------|------------------|
| Match includes experience | No experience fields, eligibility, ordering, explanation, or display-only pseudo-requirement (D-027) |
| Travel radius matching | Berlin hard filter only; travel unused for eligibility/ordering/reasons/claims (D-030) |
| Full job detail + apply | `/candidate/matches` only; no detail/apply/save (D-032) |
| Verified employer workflow | Fictional seed companies; no Auth; no verification claim (D-026) |
| Weighted opaque scores | Pure TS filters + deterministic sort; no scores (D-028) |
| Auto-seed Production via migrations | Forbidden; owner-controlled demo ops only (D-031) |

---

## Explicit exclusions

- Applications, save/unsave, CV
- Job detail route; employer contact; disabled future-action buttons
- Employer registration / verification UI
- Admin moderation
- Public SEO job board
- Scraping / ingestion adapters
- Vector search / AI-branded matching
- Multi-city; PostGIS / coordinates
- Candidate experience onboarding
- Salary fields; `english_ok`; `salary_display`
- Automatic Production business-data insertion via schema migrations
- Temporary diagnostic / public match endpoints
- Persisted matches table
- Service-role in browser or ordinary SSR sessions
- `NOT_NOW.md` items

---

## Exit criteria (Slice 2)

From `docs/13`, operationalised:

1. A completed candidate reaches `/candidate/matches` with **relevant seeded/demo jobs** without re-entering essentials.
2. Each shown match includes up to four plain-language explanations from the closed reason union.
3. No numeric opaque match score.
4. Incomplete candidates cannot access matches (resume onboarding); rejected before vacancy load.
5. Empty state when no vacancy passes filters.
6. Local CI proves schema/RLS + matching rules + critical Playwright journey.
7. Hosted demo fixtures applied only via owner-controlled procedure (Preview optional; Production never via schema migration); owner smoke on Auth-capable hosted environment.
8. No applications, detail routes, or employer product surfaces.

**Time target (“under three minutes”):** Measured for an already-registered completed candidate opening matches after login — not including first-time email confirmation latency.

---

## Proposed PR sequence (four)

```text
PR 2.1 Vacancy schema + RLS + local/CI fixtures
  -> PR 2.2 Pure matcher + authenticated server loader
    -> PR 2.3 /candidate/matches UI + gate routing
      -> PR 2.4 Critical journey + hosted fixture procedure + closure
```

| PR | Single review concern | Deployable alone? |
|----|----------------------|-------------------|
| 2.1 | Data model + RLS + deterministic local/CI fixtures | Yes — no candidate UI change required |
| 2.2 | Deterministic matching correctness | Yes — unit + server loader; no public diagnostic endpoint |
| 2.3 | Candidate matches UX | Yes — `/candidate/matches` only |
| 2.4 | Exit proof + hosted procedure + docs | Yes — closes Slice 2 |

D-026–D-033 are Accepted; implementation may open after this planning package merges.

---

## PR 2.1 — Vacancy schema, RLS, local/CI fixtures

**Status:** Done (merged; PR #26).

**Intent:** Land approved tables, policies, and deterministic local/CI fixtures.

**Includes:** Migrations for `companies`, `vacancies`, `vacancy_language_requirements`; CHECKs per `docs/20` / D-025 / D-029; RLS per D-033; local seed tooling + CI reset fixtures; pgTAP; generated types.

**Excludes:** Matching UI; matcher application logic; employer Auth; automatic Production/Preview business-data insertion through schema migrations.

**Depends on:** D-026, D-029, D-031, D-033 Accepted (done).

**Acceptance:** Active published unexpired seeds selectable only by completed authenticated candidates under RLS; anon denied; constraints reject invalid allow-list / lifecycle values; Production migrations contain no automatic demo inventory.

---

## PR 2.2 — Pure matcher and authenticated server loader

**Status:** Done (merged; PR #27).

**Intent:** Pure deterministic matcher + authenticated server loader returning vacancies + explanation codes.

**Includes:** `src/lib/matching/*` pure functions (no fetch); authenticated server loader (session identity only); proficiency/German ordinals; unit tests; reject incomplete before vacancy load.

**Excludes:** Polished UI; applications; temporary diagnostic/public endpoints; persisted matches; numeric scores.

**Depends on:** PR 2.1; D-027, D-028, D-030 Accepted (done).

**Acceptance:** Fixture matrix covers match, non-match, shift-flexible, language zero-rows, explanation codes and ordering; no scores; no browser-supplied candidate UUID.

---

## PR 2.3 — `/candidate/matches` UI and routing

**Status:** In progress (branch `feat/slice-2-pr-2.3-candidate-matches-ui`). Not complete until merge.

**Intent:** Completed candidates see matches; incomplete resume onboarding.

**Includes:** `/candidate/matches` only; empty state; ≤4 prioritized explanations; page-level work-authorisation copy; factual Berlin location; redirect from `/candidate` when complete; accessible SCSS Modules UI.

**Excludes:** Detail route; apply; save; employer contact; disabled future-action buttons; travel-fit claims; legal badge on every card.

**Depends on:** PR 2.2; D-032 Accepted (done).

**Acceptance:** Complete → matches; incomplete → onboarding; explanations visible; Demo vacancy labelling where demo fixtures shown; no match scores; no employer UI.

---

## PR 2.4 — Critical journey, hosted fixture procedure, closure

**Intent:** Prove Slice 2 exit locally and on hosted environments.

**Includes:** Playwright completed-candidate → matches; incomplete blocked; documented owner-controlled Preview/Production demo fixture procedure; hosted smoke notes; docs/dashboard update only when criteria met.

**Excludes:** Slice 3 apply/detail flow; automatic Production seed migrations.

**Depends on:** PR 2.3.

**Acceptance:** Exit criteria met; CI green; owner hosted smoke; Slice 2 checklist complete.

---

## Testing layers

| Layer | PR | Focus |
|-------|-----|--------|
| Schema / RLS | 2.1 | Constraints; lifecycle/expiry; completed vs incomplete; anon deny |
| Unit | 2.2 | Matching matrix; shift-flexible; explanations; ordering |
| Component | 2.3 | Matches list, empty state, a11y, reason cap |
| Playwright | 2.4 | Complete → matches; incomplete blocked |

---

## Decision gates

| Before | Decisions |
|--------|-----------|
| PR 2.1 | D-026, D-029, D-031, D-033 Accepted |
| PR 2.2 | D-027, D-028, D-030 Accepted |
| PR 2.3 | D-032 Accepted |
| PR 2.4 | Exit proof only |

All of the above decisions are Accepted as of 2026-08-01.

---

## Environment notes

- Local: CLI Supabase + deterministic fictional seed tooling.
- CI: deterministic fixtures in reset/test setup.
- Preview: optional explicit owner-applied demo set.
- Production: explicit owner-controlled demo-data operation only; never via schema migrations.
- No service-role in candidate browser/ordinary SSR path.
- Demo records: fictional, labelled Demo vacancy, `source = seed`, expiring/removable, no real company names, no verified-employer claim.

---

## Slice 2 close checklist

- [x] D-026–D-033 Accepted
- [ ] PR 2.1 merged (schema/RLS/local-CI fixtures)
- [ ] PRs 2.2–2.4 merged
- [ ] Exit criteria on Auth-capable hosted environment
- [ ] RLS + matching tests + critical journey green
- [ ] Hosted demo fixture procedure documented and used (not migration auto-seed)
- [ ] No applications / detail routes / employer features / `NOT_NOW.md` items shipped
- [ ] Dashboard: Slice 2 Done → Slice 3 planning

Update the checklist and founder dashboard to Done only after true exit proof.
