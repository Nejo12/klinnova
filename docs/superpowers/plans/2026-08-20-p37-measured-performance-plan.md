# P3.7 - Measured Performance Improvement Plan

**Status:** Discovery and implementation plan only. No product code, schema, RPC, CI, or build-tooling changes were made.

**Base:** `c42aa7460ca28801a9872d9e09497b89461372d6` (`origin/main`, P3.6 merge)

**Branch:** `feat/p37-measured-performance-discovery`

**Related plans:**

- `docs/superpowers/plans/2026-08-19-p35-loading-transition-performance-discovery.md`
- `docs/superpowers/plans/2026-08-19-p36-loading-transition-ux.md`

## 1. Executive Summary

P3.6 closed the perceived-performance layer identified by P3.5: authenticated routes now have `loading.tsx` skeletons, shared skeleton primitives exist, and the employer application status controls no longer rely on disabled-only pending states. P3.7 should not revisit that UX layer.

The remaining performance opportunities are actual data-loading and server critical-path issues. Fresh current-main measurements show all six measured routes are locally fast in absolute terms, but the relative shape still matches P3.5: employer application detail remains the slowest measured route, and the code still has independent post-gate awaits executed serially.

Recommended first implementation slice: **P3.7-A1, employer application detail post-gate parallelization**. It is narrow, measurable, avoids schema/RPC churn, preserves authorization and redirect ordering, and targets the highest measured route without touching product behavior.

## 2. P3.5 Reconciliation

| P3.5 finding | Current-main status | P3.7 treatment |
| --- | --- | --- |
| No `loading.tsx`, no skeleton primitives, no Suspense boundaries | Obsolete after P3.6. Route loading files and shared skeleton primitives now exist. | Do not revisit in P3.7. |
| Employer status actions used disabled-only pending feedback | Obsolete after P3.6. Pending labels and `aria-busy` are covered by tests. | Do not revisit in P3.7. |
| Employer application detail was the measured route outlier | Still directionally true. Fresh current-main baseline again has employer application detail as the highest median total and server time. | First implementation target. |
| Sequential independent awaits after route gates | Still true across employer routes and some candidate routes. | P3.7-A sequence, starting with the narrowest route. |
| Employer vacancy readiness N+1 | Still true in `loadEmployerDrafts`; the file still documents the missing bulk readiness interface. | Separate P3.7-B because it may require data-access/RPC design. |
| No shared `/candidate` or `/employer` layouts | Still true. | Separate P3.7-C because it is structural and broader than a one-route optimization. |
| Candidate application submit awaits employer notification email | Still true, fail-soft but in the redirect critical path. | Separate P3.7-D after behavior/operational guarantees are clarified. |
| Broad `force-dynamic` rendering | Still true across authenticated routes. | Separate P3.7-E; do not weaken auth/privacy behavior casually. |

## 3. Fresh Baseline Method

Measurement used the current merged `origin/main` SHA above.

- Local Supabase was reset before measurement.
- A production bundle was built with the documented local fallback: `next build --webpack`.
- The app was served with repository-standard production start behavior.
- Playwright Chromium measured real navigations against local Supabase fixtures created through existing e2e helpers.
- Five samples were captured per route using `PerformanceNavigationTiming`.
- `serverMs` = `responseStart - requestStart`.
- `totalMs` = `loadEventEnd - startTime`.
- `domToLoadMs` = `loadEventEnd - domContentLoadedEventEnd`.
- The temporary measurement spec was deleted after use.
- Local Supabase was reset again after measurement.

The default local Turbopack build is a known local tooling issue on this machine and was previously reproduced on clean `origin/main`; these P3.7 measurements intentionally used the same successful webpack production-build path used to classify that issue.

## 4. Fresh Baseline Results

