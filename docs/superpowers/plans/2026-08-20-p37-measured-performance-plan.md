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

### P3.7-C1 - Request-Level Employer Profile Deduplication

Implementation base: `origin/main` at `bd5dceaacee9021b22922906f23ef1e816982878`, the merge commit for PR #129 (`docs(p37): cross-navigation performance discovery`). PR #127 remained open, draft, and unmerged during this work.

Memoization mechanism: `loadEmployerProfile` now stores its in-flight/resolved `LoadEmployerResult` promise on the per-request Supabase server client instance using a private module-local `unique symbol`. This deliberately avoids a global `Map`, `unstable_cache`, persistent client state, shared layouts, browser storage, or cross-navigation caching. Current employer route renders create one Supabase server client and pass that same instance through route loaders, `requireCompletedEmployer`, and `loadUnseenApplicationsCount`, so equivalent same-render profile gates share one underlying auth/profile/company load. A fresh server client on the next request/navigation loads fresh state.

What is deduped:

- `loadEmployerProfile` underlying `auth.getUser`;
- `employer_profiles` select;
- `companies` select when an employer profile exists;
- repeated `requireCompletedEmployer` gates that share the same server Supabase client during one render.

What remains fresh and uncached:

- unseen application count;
- employer suspension state;
- account capabilities;
- application mark-seen behavior;
- route-specific application/vacancy data;
- all future navigations, router refreshes, and server actions that create a fresh server Supabase client.

Production-mode measurement after implementation used the same local Supabase + webpack production-build measurement discipline as P3.7-C. Temporary metrics hooks and the temporary Playwright spec were removed afterward. The timing numbers remain secondary because local absolute times are already small; the primary result is structural same-request deduplication.

