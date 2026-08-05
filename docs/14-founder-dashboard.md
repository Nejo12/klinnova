# Founder Dashboard

Operating view for solo delivery. Update this file when the active slice changes or a milestone checkpoint is reached.

Product scope stays in `docs/04-mvp.md`. Delivery order stays in `docs/13-implementation-plan.md`. Ideas that are not current work go in `NOT_NOW.md`.

## Current focus

| Field | Value |
|-------|--------|
| Active milestone | M3 — Employer flow |
| Active slice | Slice 5 — Employer verification to public vacancy |
| Slice status | Active — D-055–D-067 Accepted; PR 5.1 Done; PR 5.2 Done; PR 5.3 employer verification UI Done; PR 5.3a operator read contract landed (database only, awaiting merge), operator UI still not built |
| Next unit | PR 5.3b — minimal operator list/detail + approve/reject UI on top of the PR 5.3a read RPCs; then PR 5.4 publish/lifecycle controls |
| Next slice | Slice 6 — Applicant review (**not started**) |
| Blockers | Preview has no Preview-scoped Supabase configuration (re-isolate before any Slice 5 hosted proof). Hosted Demo fixtures remain in Production until 2026-09-02. Operator UI still not built (PR 5.3b); the missing-read-RPC blocker itself is resolved by PR 5.3a. |

## Slice 4 delivery (complete)