| Route | Median serverMs | Median totalMs | Total min/max | Notes |
| --- | ---: | ---: | ---: | --- |
| Employer application detail | 10.3 | 82.2 | 72.5 / 106.5 | Highest median server and total time. |
| Employer applications list | 6.7 | 62.3 | 59.3 / 63.6 | Stable, still has independent post-load awaits. |
| Employer vacancies list | 6.4 | 60.7 | 60.0 / 63.2 | Stable, but hides readiness N+1 risk at small fixture size. |
| Employer home | 6.7 | 62.5 | 55.4 / 71.1 | Stable, has repeated capabilities/unseen/drafts loading. |
| Candidate application detail | 6.3 | 55.1 | 54.5 / 100.6 | One total-time outlier, not a server-time outlier. |
| Candidate applications list | 5.5 | 53.0 | 48.8 / 53.6 | Fastest measured route. |

Raw samples:

| Route | serverMs samples | totalMs samples | domToLoadMs samples |
| --- | --- | --- | --- |
| Employer application detail | 10.3, 7.9, 24.1, 9.7, 10.8 | 86.6, 72.5, 106.5, 82.2, 77.2 | 0, 0.1, 0.2, 0.3, 0.4 |
| Employer applications list | 7.3, 6.7, 8.8, 6.7, 6.4 | 62.9, 63.6, 61.3, 59.3, 62.3 | 0.3, 0.2, 0.2, 0.2, 0.4 |
| Employer vacancies list | 6.4, 6.4, 6.5, 6.5, 6.2 | 60.0, 61.6, 60.7, 60.1, 63.2 | 0.1, 0.2, 0.1, 0.3, 0.2 |
| Employer home | 6.7, 6.0, 7.1, 6.1, 6.8 | 62.5, 55.4, 65.1, 60.4, 71.1 | 0.2, 0.3, 0.2, 0.1, 0.2 |
| Candidate application detail | 6.7, 6.3, 6.2, 5.6, 6.8 | 54.5, 55.1, 100.6, 55.7, 54.6 | 0.3, 0.3, 0, 0.3, 0.1 |
| Candidate applications list | 5.4, 5.5, 5.6, 5.5, 6.2 | 53.0, 53.6, 48.8, 49.1, 53.0 | 0.2, 0.3, 0.3, 0.2, 0.2 |

Interpretation:

- Current-main local absolute timings are lower than the P3.5 numbers. Treat the new table as the authoritative P3.7 baseline for this branch.
- The route ranking still points to employer application detail first.
- `domToLoadMs` is negligible across the table, so the first P3.7 work should target server/data sequencing, not client rendering.
- Candidate application detail had one total-time outlier without a matching server-time outlier; do not treat it as the first server optimization target.

## 5. Data-Load Inventory