| Route | Before profile-scope calls | After profile-scope calls | After underlying profile loads | Before serverMs | After serverMs |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/employer` | 3 | 3 | 1 | 5.1 | 10.7 |
| `/employer/vacancies` | 2 | 2 | 1 | 6.9 | 7.2 |
| `/employer/applications` | 2 | 2 | 1 | 8.7 | 6.4 |
| `/employer/vacancies/[id]` | 2 | 2 | 1 | 6.7 | 6.4 |
| `/employer/applications/[id]` | 3 | 3 | 1 | 10.5 | 11.0 |

After-measurement query proof for every measured route: `profileAuth=1`, `profileTable=1`, `companyTable=1`. The unchanged profile-scope call count is expected: callers still invoke their existing contracts, but duplicate calls now share the same underlying result for that request.

Security/freshness boundary:

- Authenticated user resolution and RLS context still come from the supplied Supabase server client.
- Structured result contracts are unchanged for unauthenticated, missing/incomplete employer, profile query failure, company query failure, and completed employer.
- No route redirects moved into the memoized loader; caller-owned redirect behavior remains in place.
- The cache is attached only to the server client object used by the current request. It does not survive a newly created server client and therefore does not claim cross-navigation improvement.

Validation:

- Focused loader tests prove two and three same-client calls dedupe to one underlying load.
- Focused tests prove a fresh server client reloads fresh employer state.
- Focused `requireCompletedEmployer` tests prove repeated gates dedupe while preserving unauthenticated, incomplete, completed, and profile-failure contracts.

### P3.7-D - Candidate Application Notification Critical-Path Discovery

Discovery base: `origin/main` at `515292611a5f7ce7fa6778f867cb65b9695323c7`, the merge commit for PR #130 (`perf(p37): dedupe employer profile loads per request`). PR #127 was verified closed and unmerged before this branch was created.

Current flow:

1. `submitCandidateApplicationAction` validates the submitted `vacancyId`.
2. The action creates the request Supabase server client and rechecks the authenticated user.
3. The action calls the authoritative `submit_candidate_application` RPC.
4. The RPC performs the application mutation transactionally: profile/vacancy checks, duplicate guard, eligibility checks, `applications` insert, and `application_status_history` insert.
5. For a new `"submitted"` result only, the action awaits `notifyEmployerOfNewApplication({ applicationId, vacancyId })`.
6. The action redirects to `/candidate/applications/<applicationId>` after the notification attempt settles. `"already_applied"` redirects without a new notification attempt.

The awaited notification is intentionally fail-soft. Notification errors or provider rejection do not roll back the persisted application and do not return a candidate-facing submission failure. The cost is that mail lookup and provider latency are on the candidate redirect critical path.

Files inspected:

- `src/app/candidate/jobs/[vacancyId]/actions.ts`
- `src/lib/applications/notify-employer-new-application.ts`
- `src/lib/applications/employer-new-application-email.ts`
- `src/lib/applications/privileged-employer-recipient-lookup.ts`
- `src/lib/mail/send-transactional-email.ts`
- `src/lib/mail/providers/resend-transport.ts`
- `src/lib/mail/env.ts`
- `src/app/candidate/jobs/[vacancyId]/actions.test.ts`
- `src/lib/applications/notify-employer-new-application.test.ts`
- `src/lib/mail/send-transactional-email.test.ts`
- `src/lib/mail/providers/resend-transport.test.ts`
- `supabase/migrations/20260807220000_account_deletion_tombstone_and_request_contract.sql`
- `supabase/tests/database/11_applications_schema_test.sql`
- `package.json`
- `next.config.ts`
- `vercel.json`
- `src/instrumentation.ts`
- `docs/53-m5.1-beta-readiness-closure.md`

Mutation and idempotency findings:

- `submit_candidate_application(uuid)` is the authoritative mutation boundary. It runs as a security-definer RPC, uses the current `auth.uid()`, locks the candidate profile and vacancy rows during checks, inserts the application and status history in the database function, and catches duplicate-submit `unique_violation` by returning `"already_applied"` for the existing row.
- The database has an `applications_candidate_vacancy_key` unique constraint. Duplicate submit attempts do not create duplicate application rows.
- Employer notification is not part of the database transaction. It is a TypeScript side effect after the RPC returns `"submitted"`.
- Notification idempotency currently relies on Resend's `Idempotency-Key` header with deterministic event id `application-submitted:<applicationId>`.
- Resend documents idempotency for `POST /emails` and `POST /emails/batch` as duplicate-send protection for the same key within 24 hours: <https://resend.com/docs/dashboard/emails/idempotency-keys>.
- There is no local delivery ledger, durable outbox, retry worker, or database record that says a given application notification was attempted, sent, rejected, retried, or permanently failed.

Runtime and deployment findings:

- The installed framework version is Next `16.2.12`.
- The app uses default App Router Server Actions on the Node runtime. No candidate application route exports `runtime = "edge"` or `maxDuration`.
- `vercel.json` sets the framework only; it does not configure function duration.
- The installed Next docs state that `after()` can be used in Server Functions, including Server Actions, and runs after the response or prerender finishes. They also state that it runs for the platform default or configured max duration, with `maxDuration` configurable at the page level for Server Actions.
- Vercel documents `waitUntil` as extending the lifetime of a request handler for a promise, and recommends the built-in Next `after()` helper for Next.js 15.1 and later: <https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package>.
- Vercel also warns that unawaited fire-and-forget work can produce inconsistent logs or incomplete work; helpers such as `waitUntil`/`after` still run inside the function duration boundary: <https://vercel.com/kb/guide/troubleshooting-inconsistent-logs-in-vercel-functions>.
- Production beta readiness docs currently classify transactional business mail N1-N3 as not production-ready. Production still needs `RESEND_API_KEY`, `MAIL_FROM_ADDRESS`, `MAIL_TRANSPORT`, and Resend domain verification for the intended sender before notification delivery can be trusted in production.

Controlled action-level timing measurement:

Temporary Vitest instrumentation used the real `submitCandidateApplicationAction` control flow with mocked Supabase auth/RPC and mocked notification outcomes. The RPC delay was fixed at roughly 5 ms to represent a completed persisted application result; notification latency was varied to isolate candidate redirect wait. The temporary measurement file was removed after the run.

Command:

```bash
pnpm exec vitest run 'src/app/candidate/jobs/[vacancyId]/p37d-critical-path-measure.test.ts' --reporter=verbose
```

Result: 1 file / 1 test passed.

| Scenario | Persistence/RPC ms | Notification ms | Post-persistence wait ms | Redirect wait ms | Persisted application |
| --- | ---: | ---: | ---: | ---: | --- |
| recipient unresolved | 5.8 | 1.2 | 2.1 | 8.9 | yes |
| fast provider success | 6.0 | 1.2 | 1.4 | 7.6 | yes |
| provider delay 100 ms | 5.9 | 100.6 | 100.8 | 107.0 | yes |
| provider delay 500 ms | 6.0 | 501.2 | 501.8 | 507.9 | yes |
| provider delay 1500 ms | 5.4 | 1501.4 | 1502.2 | 1508.5 | yes |
| provider rejected | 6.4 | 1.4 | 1.9 | 9.1 | yes |

Interpretation:

- The current implementation adds notification duration almost one-for-one to candidate redirect wait after the application has already been persisted.
- Provider rejection is fail-soft for the candidate, but the candidate still waits for the rejected provider response.
- Recipient lookup failure is also fail-soft and fast in the mocked action-level measurement.
- The measurement does not claim absolute hosted production latency; it proves the structural critical-path relationship in the current action.

Options matrix:

| Option | Candidate redirect impact | Delivery reliability | Duplicate-send control | Freshness/security risk | Complexity | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| A. Keep current awaited fail-soft notification | Provider/lookup latency remains on critical path | Best current attempt guarantee inside request lifecycle | Resend 24h idempotency only | Low; no new async boundary | None | Acceptable interim state |
| B. Plain fire-and-forget `void notifyEmployerOfNewApplication(...)` | Removes wait from redirect | Weak; work can disappear when invocation ends | Resend key only if the call actually reaches provider | Medium; harder observability and error handling | Low | Reject |
| C. Next `after()` / Vercel `waitUntil` | Removes wait from response while function remains alive | Better than untracked fire-and-forget, but not durable and still bounded by max duration | Resend key only, no local ledger | Low-medium | Low-medium | Do not implement as the reliability answer |
| D. Database notification outbox plus worker/cron processing | Removes provider wait from candidate action after enqueue | Strongest; durable attempt, retry, status, replay, observability | Can combine DB unique key plus provider idempotency | Low if service-role worker is narrow and audited | High | Right architecture if reliability and latency both matter |
| E. Third-party queue/job platform | Removes provider wait | Strong if configured correctly | Depends on provider plus local keys | Medium; new operational dependency | Medium-high | Not justified before beta operations are settled |

Classification: **E. NO IMPLEMENTATION YET - operational decision required**.

Rationale:

- The current awaited path is measurably on the candidate critical path, but it is also the only current mechanism that ensures a notification attempt happens before the request lifecycle ends.
- A casual fire-and-forget change would improve redirect timing while making notification loss easier and less visible. That violates the notification reliability concern.
- `after()` is supported by the installed Next/Vercel stack and is a legitimate latency tool for non-critical side effects, but it is not a durable queue. It does not add retry state, a delivery ledger, or exactly-once semantics, and it remains bounded by function duration.
- A durable outbox is the smallest architecture that satisfies both goals: remove provider latency from the candidate redirect and avoid silent loss by recording an intended notification transactionally with the application mutation. It is larger than a performance micro-optimization because it touches schema, worker/runtime, retry policy, observability, service-role scope, and operational runbooks.
- Production transactional mail is not yet ready, so implementing asynchronous delivery mechanics now would outrun the operational foundation.

Recommended next decision:

Keep the current awaited fail-soft implementation for the immediate beta path unless candidate submit latency becomes a measured hosted problem. Before implementing P3.7-D1, decide whether employer new-application email is product-critical enough to require durable retry and operator visibility.

If implementation is authorized later, the smallest coherent slice should be:

**P3.7-D1 - durable employer-application-notification outbox**

- Insert a notification-outbox row transactionally with the new application or immediately after the RPC through a narrowly reviewed server-side path.
- Add a unique event key such as `application-submitted:<applicationId>` at the database layer.
- Process pending rows through a service-role Route Handler, cron job, or approved worker path.
- Preserve the current privacy-minimal email body.
- Record attempt status, provider message id, error class, retry count, and timestamps without storing recipient/body secrets in logs.
- Keep Resend `Idempotency-Key` as provider-side duplicate protection, but treat it as secondary to the local event ledger.
- Preserve candidate success semantics: application persistence remains authoritative, and notification failures do not convert a submitted application into a candidate-facing failure.
- Exclude generic notification infrastructure, inbox notifications, candidate emails, cross-provider abstractions, marketing mail, shared layouts, and unrelated P3.7 work.

Discovery validation:

- Temporary measurement file removed after use.
- No product, schema, migration, CI, build-tooling, or test files are intended in the final branch diff.
- Final branch diff should contain only this plan update.

### P3.7-E - Authenticated Dynamic Rendering And Caching Discovery

Discovery base: `origin/main` at `823274786d9aaefe086c3700c2d77391ae2203a4`, the merge commit for PR #131 (`docs(p37): application notification critical-path discovery`). PR #131 and PR #130 were verified merged; PR #127 was verified closed and unmerged.

P3.7 reconciliation:

- P3.7-A1: technically valid but closed unmerged because measured gain was not material.
- P3.7-A2: intentionally skipped after A1 did not justify broad `Promise.all` conversion.
- P3.7-B: merged; vacancy draft readiness moved from N+1 single-RPC calls to one bulk readiness RPC.
- P3.7-C: discovery complete; shared authenticated layouts and persistent shell state rejected.
- P3.7-C1: merged; employer profile/completed-employer duplicate work is deduped per request/Supabase server client.
- P3.7-D: discovery complete; no notification implementation now.
- P3.7-E: this final dynamic-rendering/caching audit.

Rendering directive inventory:

| Group | Routes/files | Current mode | Auth/private data | Dynamic cause | Cacheability |
| --- | --- | --- | --- | --- | --- |
| Public pages | `/`, `/jobs`, `/jobs/[vacancyId]` | explicit `force-dynamic`, build `ƒ` | Public vacancy data; `/jobs/[vacancyId]` also reads session to choose authenticated CTA copy | `createServerSupabaseClient()` awaits `cookies()`; detail also uses React `cache()` only within one render | Public vacancy data is cacheable in principle, but current route modules are session-aware and current vacancy mutations do not invalidate public paths |
| Static public/legal pages | `/forgot-password`, `/impressum`, `/privacy`, `/terms`, icons | build `○` or `●` | None | No request-time data | Already static/prerendered; no E work needed |
| Auth/session pages | `/login`, `/register`, `/employer/register`, `/reset-password`, `/account/choose`, `/auth/confirm`, `/auth/error` | build `ƒ`, except `/forgot-password` static | Session, redirect intent, or query-specific interstitial state | Supabase server client/cookies on login/register/reset/account; `searchParams` on confirm/error | Mostly not worth caching; redirect/session correctness matters more |
| Candidate authenticated pages | `/candidate`, `/candidate/onboarding`, `/candidate/matches`, `/candidate/jobs/[vacancyId]`, `/candidate/applications`, `/candidate/applications/[applicationId]`, `/candidate/account`, `/candidate/account/delete` | explicit `force-dynamic`, build `ƒ` | Candidate profile, onboarding answers, matches, applications, outcomes, account/delete state, capability nav | Supabase server client awaits `cookies()` and RLS/session auth; redirects depend on current state | Cross-request caching rejected; request freshness is required |
| Employer authenticated pages | `/employer`, `/employer/onboarding`, `/employer/verification`, `/employer/vacancies`, `/employer/vacancies/new`, `/employer/vacancies/[vacancyId]`, `/employer/vacancies/[vacancyId]/edit`, `/employer/applications`, `/employer/applications/[applicationId]`, `/employer/account/delete` | explicit `force-dynamic`, build `ƒ` | Employer profile, company, verification, suspension, vacancy state/readiness, application data, unseen count, outcomes, account/delete state | Supabase server client awaits `cookies()` and RLS/session auth; redirects and restricted states depend on current state | Cross-request caching rejected; P3.7-C1 already handles safe same-request duplicate profile work |
| Internal/operator pages | `/internal/verification`, `/internal/verification/[employerProfileId]`, `/internal/employers`, `/internal/employers/[employerProfileId]`, `/internal/employers/[employerProfileId]/vacancies/[vacancyId]` | explicit `force-dynamic`, build `ƒ` | Operator-only queues, employer moderation, suspension, vacancy moderation | Supabase server client awaits `cookies()`; operator gate RPCs | Cross-request caching rejected; operator state and moderation actions must be fresh |
| Route handlers/export routes | `/candidate/account/export`, `/employer/account/export` | explicit `force-dynamic`, build `ƒ` | Full account export payloads | Supabase server client awaits `cookies()`; export response sets `Cache-Control: no-store` | Must never be cached |
| Server Actions | auth, onboarding, vacancy lifecycle, verification, status/outcome, account deletion | request-time only | Mutations under current session/RLS/RPC gates | Supabase server client awaits `cookies()`; actions call `revalidatePath` where relevant | Not page caches; any future cache would require explicit invalidation coverage |

`force-dynamic` redundancy assessment:

| Surface | Assessment |
| --- | --- |
| Authenticated candidate/employer/internal pages | **B. Redundant but harmless.** Every page creates the Supabase server client, which awaits `cookies()`. Next 16.2.12 docs classify `cookies()` as a request-time API that opts the route into dynamic rendering. Keeping `force-dynamic` is still a useful explicit privacy signal. |
| Account export route handlers | **B. Redundant but harmless.** Route Handlers are not cached by default in the installed docs, the handlers read cookies through Supabase, and export responses explicitly set `Cache-Control: no-store`. |
| Public homepage/jobs list/detail | **C. Removing it alone would not create safe static/ISR semantics.** The modules still create the cookie-backed Supabase server client. Public detail is also intentionally session-aware. A real public-cache change would need a loader/client split plus public-path invalidation. |
| `/reset-password` | **B. Redundant but harmless.** It reads current auth session from Supabase/cookies. |
| `/auth/confirm` and `/auth/error` | No explicit `force-dynamic`, but build output marks them dynamic because they depend on `searchParams`. |
| Static legal/help pages | No `force-dynamic`; already static. |

Next.js `16.2.12` behavior findings from installed docs:

- This repository does **not** enable `cacheComponents` in `next.config.ts`, so it uses the "previous model" caching guide rather than the new opt-in Cache Components model.
- `cookies()` and `headers()` are async request-time APIs. Using either in a layout or page opts the route into dynamic rendering.
- Server Component data fetching can use `fetch` or database clients. `fetch` requests are not cached by default in the current getting-started guide; the previous-model guide also explains explicit opt-in through `cache: "force-cache"`, `next.revalidate`, route `revalidate`, or `unstable_cache`.
- `dynamic = "force-dynamic"` forces per-user request-time rendering and is equivalent to forcing no-store behavior for `fetch()` in that segment.
- `revalidate = 0` also ensures dynamic rendering and changes the default for unspecified `fetch` requests to no-store; no route currently exports `revalidate`.
- `unstable_cache` persists non-`fetch` async results across requests/deployments until time/tag/path invalidation. It cannot access `cookies()` or `headers()` inside the cache scope.
- React `cache()` deduplicates non-`fetch` data access within a server render/request scope only. It is not a cross-request cache.
- `use cache` / Cache Components require `cacheComponents: true`; this repo does not enable that flag, and no source file uses a `"use cache"` directive.
- Server Action cache invalidation exists through `revalidatePath`; this repo already uses path revalidation on vacancy, verification, moderation, transition, and outcome mutations, but there is no persistent private data cache for those calls to invalidate today.
- `router.refresh` / action-driven refresh can clear client-side route cache, but relying on it for private cross-request cache correctness would require systematic mutation coverage.

Supabase SSR caching findings:

- `src/lib/supabase/server.ts` calls `await cookies()` before creating the `@supabase/ssr` server client, so every route that creates this client is naturally request-time dynamic.
- The Supabase server client receives all request cookies through `cookieStore.getAll()` and may attempt cookie writes through `setAll()`; writes no-op when called from immutable Server Component contexts.
- `src/proxy.ts` refreshes Supabase auth cookies on all non-static/image paths and protects candidate/employer/internal areas at the session level using `getClaims()`.
- The app uses `auth.getUser()`, RLS-protected table queries, and RPCs under the current session for ordinary private routes. Service-role clients are limited to explicit privileged paths such as account-deletion processing and notification recipient lookup; they are not used by public vacancy rendering.
- Supabase SDK calls should not be treated as safe Next data-cache entries. They carry session cookies/auth context, may use POST/RPC requests, are not tagged with application invalidation keys, and are not automatically deduped as equivalent app-owned `fetch()` calls across components.
- Cross-request caching of Supabase results would need explicit cache keys and invalidation. A cache key based only on user id is not sufficient for suspension, account deletion/recovery, role/capability changes, verification changes, vacancy lifecycle, and application status/seen/outcome updates.
- Cross-user leakage risk is unacceptable for candidate applications, employer application detail, account exports, operator queues, and profile/onboarding data. No private loader should use `unstable_cache`, route ISR, or shared layout state without a separate security design.

Data sensitivity tiers:

| Tier | Data/loaders | Reason |
| --- | --- | --- |
| Tier 1 - security-critical / must be fresh | auth identity, account deletion/tombstone state, operator gate, employer suspension, ownership gates, account export, moderation gates | Stale data can grant access, hide restriction, or leak private/operator-only data |
| Tier 2 - workflow-critical / refresh per navigation/action | unseen applications, application status/history/outcomes, mark-seen state, vacancy publication/readiness/expiry/moderation state, onboarding completion, verification state | Stale data misdirects users or displays wrong operational status |
| Tier 3 - stable but private | employer display/profile/company details, candidate profile fields, capability nav booleans | Less volatile, but still private and role-sensitive; request-level only is safe |
| Tier 4 - public/stable | public effective vacancy list/detail/languages and static legal/marketing content | Cacheable only when detached from auth/session and backed by correct vacancy lifecycle invalidation |

Public-route audit:

- Static legal/help routes are already prerendered and need no work.
- `/`, `/jobs`, and `/jobs/[vacancyId]` are dynamic today. They use public vacancy RPCs, but they create the cookie-backed Supabase server client, and public job detail additionally reads `auth.getUser()` to decide the CTA state.
- Public vacancy content is the safest potential future cache target, but not an obvious E implementation now. Publication, pause, fill, withdraw, expiry materialization, moderation, employer suspension, and verification revocation can all change whether a vacancy is public. Current employer lifecycle `revalidatePath()` calls cover employer paths only, not `/`, `/jobs`, or `/jobs/[vacancyId]`.
- ISR for public vacancies would require a split between anonymous public data and session-aware CTA data, public path/tag invalidation for every vacancy visibility mutation, and stale-window acceptance for withdrawn/expired/suspended vacancies. That is more than a cleanup.

Authenticated-route audit:

- Candidate and employer routes remain locally fast after P3.7-B/C1. The representative measurement below showed authenticated server timings mostly around `6-10ms`, with one cold candidate applications sample at `25.1ms`.
- Private cross-request caching would risk stale role/capability state, stale onboarding/verification redirects, stale suspension restrictions, stale unseen counts, stale application status/outcome data, and stale account-deletion state.
- Same-request duplicate employer profile work was already addressed by P3.7-C1. No remaining authenticated caching opportunity meets the cost/benefit threshold.

Cache-key and user-isolation findings:

- Public vacancy data would need keys by vacancy/list scope plus visibility/version dimensions and invalidation on every lifecycle/moderation/verification/suspension transition that changes effective-public eligibility.
- Candidate private data would need user id, deletion/account-state version, onboarding/profile version, application/status/outcome versions, and route-specific ownership dimensions. This is not justified for current timings.
- Employer private data would need employer id, suspension version, verification/profile/company versions, vacancy state/readiness versions, application seen/status/outcome versions, and dual-capability dimensions. This is not justified for current timings.
- Internal/operator data would need operator authorization state plus moderation queue/entity versions. It is operationally safer to keep it uncached.
- User id alone is never sufficient for safe private cross-request caching because account deletion, suspension, verification, and role changes are security/workflow state, not just identity state.

Production-mode measurement:

Build command:

```bash
pnpm exec next build --webpack
```

Build result: PASS. The default local Turbopack build blocker remains a previously classified local tooling issue; this measurement used the documented webpack production-build fallback.

Temporary measurement command:

```bash
E2E_AUTH_JOURNEY=1 pnpm exec playwright test e2e/p37e-dynamic-caching-measure.spec.ts --workers=1 --reporter=list
```

Result: 1 file / 1 test passed. The temporary spec was removed afterward.

| Route | Sample | status | serverMs | totalMs | Cache-Control | Next cache headers |
| --- | --- | ---: | ---: | ---: | --- | --- |
| `/` | cold | 200 | 34.3 | 101.8 | `private, no-cache, no-store, max-age=0, must-revalidate` | none |
| `/` | warm | 200 | 78.1 | 94.5 | `private, no-cache, no-store, max-age=0, must-revalidate` | none |
| `/jobs` | cold | 200 | 13.6 | 62.5 | `private, no-cache, no-store, max-age=0, must-revalidate` | none |
| `/jobs` | warm | 200 | 5.1 | 37.7 | `private, no-cache, no-store, max-age=0, must-revalidate` | none |
| `/jobs/[vacancyId]` | cold | 200 | 11.6 | 25.2 | `private, no-cache, no-store, max-age=0, must-revalidate` | none |
| `/jobs/[vacancyId]` | warm | 200 | 12.4 | 26.1 | `private, no-cache, no-store, max-age=0, must-revalidate` | none |
| `/candidate` -> `/candidate/matches` | cold | 200 | 7.7 | 99.7 | `private, no-cache, no-store, max-age=0, must-revalidate` | none |
| `/candidate` -> `/candidate/matches` | warm | 200 | 8.2 | 94.2 | `private, no-cache, no-store, max-age=0, must-revalidate` | none |
| `/candidate/matches` | cold | 200 | 6.3 | 54.5 | `private, no-cache, no-store, max-age=0, must-revalidate` | none |
| `/candidate/matches` | warm | 200 | 7.3 | 58.0 | `private, no-cache, no-store, max-age=0, must-revalidate` | none |
| `/candidate/applications` | cold | 200 | 25.1 | 75.6 | `private, no-cache, no-store, max-age=0, must-revalidate` | none |
| `/candidate/applications` | warm | 200 | 6.6 | 48.0 | `private, no-cache, no-store, max-age=0, must-revalidate` | none |
| `/employer` | cold | 200 | 7.5 | 59.6 | `private, no-cache, no-store, max-age=0, must-revalidate` | none |
| `/employer` | warm | 200 | 6.2 | 57.7 | `private, no-cache, no-store, max-age=0, must-revalidate` | none |
| `/employer/vacancies` | cold | 200 | 9.4 | 66.0 | `private, no-cache, no-store, max-age=0, must-revalidate` | none |
| `/employer/vacancies` | warm | 200 | 7.6 | 62.5 | `private, no-cache, no-store, max-age=0, must-revalidate` | none |
| `/employer/applications` | cold | 200 | 9.6 | 91.2 | `private, no-cache, no-store, max-age=0, must-revalidate` | none |
| `/employer/applications` | warm | 200 | 7.8 | 57.5 | `private, no-cache, no-store, max-age=0, must-revalidate` | none |

Build route classification:

| Build marker | Routes |
| --- | --- |
| `○` static | `/_not-found`, `/apple-icon`, `/forgot-password`, `/impressum`, `/privacy`, `/terms` |
| `●` SSG | `/icon/[__metadata_id__]` with `/icon/16` and `/icon/32` |
| `ƒ` dynamic pages/routes | `/`, `/account/choose`, `/auth/confirm`, `/auth/error`, all candidate pages and export route, all employer pages and export route, all internal pages, `/jobs`, `/jobs/[vacancyId]`, `/login`, `/register`, `/reset-password` |
| `ƒ` Proxy | `src/proxy.ts`, all non-static/image paths except the configured exclusions |

Security/privacy threat review:

- Candidate A receiving candidate B data: rejected by keeping candidate pages uncached and RLS/session-bound per request.
- Employer A receiving employer B application/vacancy data: rejected by keeping employer pages uncached and using ownership/RPC gates per request.
- Suspended employer retaining cached access: rejected by not caching suspension-dependent routes; current suspension loader is fresh per navigation and RPC/RLS gates remain authoritative.
- Deleted account seeing stale private content: rejected by not caching account/profile/application exports or private page data across requests.
- Role switch UI staying stale: accepted only for one current render; not cached across navigation.
- Unseen badge stale: not cached; still refreshed per employer navigation.
- Withdrawn/expired/moderated/suspended public vacancy remains visible: possible under any future ISR/public cache unless every visibility mutation invalidates public list/detail keys; this is why no public cache implementation is recommended now.
- Private application outcome in shared cache: rejected by not using `unstable_cache`, ISR, or shared cache for application data.

Invalidation map:

| Mutation/source | Would need invalidation if cached |
| --- | --- |
| Candidate onboarding/profile updates | candidate home/onboarding/matches/jobs/applications, capabilities, account state |
| Candidate application submit | candidate applications/detail, candidate job detail application state, employer applications/unseen count, public CTA if personalized |
| Candidate account deletion/cancel/confirm | every candidate private page, account export, capabilities, proxy/session assumptions |
| Employer onboarding/profile/company updates | employer home/onboarding/verification/vacancy create/edit, capabilities, public company/vacancy display if public cache exists |
| Employer verification request/review/revoke | employer verification/home/vacancies, public vacancy list/detail for effective-public eligibility |
| Vacancy create/edit/publish/pause/resume/fill/withdraw/renew/expiry | employer vacancy pages, employer applications filters, public `/`, `/jobs`, `/jobs/[vacancyId]` if public cache exists |
| Application status/outcome changes | employer/candidate application list/detail, public metrics only if future public surfacing exists |
| Mark seen | employer unseen count and application detail/list |
| Employer suspension/reinstatement | employer restricted states, public vacancy list/detail, candidate matches/job detail |
| Internal moderation | internal queue/detail, public vacancy list/detail, candidate matches/job detail |
| Account recovery/session changes | auth redirects, capability nav, protected-route access |

Options matrix:

| Option | Expected performance gain | Freshness risk | Cross-user privacy risk | Invalidation complexity | Implementation complexity | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| A. Leave authenticated routes `force-dynamic` | No new gain; preserves current fast baseline | Low | Low | None | None | Keep |
| B. Remove redundant `force-dynamic` declarations only | No material performance gain because `cookies()` still makes routes dynamic | Low-medium; cleanup can obscure intentional privacy posture | Low if behavior truly unchanged | Test every affected route/build output | Medium for little value | Do not implement now |
| C. Cache selected private loaders cross-request | Possible DB reduction, but current timings do not need it | High | High | High/fragile | High | Reject |
| D. Cache public route data with ISR/revalidation | Possible public DB reduction at scale | Medium for vacancy freshness | Low if fully detached from auth | Medium-high; all visibility mutations must invalidate public paths/tags | Medium-high | Defer until hosted scale evidence |
| E. Cache immutable/static marketing/legal content | None; already static where applicable | Low | Low | None | None | Already done by framework |
| F. No P3.7-E implementation | No new gain | Low | Low | None | None | **Recommended** |

Final P3.7-E classification: **E. NO MATERIAL OPPORTUNITY - KEEP CURRENT RENDERING**.

E1 recommendation: **No E1 is justified now**.

Rationale:

- Authenticated route server timings are already low after P3.7-B/C1.
- Removing `force-dynamic` alone would be cleanup, not a measured performance improvement, because the same routes still call the cookie-backed Supabase server client.
- Private cross-request caching would add disproportionate privacy, security, and invalidation risk.
- Public vacancy caching is the only plausible future area, but current measured timings are not a blocker and safe implementation requires route/client splitting plus public-path invalidation not currently present.

P3.7 closure status: **P3.7 COMPLETE**.

Implemented or merged P3.7 slices:

- P3.7-B vacancy readiness N+1 removal.
- P3.7-C1 request-level employer profile/completed-employer deduplication.

Rejected, skipped, or deferred:

- P3.7-A1 closed unmerged due no material measured gain.
- P3.7-A2 skipped.
- P3.7-C shared layouts/persistent shell state rejected.
- P3.7-D no implementation now; durable notification outbox remains an operational decision only if later authorized.
- P3.7-E no implementation now.

Remaining performance risks:

- Public vacancy list still has one language RPC per public vacancy; this was not material in current measurement but could become a later scale target if public listings grow.
- Public routes are no-store today, so they do not reduce DB load through HTTP/ISR caching.
- Private routes intentionally pay fresh session/RLS reads per request for safety.
- Local absolute timings are not a hosted Production latency guarantee; hosted measurement should be repeated only if beta evidence shows actual user-facing delay.

Repository-verified roadmap handoff:

- Current durable next M5.1 unit remains **Unit H - legal/support readiness finalization**.
- Cohort A readiness remains **BLOCKED**.
- K6 Production/public-domain cutover remains later and separately gated.
- KDS-TM typography/motion discovery is recorded as a non-blocking separate design-system track and is not authorized by P3.7 closure.
- No next milestone implementation is begun by this branch.

Discovery validation:

- Temporary Playwright measurement spec removed.
- No application source, test, schema/migration, CI, or build-tooling files are intended in the final branch diff.
- Final branch diff should contain only this plan update.