| Artifact | Status |
|----------|--------|
| `docs/28-slice-4-discovery.md` | Locked — contracts Accepted 2026-08-03 |
| `docs/29-slice-4-build-plan.md` | Locked — PR 4.1–4.5 sequence complete |
| `docs/30-slice-4-schema-and-journey-proposal.md` | Locked — schema/routes/RLS Accepted |
| `docs/31-slice-4-exit-proof.md` | Done — local evidence via `pnpm proof:slice4` |
| `docs/32-slice-4-hosted-proof-runbook.md` | Done — Preview/disposable run executed 2026-08-04 |
| `docs/33-slice-4-closure.md` | Done — Slice 4 closed after hosted Preview/disposable proof |
| D-034 | Accepted — private vs organisation employers (product boundary) |
| D-046–D-054 | Accepted 2026-08-03; Slice 4 draft-path acceptance complete |
| PR 4.1 — employer identity/profile schema and RLS | Done (merged; PR #41) |
| PR 4.2 — employer registration and onboarding UI | Done (merged; PR #42) |
| PR 4.3 — draft vacancy schema, languages, RLS, RPCs | Done (merged; PR #43) |
| PR 4.4 — employer draft vacancy UI | Done (merged; PR #44) |
| PR 4.5 — local exit proof + hosted readiness | Done (merged; PR #45) |
| Local Slice 4 exit proof | Pass via `pnpm proof:slice4` |
| Hosted Slice 4 proof | Done — Preview + disposable `wbucxaquktraobrvknts` (deleted after proof) |
| Production authorization | Not used / not granted for Slice 4 hosted proof |
| Publication / verification | Accepted contracts (D-055–D-067); PR 5.2 database foundation in progress |
| Slice 5 | Active; PR 5.1 Done; PR 5.2 in progress |
| Slice 6 / Slice 7 / Slice 8 | Not started |

## Slice 5 delivery (active)

| Artifact | Status |
|----------|--------|
| `docs/34-slice-5-discovery.md` | Done — planning locked; D-055–D-067 Accepted |
| `docs/35-slice-5-build-plan.md` | Done — PR 5.1–5.7 sequence; 5.2 gated on 5.1 merge |
| `docs/36-slice-5-schema-and-publication-proposal.md` | Done — PR 5.2 schema contract locked |
| D-055–D-067 | **Accepted** 2026-08-05 |
| PR 5.1 — decision acceptance and schema contract | Done |
| PR 5.2 — schema / RLS / RPCs / pgTAP | Done (merged; PR #49) |
| PR 5.3 — employer verification request/status UI | Employer UI Done; operator UI **blocked** — no narrow read RPC for operator-membership check or pending-list (see `docs/35`) |
| PR 5.3a — operator verification read contract | Database contract landed (migration + 47 pgTAP assertions, full local suite 672 assertions / 26 files + generated types), awaiting merge; do not mark Done before merge. Resolves the PR 5.3 read-RPC blocker; operator UI itself is PR 5.3b (not started) |
| Vacancy lifecycle evidence | Narrow append-only `vacancy_lifecycle_events` selected per D-065 |
| Slice 5 implementation | In progress — database foundation done; employer verification UI done; publication UI not started |
| Preview isolated environment | Not configured |
| Production | Untouched for Slice 5 |
| Publication / verification approval UI (full admin) | Slice 7 (not started) |
| Applicant review | Slice 6 (not started) |

## Slice 3 delivery (complete)

| Artifact | Status |
|----------|--------|
| `docs/22-slice-3-discovery.md` | Locked — contracts Accepted 2026-08-03 |
| `docs/23-slice-3-build-plan.md` | Locked — PR 3.1–3.5 sequence complete |
| `docs/24-slice-3-schema-and-journey-proposal.md` | Locked — schema/journey contracts Accepted |
| `docs/25-slice-3-exit-proof.md` | Done — local automated proof (PR #37) |
| `docs/26-slice-3-hosted-proof-runbook.md` | Done — Production fallback executed 2026-08-03 |
| `docs/27-slice-3-closure.md` | Done — Slice 3 closed after hosted Production proof |
| D-035–D-045 | Accepted 2026-08-03; Slice 3 acceptance conditions complete |
| PR 3.1 — application schema, constraints, RLS, RPC | Done (merged; PR #33) |
| PR 3.2 — job-detail loader and candidate detail route | Done (merged; PR #34) |
| PR 3.3 — application preview and atomic submission | Done (merged; PR #35) |
| PR 3.4 — confirmation, Applied state | Done (merged; PR #36) |
| PR 3.5 — local exit proof + hosted-proof readiness | Done (merged; PR #37) |
| Owner-run hosted Production proof | Done — `https://stint.company`; project `kvrzmzoszitdicjvrprt`; Demo fixtures retained until 2026-09-02 |

## Slice 2 delivery (complete)

| Artifact | Status |
|----------|--------|
| `docs/18`–`docs/20` / D-026–D-033 | Locked / Accepted |
| PR 2.1 — Vacancy schema, RLS, local/CI fixtures | Done (merged; PR #26) |
| PR 2.2 — Pure matcher + server loader | Done (merged; PR #27) |
| PR 2.3 — `/candidate/matches` UI | Done (merged; PR #28) |
| PR 2.4 — Critical journey + hosted fixture procedure | Done (merged; PR #29) |
| Owner-run hosted Production proof | Done — `https://stint.company`; project `kvrzmzoszitdicjvrprt`; Demo fixtures retained until 2026-09-02 |
| `docs/21-slice-2-closure.md` | Done — Slice 2 closed after hosted Production proof |

## Slice 1 closure (complete)

| Checkpoint | Status |
|------------|--------|
| PR 1.1 — Candidate schema and RLS | Complete (merged) |
| PR 1.2 — Auth foundation | Complete (merged; PR #21) |
| PR 1.3 — Essential onboarding | Complete (merged; PR #22) |
| PR 1.4 — Completion gate and exit proof | Complete (merged; PR #23) |
| Hosted migration `20260801160000_complete_candidate_onboarding.sql` | Applied; no pending remote migrations |
| Local CI (Quality + Schema/RLS/Auth/onboarding/completion) | Confirmed green on PR #23 |
| Hosted production smoke (register → persist → complete → invalidate → resume → re-complete) | Confirmed by repository owner |
| No Slice 2 matching / jobs / applications / employer UI | Confirmed |
| D-018–D-025 | Accepted |

## Slice 0 closure (complete)

| Checkpoint | Status |
|------------|--------|
| PR 0.1 — App shell and toolchain | Complete (merged) |
| PR 0.2 — Design tokens and responsive shell | Complete (merged) |
| PR 0.3 — Environment validation and Supabase scaffolding | Complete (merged) |
| PR 0.4 — Tests, CI, and deployment | Complete (merged; PR #17) |
| CI green (lint, typecheck, unit tests, build, e2e) | Confirmed |
| Vercel Preview and Production | Confirmed working by repository owner |
| Registration / onboarding product behaviour | Complete (Slice 1) |

## Solo cadence

1. Keep **one** active slice.
2. Work until that slice’s exit criteria are met, or park a blocker note here.
3. Open PRs that leave `main` deployable.
4. After merge, update this dashboard before starting the next slice.
5. Put tempting extras in `NOT_NOW.md` instead of expanding the slice.

Suggested rhythm:

- **Daily:** advance the active slice; do not open a second slice
- **End of slice:** verify exit criteria, merge, update this file
- **Weekly:** answer the guiding questions below

## Guiding questions

Ask every week:

1. Can a Berlin candidate take one clearer step toward work than last week?
2. Is the active slice still the highest-leverage unfinished journey step?
3. Did anything land in the product that belongs in `NOT_NOW.md`?
4. Are trust, privacy, and authorization still intact on `main`?
5. What is the smallest demo I can show with seeded data?

## Pilot scoreboard

Fill during M5. Do not use these targets to justify pre-pilot feature expansion.

| Metric | Target | Current |
|--------|--------|---------|
| Participating employers | 20 | 0 |
| Verified vacancies | 100 | 0 |
| Candidates | 200 | 0 |
| Interviews | 10 | 0 |
| Confirmed hires | 3 | 0 |

## Slice board

| Slice | Outcome | Status |
|-------|---------|--------|
| 0 Foundation | Deployable shell + CI | Done — PR 0.1–0.4 merged; CI green; Production confirmed |
| 1 Onboarding | Register → persisted essentials | Done — PR 1.1–1.4 merged (#21–#23); hosted migration + production smoke confirmed; D-018–D-025 Accepted |
| 2 Matches | Essentials → seeded explainable matches | Done — PR 2.1–2.4 merged (#26–#29); hosted Production proof complete; Demo fixtures expire 2026-09-02 |
| 3 Apply | Job detail → submitted application | Done — PR 3.1–3.5 merged (#33–#37); local + Production hosted proof complete; D-035–D-045 complete; Demo fixtures expire 2026-09-02 |
| 4 Employer draft | Register → draft vacancy | Done — PR 4.1–4.5 merged (#41–#45); local + Preview/disposable hosted proof complete; publication not started |
| 5 Verification → public vacancy | Verified publish + lifecycle | Active — D-055–D-067 Accepted; PR 5.1 Done; PR 5.2 in progress |
| 5 Publish | Verification → public vacancy | Not started |
| 6 Review | Applicant review → status update | Not started |
| 7 Trust ops | Admin moderation → audit | Not started |
| 8 Deletion | Export/delete → confirmed removal | Not started |

## Decision discipline

Record product/architecture choices in `docs/10-decisions.md`. Do not invent resolutions when documents conflict — stop and report.