| Surface | Current shape | Dependency assessment | P3.7 classification |
| --- | --- | --- | --- |
| `src/app/employer/applications/[applicationId]/page.tsx` | Suspension status, then application ownership/detail, then mark seen, capabilities, unseen count, and outcomes serially. | Suspension and application load are gates. After the application is authorized and loaded, the remaining reads/side effect are independent. | **P3.7-A1 first target.** |
| `src/app/employer/applications/page.tsx` | Suspension gate, applications load, then capabilities and unseen count serially. | Capabilities and unseen count are independent after successful applications load. | P3.7-A follow-up. |
| `src/app/employer/vacancies/page.tsx` | Draft list load, then capabilities, unseen count, and suspension status serially. | Header/status reads are independent after draft loader resolves. Draft readiness N+1 remains inside the loader. | P3.7-A for serial awaits; P3.7-B for readiness. |
| `src/app/employer/page.tsx` | Employer profile/view gate, then capabilities, unseen count, and drafts serially. | Post-view reads are independent; drafts loader contains readiness N+1. | P3.7-A follow-up, with P3.7-B dependency for full gain. |
| `src/app/employer/vacancies/[vacancyId]/page.tsx` | Vacancy ownership/detail gate, then capabilities, unseen count, and suspension status serially. | Post-gate reads are independent. | P3.7-A follow-up. |
| `src/app/employer/vacancies/[vacancyId]/edit/page.tsx` | Draft gate, then capabilities and unseen count serially. | Post-gate reads are independent. | P3.7-A follow-up. |
| `src/app/employer/vacancies/new/page.tsx` | Completed-employer gate, then capabilities and unseen count serially. | Post-gate reads are independent. | P3.7-A follow-up. |
| `src/app/employer/verification/page.tsx` | Profile/view gate, then capabilities, unseen count, and suspension status serially. | Post-view reads are independent. | P3.7-A follow-up. |
| `src/app/candidate/applications/[applicationId]/page.tsx` | Confirmation/view gate, then capabilities, history, and outcomes serially on ready view. | Some reads can run together after ready view, but history controls failure rendering while outcomes are fail-soft. | Later P3.7-A, after employer path. |
| `src/app/candidate/applications/page.tsx` | Inventory/load-and-resolve first, then capabilities. | Possible overlap exists but redirect/view semantics are clearer if left gated. | Lower priority. |
| `src/app/candidate/matches/page.tsx` | Primary match loader/view resolution first, then capabilities. | Same as candidate applications list. | Lower priority. |
| `src/app/candidate/jobs/[vacancyId]/page.tsx` | Vacancy detail/view resolution first, then capabilities. | Same as candidate applications list. | Lower priority. |
| `src/app/candidate/jobs/[vacancyId]/actions.ts` | Candidate application RPC, then awaited employer-notification email before redirect. | Email failure is fail-soft, but awaiting it still lengthens success redirect when a recipient exists. | P3.7-D, separate behavior/operations decision. |
| `src/lib/employer/vacancies/load-employer-drafts.ts` | One readiness RPC per draft row. | Real N+1. Application-level `Promise.all` would reduce wall time but preserve/increase DB concurrency; a real fix likely needs a bulk readiness contract. | P3.7-B, not bundled with A1. |

## 6. Ranked Candidates

1. **P3.7-A1: employer application detail post-gate parallelization.** Highest measured route, narrowest safe change, no schema/RPC/build changes.
2. **P3.7-A2: remaining employer post-gate independent awaits.** Same pattern across employer list/detail/home routes, but broader blast radius.
3. **P3.7-B: employer vacancy readiness N+1.** Potentially high value as data grows, but needs data-access contract design.
4. **P3.7-C: repeated cross-navigation auth/capability/unseen-count loads.** Structural, probably layout/dedupe work, and should wait until route-level behavior is fully understood.
5. **P3.7-D: candidate application notification critical path.** Potential UX gain on successful apply, but requires a clear reliability model for employer notifications.
6. **P3.7-E: dynamic rendering/caching audit.** Potentially large, but high privacy/auth risk if done casually.

## 7. Recommended First Slice: P3.7-A1

Target file:

- `src/app/employer/applications/[applicationId]/page.tsx`

Implementation intent:

- Preserve `loadCurrentEmployerSuspensionStatus` before applicant/application access.
- Preserve `loadEmployerApplication` before unavailable handling, redirects, or any application-specific side effect.
- After `loadEmployerApplication` succeeds, parallelize only the independent post-gate work:
  - `markEmployerApplicationSeen`
  - `loadAccountCapabilities`
  - `loadUnseenApplicationsCount`
  - `loadEmployerApplicationOutcomes`
- Preserve the current fail-soft behavior of `markEmployerApplicationSeen`: log a warning if it fails, but do not fail the page.
- Preserve the current fail-soft behavior of outcomes loading if that is the existing contract in the page/component.
- Do not change copy, UI state, authorization, RLS assumptions, route paths, schema, RPC definitions, or CI.

Suggested implementation shape:

- Create the post-gate promises after the application has loaded.
- Wrap the mark-seen promise with its existing `try`/`catch` semantics so it cannot reject the aggregate load.
- Use `Promise.all` for the data needed to render once fail-soft promises are guarded.
- Keep redirects and unavailable rendering in the same order as today.

