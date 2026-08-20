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