Acceptance criteria:

- The employer application detail page renders identical states for authorized, suspended, unavailable, and successful application views.
- Existing page-level and e2e coverage still passes.
- A before/after Playwright measurement using the same harness shows no regression and preferably improves median `serverMs` or `totalMs` for employer application detail.
- No other P3.7 candidate is implemented in the same commit.

## 8. Validation Strategy For P3.7-A1

Run before implementation:

- Capture current branch baseline for employer application detail with at least five samples.

Run after implementation:

- `git diff --check`
- Prettier on changed files.
- `pnpm lint`
- `pnpm typecheck`
- Relevant employer application page/component tests.
- Relevant P3.6/P3.7 e2e route journey for employer application detail.
- Production build using the repository-standard CI command when available in CI; local webpack fallback may be used only to classify the known Turbopack-local issue, not as a CI substitute.
- Repeat the same five-sample employer application detail measurement and compare with the saved baseline.

Broaden validation only if the implementation touches shared loaders/components or changes behavior beyond the single route.

## 9. Deferred Slice Notes

### P3.7-A2 - Other Independent Awaits

After A1 proves the pattern, apply the same post-gate parallelization discipline to employer applications list, vacancies list/detail/edit/new, employer home, and verification. Candidate routes can follow, but they should be handled after employer routes because their redirect/failure semantics are less uniform and their measured server times are lower.

### P3.7-B - Vacancy Readiness N+1

`loadEmployerDrafts` explicitly calls `employer_vacancy_draft_readiness` once per draft row. A true fix should avoid preserving N+1 load under a parallel wrapper. Investigate either:

- a bulk readiness RPC, or
- a loader/query shape that returns readiness inputs and computes missing checklist data in one bounded server operation.

This needs separate schema/RPC review and should not be bundled with A1.

### P3.7-C - Cross-Navigation Repeated Loads

No shared `/candidate` or `/employer` layout exists. Capabilities, unseen-count, profile, and header data are reloaded per page. A shared-layout or request-deduping strategy could reduce repeated work, but it changes routing architecture and should be scoped separately with UI/loading-state verification.

### P3.7-D - Candidate Application Notification Critical Path

`submitCandidateApplicationAction` awaits `notifyEmployerOfNewApplication` after a successful application RPC and before redirect. Failure is caught/logged, so the user success path is not functionally blocked by email failure, but successful email delivery can still add latency. Before changing this, decide whether notification delivery must be completed before the candidate sees confirmation or can be queued/deferred.

### P3.7-E - Dynamic Rendering And Caching

Authenticated routes broadly use `export const dynamic = "force-dynamic"`. Any caching change must be privacy-first and prove that candidate documents, employer-only application data, roles, and account state cannot leak across users. This is high leverage but not a first slice.

## 10. Risks And Rollback

- Parallelization can accidentally move authorization or redirect checks earlier/later. Keep gates serial and only parallelize after authorization has been established.
- `Promise.all` can change failure behavior if fail-soft calls are not guarded. Preserve existing fail-soft contracts before aggregation.
- N+1 remediation may reduce wall time while increasing database concurrency if implemented with unbounded parallel per-row RPCs. Avoid that as the durable fix.
- Caching/dynamic-rendering changes are privacy-sensitive. Require explicit threat review before implementation.

Rollback for P3.7-A1 should be a simple revert of one route-file commit if measurement or behavior regresses.

## 11. Founder Decisions

No Founder product decision is required for P3.7-A1 because it preserves behavior and only changes independent post-gate scheduling.

Founder or technical decision is required before:

- introducing a bulk readiness RPC or changing vacancy readiness contracts;
- adding shared candidate/employer layouts;
- deferring or queueing employer notification emails;
- relaxing `force-dynamic` on authenticated routes.

## 12. Discovery Validation

This discovery pass intentionally changed only this plan document. During discovery:

- `origin/main` was reconciled to `c42aa7460ca28801a9872d9e09497b89461372d6`.
- Local Supabase was reset before and after measurement.
- The temporary Playwright measurement spec was deleted.
- No product, schema, RPC, CI, or build-tooling files were modified.
- No P3.7 implementation work was performed.

## 13. Implementation Records

### P3.7-A1 - Employer Application Detail Parallelization

PR #127 remains an open draft and unmerged. The implementation was technically valid, but local before/after measurement classified it as **C. NO MATERIAL CHANGE**:

| State | Median serverMs | Median totalMs |
| --- | ---: | ---: |
| Before | 6.9 | 76.3 |
| After | 8.3 | 75.0 |

Do not continue mechanically into broad P3.7-A2 `Promise.all` conversions from that result.

### P3.7-B - Vacancy Readiness N+1

Current behavior was confirmed in `loadEmployerDrafts`: the loader first fetches owned employer vacancy rows, then calls `employer_vacancy_draft_readiness` once for each row whose `publication_state` is `draft`. The route consumers are `/employer/vacancies` and `/employer`; rendered readiness state is derived from `ready` plus the mapped missing-field checklist.

Instrumented loader proof before implementation:

| Draft count | Readiness RPC calls | Instrumented loaderMs |
| ---: | ---: | ---: |
| 1 | 1 | 2.2 |
| 5 | 5 | 6.2 |
| 10 | 10 | 11.2 |
| 20 | 20 | 23.3 |

Selected solution: an additive, set-based bulk RPC, `employer_vacancy_drafts_readiness(uuid[])`, with the same SQL-owned readiness rules as the single-vacancy RPC. Unauthorized requested IDs are omitted rather than surfaced, so cross-employer vacancy existence/readiness does not leak. Duplicate IDs collapse deterministically to one result row ordered by first input occurrence. Empty input returns no rows.

Instrumented loader proof after implementation:

| Draft count | Readiness RPC calls | Instrumented loaderMs |
| ---: | ---: | ---: |
| 1 | 1 | 2.4 |
| 5 | 1 | 1.7 |
| 10 | 1 | 1.8 |
| 20 | 1 | 1.4 |

The primary P3.7-B result is structural: readiness loading changes from O(N) client/database RPC calls to one bounded bulk readiness operation for the draft IDs already authorized by `loadEmployerDrafts`. Database tests prove readiness equivalence with the existing single RPC for controlled incomplete and complete drafts, empty-input behavior, duplicate-ID behavior, caller ownership, and non-leakage for another employer's vacancy.

### P3.7-C - Cross-Navigation Authenticated Data Loading Discovery

Discovery base: `origin/main` at `55e5f3067b30e81c2a9c207d052eaff9af4bb757`, the merge commit for PR #128 (`perf(p37): remove vacancy readiness n+1`). PR #128 is merged. PR #127 (`perf(p37): parallelize employer application detail loads`) remains open, draft, and unmerged at `c6dcdf6b0babdd5230dc8c782c3199d8b442e5a8`.

Installed framework version: Next.js `16.2.12` with React `19.2.4`. The current App Router tree has only `src/app/layout.tsx` and `src/app/internal/layout.tsx`; there is no `src/app/employer/layout.tsx` and no `src/app/candidate/layout.tsx`. Authenticated candidate/employer pages are individually dynamic via `export const dynamic = "force-dynamic"`; account export route handlers under `/candidate/account/export` and `/employer/account/export` are also authenticated but are not navigation-shell pages.

Route/load inventory summary:

| Surface | Routes | Shared layout? | Common shell/header loads | Route-specific gate/data |
| --- | --- | --- | --- | --- |
| Employer dashboard | `/employer` | No | capabilities, unseen count | `loadEmployerProfile`, `loadEmployerDrafts` |
| Employer vacancies | `/employer/vacancies`, `/employer/vacancies/new`, `/employer/vacancies/[vacancyId]`, `/employer/vacancies/[vacancyId]/edit` | No | capabilities, unseen count; suspension on list/detail | draft/list/detail/create gates, P3.7-B bulk readiness on list/home |
| Employer applications | `/employer/applications`, `/employer/applications/[applicationId]` | No | capabilities, unseen count, suspension | application list/detail, mark-seen on detail, outcomes on detail |
| Employer onboarding/verification/account | `/employer/onboarding`, `/employer/verification`, `/employer/account/delete` | No | capabilities; unseen/suspension on verification | profile gate, verification state, delete auth gate |
| Candidate dashboard/profile/account | `/candidate`, `/candidate/onboarding`, `/candidate/account`, `/candidate/account/delete` | No | capabilities for dual-account nav | candidate onboarding/profile/auth gate |
| Candidate jobs/matches/applications | `/candidate/matches`, `/candidate/jobs/[vacancyId]`, `/candidate/applications`, `/candidate/applications/[applicationId]` | No | capabilities for dual-account nav | match/detail/application inventory, confirmation/history/outcomes |

Repeated loader caller counts, excluding tests:

| Loader | Current route/module callers | DB/Auth shape | Redirects? | Fail-soft? | Freshness |
| --- | ---: | --- | --- | --- | --- |
| `loadAccountCapabilities` | 18 candidate/employer page callers plus auth/confirm | `auth.getUser` + candidate profile probe + employer profile probe, profile probes already parallel | No | Returns `null` on auth/query failure | Changes after candidate/employer profile creation, deletion, account recovery/deletion |
| `loadUnseenApplicationsCount` | 8 employer page callers | `requireCompletedEmployer` then `count_unseen_current_employer_applications` RPC | No | Returns `0` on gate/RPC/parse failure | Must refresh after application detail marks seen and when new applications arrive |
| `loadEmployerProfile` / `requireCompletedEmployer` | Direct page callers plus many employer route loaders/actions | `auth.getUser`, employer profile select, company select | Callers redirect based on result | No; returns structured failure | Changes after onboarding, verification/profile edits, deletion/tombstone paths |
| `loadCurrentEmployerSuspensionStatus` | 6 employer page callers plus update helper | `auth.getUser` + `is_current_employer_suspended` RPC | No | Unknown/failure result; RLS/RPC remains authority | Suspension/reinstatement is safety-sensitive and should be fresh per navigation |
| Candidate profile/view loaders | candidate home/onboarding/matches/applications/jobs | `auth.getUser` plus candidate profile/languages or candidate-owned RPC/query | Callers redirect based on result | Mostly no; outcomes are fail-soft on detail | Private candidate state; request-scoped only if cached |

Problem distinction:

- **Problem A - same-request duplicate work exists.** Employer pages commonly call equivalent employer-profile work more than once in one server render. Measured examples: `/employer/vacancies`, `/employer/applications`, and vacancy detail each invoked employer-profile scope twice; `/employer` and employer application detail invoked it three times. This comes from route gates plus nested gates inside unseen count or detail/list loaders.
- **Problem B - cross-navigation repeated work also exists, but is mostly expected navigation-level revalidation.** Every independent navigation reloads capabilities and, on employer pages, unseen/suspension/profile state. Absolute measured server timings stayed small: employer route samples were roughly `5.1-10.5ms` server time and `54.2-87.6ms` total; candidate route samples were roughly `5.3-9.0ms` server time and `52.2-97.8ms` total. This does not currently justify a broad persistent-shell data cache.

Temporary production-mode measurement used local Supabase after reset, a webpack production build, real authenticated fixtures (verified employer, published vacancy, matching candidate, submitted application), and env-gated server instrumentation removed after measurement. Direct route navigations were used to capture clean `PerformanceNavigationTiming`; therefore these numbers represent per-route server renders, not a claim that client-side `<Link>` transitions would refetch persisted layouts.

Employer measurement:

| Navigation | Capabilities | Unseen | Profile/View | Suspension | Route-specific | Total relevant calls | serverMs | totalMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/employer` | 2 | 1 | 3 | 0 | 4 | 24 | 6.7 | 68.4 |
| `/employer/vacancies` | 1 | 1 | 2 | 1 | 1 | 14 | 6.9 | 68.5 |
| `/employer/applications` | 1 | 1 | 2 | 1 | 1 | 14 | 8.7 | 69.9 |
| `/employer` repeat | 1 | 1 | 3 | 0 | 1 | 15 | 5.1 | 58.7 |
| `/employer/vacancies` | 1 | 1 | 2 | 1 | 1 | 14 | 7.6 | 68.8 |
| `/employer/vacancies/[id]` | 1 | 1 | 2 | 1 | 2 | 15 | 6.7 | 67.4 |
| `/employer/vacancies/[id]/edit` | 0 | 0 | 1 | 0 | 1 | 5 | 8.4 | 54.2 |
| `/employer/vacancies` repeat | 1 | 1 | 2 | 1 | 1 | 14 | 6.0 | 59.1 |
| `/employer/applications` | 1 | 1 | 2 | 1 | 1 | 14 | 6.3 | 58.4 |
| `/employer/applications/[id]` | 1 | 1 | 3 | 1 | 3 | 19 | 10.5 | 87.6 |
| `/employer/applications` repeat | 1 | 1 | 2 | 1 | 1 | 14 | 7.5 | 60.1 |

Candidate measurement:

| Navigation | Capabilities | Unseen | Profile/View | Suspension | Route-specific | Total relevant calls | serverMs | totalMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/candidate` | 1 | 0 | 2 | 0 | 2 | 14 | 5.3 | 97.8 |
| `/candidate/matches` | 1 | 0 | 1 | 0 | 2 | 8 | 5.8 | 52.2 |
| `/candidate/applications` | 1 | 0 | 1 | 0 | 1 | 7 | 6.1 | 53.0 |
| `/candidate/matches` repeat | 1 | 0 | 1 | 0 | 2 | 8 | 9.0 | 59.7 |
| `/candidate/jobs/[id]` | 1 | 0 | 0 | 0 | 5 | 9 | 5.3 | 68.0 |
| `/candidate/matches` repeat | 1 | 0 | 1 | 0 | 2 | 8 | 7.3 | 52.7 |

Notes on the count columns: `Capabilities`, `Unseen`, `Profile/View`, and `Suspension` are loader invocations. `Route-specific` and `Total relevant calls` are instrumentation counts of Supabase client/auth/query/RPC starts outside or across those scopes. The first `/employer` sample included an extra capabilities/profile footprint likely from production prefetch/background work; the repeat sample is a cleaner steady-state comparison.

Next/App Router findings:

- Current local build output marks all authenticated candidate/employer pages dynamic (`ƒ`).
- Layouts under a route segment would share UI across sibling pages and, per current Next App Router behavior, preserve state and avoid re-render on client-side navigation. That is useful for static shell structure, but it also means dynamic private shell data placed in a persistent layout can become stale unless explicit refresh/invalidation is designed.
- Root `src/app/layout.tsx` only asserts server env and renders `<html><body>`. `src/app/internal/layout.tsx` is a static operator nav shell with no auth data. No current layout owns candidate/employer auth, capabilities, unseen count, profile, or suspension state.
- `loading.tsx` exists for candidate matches/applications/job detail and employer home/vacancies/applications/verification. Adding nested layouts would change which loading boundary appears on sibling transitions and needs UI verification before implementation.
- React `cache()` is request-scoped: it can dedupe equivalent work within one server request, but it does not solve cross-navigation repeated work. It is a good fit for Problem A only.
- Existing Supabase calls are not automatically deduped by Next `fetch` memoization because they go through `@supabase/ssr` client methods, not identical framework-level `fetch()` calls owned by the same component tree.

Freshness/security findings:

- Employer unseen count should not live in long-lived client or persistent layout state without explicit invalidation. The application-detail page marks an application seen and then the next list/detail render must show the updated count; new applications also need fresh visibility.
- Employer suspension is safety-sensitive. A cached `not suspended` shell must not weaken route/RPC enforcement. Current loader is explicitly a UX helper, with RLS/RPC-level checks remaining authoritative; keep suspension fresh per navigation unless an implementation proves invalidation.
- Capabilities change when candidate/employer profiles are created/deleted or account deletion/recovery state changes. Cross-navigation caching risks stale role-switch UI after onboarding or deletion.
- Profile completion and verification state affect immediate redirects after onboarding/verification mutations. Persistent shell profile state would need precise `router.refresh()` / server-action revalidation semantics.
- Candidate private data must never be cached across users. Request-level memoization is acceptable only when scoped to the current request/session client.

Options matrix:

| Option | Expected DB-call reduction | Cross-navigation benefit | Freshness risk | Auth/privacy risk | Complexity | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| A. Shared `/employer` and/or `/candidate` server layouts | Medium for shell UI if data is moved; uncertain for current direct-request measurements | Possible on client-side sibling navigation | High for unseen/suspension/capabilities unless invalidated | Medium-high because private auth state moves into persistent shell | High | Do not implement now |
| B. React `cache()` / request-level memoization | Medium for same-request employer-profile duplicates | None | Low; cache dies after request | Low if keyed by current request/client only | Low-medium | **Recommended smallest slice** |
| C. Explicit per-request `loadEmployerShellContext()` | Medium if it centralizes existing calls | None by itself | Medium; can accidentally bundle freshness-sensitive data | Medium | Medium | Defer unless B is insufficient |
| D. Database/RPC aggregation | Medium-high for one route render | None by itself | Medium; couples shell concerns to SQL | Medium; RLS/security-definer review needed | High | Not justified by current timings |
| E. Client-side persisted shell state | High apparent reduction | High | High | High for private/stale auth state | High | Reject for this scope |
| F. Leave architecture unchanged | None | None | None | None | None | Valid if no implementation is authorized |

Classification: **B. IMPLEMENT REQUEST-LEVEL DEDUPLICATION ONLY**. P3.7-C should not implement shared candidate/employer layouts, persistent shell state, broad route architecture changes, schema/RPC aggregation, or cross-navigation caching from current evidence. The actual safe opportunity is Problem A: duplicate employer-profile/completed-employer work within a single server render.

Smallest next slice proposal:

**P3.7-C1 - request-level memoization for employer profile/completed-employer gate**

- Likely files: `src/lib/employer/load-employer.ts`, `src/lib/employer/vacancies/require-completed-employer.ts`, focused tests for repeated same-request calls.
- Exact change: wrap the current employer-profile load and/or completed-employer gate in request-scoped memoization without moving redirects, changing SQL/RPC, changing route layouts, or caching across requests.
- Data ownership: remains server-side, current authenticated Supabase/RLS context only.
- Invalidation: none across requests; server actions and later navigations naturally re-run.
- Routes affected: employer home, vacancies list/detail/edit/new, applications list/detail, verification, onboarding paths that already call these loaders.
- Expected measurable result: employer pages with repeated profile gates should reduce duplicate employer-profile Auth/table probes during one render; cross-navigation call counts should remain intentionally fresh.
- Tests required: unit tests proving duplicate same-client calls are deduped, unauthenticated/failure behavior unchanged, and callers preserve redirect/fail-soft semantics; existing employer page tests; targeted production measurement repeat.
- Rollback: revert the memoization wrapper only.
- Explicit exclusions: no shared `/employer` or `/candidate` layout, no unseen-count caching, no suspension caching, no client persisted shell state, no schema/RPC/build-tooling changes, no P3.7-A2 continuation.

Discovery validation:

- Temporary instrumentation files and the temporary Playwright measurement spec were removed.
- `git status --short` returned clean before this documentation edit.
- No product, schema, migration, CI, build-tooling, or test files are intended in the final branch diff.
