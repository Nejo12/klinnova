# P3.6 — Loading & Transition UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make async waiting and route transitions unmistakable across public, candidate, and employer surfaces, without artificially slowing the product, without hiding real performance problems, and without touching architecture reserved for P3.7.

**Architecture:** Add a small, thin set of skeleton/loading primitives (`src/components/shared/`); wire them into `loading.tsx` files at the route boundaries named in scope, within the *existing* per-page architecture (no shared layouts); fix the one confirmed gray-and-silent regression in `ApplicationStatusActions`/`StatusTransitionConfirmDialog`; and do a final accessibility/responsive/reduced-motion verification pass.

**Tech Stack:** Next.js App Router (Server Components + `loading.tsx` Suspense boundaries), React `useActionState`, SCSS Modules, existing KDS design tokens (`src/styles/tokens.css`, `src/styles/breakpoints.scss`), Vitest, Playwright.

**Spec:** `docs/superpowers/plans/2026-08-19-p35-loading-transition-performance-discovery.md` (P3.5 discovery, merged to `main`) — this plan implements only the UX layer that discovery identified as P3.6-scoped; architectural findings (sequential awaits, N+1, shared layouts) are explicitly out of scope here and belong to P3.7.

## Global Constraints

These are the Founder's binding rulings for this phase. Every task below implicitly includes this section — an implementer who finds a task instruction in conflict with one of these must follow the constraint and flag the conflict in their report, not silently resolve it either way.

1. **Immediate feedback:** every user-triggered async action must acknowledge the click immediately. A gray/disabled button alone is never sufficient — the pending state must also be legible (a label change, a spinner, or both), not opacity/color alone.
2. **No artificial waits:** never delay content that is already ready merely so a loader can be seen. No minimum-visible duration for any spinner or skeleton. If content is ready before a threshold elapses, the loading UI must never have forced a wait.
3. **Timing:** reuse existing KDS tokens only (`src/styles/tokens.css:211-218` — `--duration-instant: 80ms`, `--duration-fast: 160ms`, `--duration-standard: 240ms`, `--duration-deliberate: 380ms`, `--ease-standard`/`--ease-enter`/`--ease-exit`). `--duration-standard` (240ms) may be used specifically as a **route-loading display threshold** (i.e., the skeleton may be visually withheld for up to this long before fading in, so a fast response never flashes a skeleton) where technically appropriate — this is a display-delay mechanism, not a minimum-visible one (constraint 2 still applies: if the real content arrives before the threshold, the skeleton must never have appeared). Do not invent new named duration/easing custom properties.
4. **Architecture boundary:** do NOT introduce shared `/candidate` or `/employer` `layout.tsx` files in this phase (deferred to P3.7, per P3.5 discovery Section 15/16 item 3). Do NOT refactor auth/data-loading architecture. Every `loading.tsx` added in this phase is a per-route-segment file within the existing architecture — each page keeps re-running its own data loads exactly as it does today.
5. **Verb labels:** standardize pending labels only on the specific surfaces this phase touches (Task E's status actions, and any component Task F genuinely modifies). Do not perform a repo-wide refactor of all 26 `useActionState` files or introduce a shared label-mapping constant that every existing component must adopt.
6. **Account export:** out of scope. Do not modify `src/app/candidate/account/export/**` or the `<a href>` trigger in `account/page.tsx`.
7. **Accessibility:** preserve the existing `role="status"`/`role="alert"` pattern (their implicit live-region semantics are the established convention — do not add explicit `aria-live` alongside them). Add `aria-busy` to pending controls/regions where it is missing. Do not add `aria-live` in new code except where a genuinely new region has no other implicit-live-region role to rely on (and even then, prefer `role="status"` first).
8. **Mobile & responsive:** every surface touched must be verified live at 360, 390, 430, 768, 1280, 1440, and under reduced-motion emulation.
9. **Performance boundary:** do NOT implement any P3.7 item — no `Promise.all` conversions, no N+1 batching for vacancy readiness, no change to the awaited candidate-application-notification email. Do not claim in any report that this phase improves measured server latency; it does not, and is not trying to.
10. **CI:** do not modify any CI workflow file in this branch.

**Also explicitly out of scope for this entire plan:** account-export UX, domain cutover, legal/Unit H work, notification architecture, matching semantics, application/vacancy state-machine changes (the transition logic itself, not its presentation), CI optimization.

---

## Task A: Loading & skeleton primitives

**Files:**
- Create: `src/components/shared/skeleton.tsx`
- Create: `src/components/shared/skeleton.module.scss`
- Create: `src/components/shared/skeleton.test.tsx`

**Interfaces:**
- Produces: `Skeleton` (single block primitive), `SkeletonRegion` (announcing wrapper), `DelayedReveal` (display-delay wrapper) — all three exported from `src/components/shared/skeleton.tsx`. Tasks B, C, D compose these into surface-specific skeleton layouts; they do not create their own base primitives.

This is the one task with real design judgment calls — make them, document the reasoning in your report, and keep the primitive set small (three exports, one file, one stylesheet — resist the urge to add a fourth "just in case").

### `Skeleton` — the base block

```tsx
type SkeletonProps = {
  width?: string; // e.g. "100%", "8rem" — default "100%"
  height: string; // required — callers must be deliberate about the geometry they're replacing
  radius?: "sm" | "md" | "pill"; // maps to --radius-sm / --radius-md / --radius-pill
  className?: string;
};

export function Skeleton({ width = "100%", height, radius = "sm", className }: SkeletonProps) {
  // aria-hidden="true" always — this element must never reach the accessibility tree.
  // Background: var(--color-bg-subtle). No shimmer/animation by default (see note below).
}
```

Default to a **flat, static tint** (`background: var(--color-bg-subtle)`, no animation) rather than a shimmer. Reasoning to preserve in your report: Global Constraint 3 forbids inventing new timing tokens, and the design artifact's proposed shimmer duration (1400ms) has no corresponding existing token: rather than picking an arbitrary number, default to static. If you find a shimmer implementation that reuses only existing tokens and looks genuinely better, you may add it as an optional enhancement gated the same way `Skeleton` is otherwise styled — but it is not required, and a static tint is an acceptable, ruling-compliant final state. Whatever you choose must be inert under `prefers-reduced-motion` — verify against the existing global rule at `src/styles/globals.scss:52-63` (it forces `animation-duration`/`transition-duration` to `0.01ms` with `!important`) rather than adding a second reduced-motion check inside this component.

### `SkeletonRegion` — the announcing wrapper

```tsx
type SkeletonRegionProps = {
  label: string; // e.g. "Loading vacancies" — screen-reader-only text
  children: ReactNode; // the Skeleton blocks (or any placeholder content) for this region
};

export function SkeletonRegion({ label, children }: SkeletonRegionProps) {
  // role="status" aria-busy="true" — no explicit aria-live (role="status" already implies
  // aria-live="polite" — Global Constraint 7 forbids adding it redundantly).
  // Renders a visually-hidden <span>{label}</span> first, then children.
}
```

Add a minimal `.srOnly` class to `skeleton.module.scss` (no such utility exists anywhere in the repo today — confirmed by grep before writing this plan) for the visually-hidden label text. Keep it local to this module; do not attempt to introduce a global utility-class system.

### `DelayedReveal` — the display-delay wrapper

Implements Global Constraint 3's display-delay mechanism: content inside is visually withheld (kept at `opacity: 0`) until `var(--duration-standard)` (240ms) has elapsed, then fades in. Prefer a pure-CSS approach (e.g. a CSS animation with `animation-delay: var(--duration-standard)` that animates `opacity` from 0 to 1 once, `animation-fill-mode: both`) over a `setTimeout`-based one — a CSS-only approach means that if the real page content replaces this `loading.tsx` tree before 240ms elapses (React unmounts the Suspense fallback the instant the boundary resolves), the skeleton visually never appeared at all, which is exactly what Global Constraint 2 requires: nothing was delayed, and no minimum-visible time was enforced, because unmounting doesn't wait for the CSS animation to finish.

```tsx
type DelayedRevealProps = { children: ReactNode };
export function DelayedReveal({ children }: DelayedRevealProps) {
  // A wrapper <div> with a CSS class that starts at opacity: 0 and fades to
  // opacity: 1 via animation-delay: var(--duration-standard). No JS timer.
}
```

Confirm via a real Playwright check in Task G that a fast-resolving route (mocked or naturally fast, e.g. a route hitting an already-warm cache) never shows the skeleton at all, and that a genuinely slow one does show it after the delay — not a unit-test assertion (jsdom won't animate), a live browser check.

### Tests (`skeleton.test.tsx`)

- `Skeleton` renders with `aria-hidden="true"`, respects `width`/`height`/`radius` props.
- `SkeletonRegion` renders `role="status"`, `aria-busy="true"`, no `aria-live` attribute present, and the visually-hidden label text is in the accessible name / text content.
- `DelayedReveal` renders its children in the DOM immediately (jsdom can assert presence; it cannot assert the CSS-timed visual delay — that's Task G's live-browser job).

### Verify

```bash
npx vitest run src/components/shared/skeleton.test.tsx
npx tsc --noEmit
npx eslint src/components/shared
```

---

## Task B: Candidate route loading states

**Depends on:** Task A committed (imports `Skeleton`/`SkeletonRegion`/`DelayedReveal` from `src/components/shared/skeleton.tsx`).

**Files:**
- Create: `src/app/candidate/matches/loading.tsx`
- Create: `src/app/candidate/jobs/[vacancyId]/loading.tsx`
- Create: `src/app/candidate/applications/loading.tsx`
- Create: `src/app/candidate/applications/[applicationId]/loading.tsx`
- Create (only if that page is genuinely server-loaded with a real wait — verify live first, per the P3.5 discovery's note that Profile/Account should only get this treatment "where server-loaded"): `src/app/candidate/account/loading.tsx` if `src/app/candidate/account/page.tsx` does real server data loading beyond a trivial auth check.
- Do NOT create a `loading.tsx` for onboarding — the discovery found onboarding already has good pending-state UX via `GroupNav`, and each step is a single cheap write; a route-level skeleton there would be surface-mismatched to a fast, already-well-handled flow.

**Requirements, per route:**

Read the real current page component first (`src/app/candidate/matches/page.tsx` and its rendered list component, likely `src/components/candidate-matches/*`; `src/app/candidate/jobs/[vacancyId]/page.tsx` → `src/components/candidate-job-detail/*`; `src/app/candidate/applications/page.tsx` → `src/components/candidate-applications/*`; `src/app/candidate/applications/[applicationId]/page.tsx` → `src/components/candidate-application-confirmation/*`) to learn the real row/section geometry before building a skeleton for it — a skeleton that doesn't match its surface's real shape is exactly what Global Constraint / P3.5 Section 8 (design row "05") forbids ("A generic grey block set is never reused across two different lists").

- **Matches** (`matches/loading.tsx`): skeleton the match-card list only. Any page chrome (heading, filters, nav) that the real page renders outside the data-dependent region should NOT be duplicated in `loading.tsx` unless it's cheap and stable — read the real page to decide what's truly static vs. data-dependent. Wrap the card-skeleton region in `SkeletonRegion label="Loading matches"` and `DelayedReveal`.
- **Job detail** (`jobs/[vacancyId]/loading.tsx`): skeleton the job-detail fields (title, meta, description) at the real component's geometry.
- **Applications list**: skeleton the row list, matching `ApplicationInventoryCard`'s (or equivalent) real shape.
- **Application detail / confirmation**: per P3.5 discovery Section 3.4/6/8, this route does the deepest sequential-load chain (confirmation → capabilities → history → outcomes) and was the flow explicitly measured. Skeleton only what's genuinely unknown until the request resolves — do not fabricate interim data (Global Constraint / design principle: "avoid fake data").

**Every `loading.tsx` in this task:**
- Must not render any interactive control (no fake buttons, no fake links) — skeletons are inert placeholders only.
- Must not render empty-state copy ("No applications yet") — that's a real state, not a loading state; showing it while data is still loading is explicitly forbidden by the P3.6 brief.
- Must not introduce horizontal layout shift versus the real content it precedes (verify by comparing rendered widths, not just by inspection).
- Must be wrapped in `DelayedReveal` so a fast response (per P3.5 Section 6, most candidate flows measured 51–82ms server-side locally) never flashes a skeleton at all.

### Tests

Component-level: none required beyond what Task A already covers, since `loading.tsx` files are thin compositions — but if a route's skeleton composition has any non-trivial logic (e.g., a count of skeleton rows matching a typical real count), add a focused test asserting that composition renders the right number of `Skeleton` elements with the right `SkeletonRegion` label.

### Verify

```bash
npx vitest run src/app/candidate
npx tsc --noEmit
npx eslint src/app/candidate
npm run build
```

Then live-verify (Playwright, against a fresh build) that navigating to each route: (a) on a fast response, no visible skeleton flash; (b) on an artificially slowed response (see Task G's controlled-slow-path pattern — you may add one temporary, clearly-marked slow-path test fixture here if useful for your own manual verification, but the durable slow-path E2E tests belong to Task G, not here) the skeleton appears and matches real content geometry with no layout shift on swap.

---

## Task C: Employer route loading states

**Depends on:** Task A committed.

**Files:**
- Create: `src/app/employer/page.tsx`'s sibling `src/app/employer/loading.tsx`
- Create: `src/app/employer/vacancies/loading.tsx`
- Create: `src/app/employer/vacancies/[vacancyId]/loading.tsx`
- Create: `src/app/employer/applications/loading.tsx`
- Create: `src/app/employer/applications/[applicationId]/loading.tsx`
- Create: `src/app/employer/verification/loading.tsx`
- Do NOT create one for `vacancies/new` (a create form with no meaningful server-loaded data to skeleton) unless you find on reading it that it genuinely loads something worth skeletoning first — verify, don't assume.

**Requirements, per route:** same discipline as Task B — read the real page/component first (`vacancy-list.tsx`, `application-list.tsx`, `application-detail.tsx`, the vacancy manage/detail page's readiness-checklist + lifecycle-actions composition, `employer/page.tsx`'s attention-slot/mini-list layout, verification's own status display) and build skeleton geometry that matches. `employer/applications/[applicationId]/loading.tsx` is the highest-value target in this task — it's the route P3.5 Section 6 measured as the one real outlier (94.8ms server / 129.5ms total, vs. 55–80ms elsewhere); this task does not fix that latency (P3.7's job), but it is exactly the route where an honest loading state matters most since the wait is measurably the longest today.

Per P3.5 discovery Section 3.3/6: the employer nav header (`EmployerVacancyPageHeader`) is currently re-rendered per-page, not from a shared layout (Global Constraint 4 forbids changing that in this phase) — your `loading.tsx` files render *only* the content region's skeleton; they must not attempt to render the header/nav themselves (Next.js's `loading.tsx` replaces the whole page-segment subtree below the nearest layout, and there is no employer-segment layout to preserve chrome across the swap in this phase — confirm this is really true for this route segment by reading the routing structure, and if it turns out the existing root layout already keeps some chrome stable across the swap, note that in your report; if not, that's an accepted, documented consequence of Global Constraint 4, not a bug to route around).

All the same constraints as Task B apply: no interactive controls, no empty-state copy, no fabricated data, `DelayedReveal`-wrapped, geometry-matched, no layout shift.

### Verify

```bash
npx vitest run src/app/employer
npx tsc --noEmit
npx eslint src/app/employer
npm run build
```

Same live-verification discipline as Task B.

---

## Task D: Public route loading states

**Depends on:** Task A committed.

**Files:**
- Create: `src/app/jobs/loading.tsx`
- Create: `src/app/jobs/[vacancyId]/loading.tsx`

**Requirements:** same discipline as Tasks B/C. Per P3.5 discovery Section 3.1, both routes are `force-dynamic`; `/jobs/[vacancyId]/page.tsx` also does a sequential (unfixed in this phase) `getUser()` call after `getDetail()` — this task skeletons the content region only, does not touch that data-loading shape. Auth forms (`/login`, `/register`, etc.) already have good pending-label UX per discovery Section 3.1 (PARTIAL, not MISSING) — do not add `loading.tsx` files to those routes; they were not flagged as needing route-level skeletons, and Global Constraint / brief instruction is explicit: "Auth forms already have useful pending labels; do not add unnecessary full-page skeletons merely for consistency."

### Verify

Same pattern as Tasks B/C, scoped to `src/app/jobs`.

---

## Task E: Employer application-status pending states

**Depends on:** none of the above (can run independently/in parallel with B/C/D in principle, but per subagent-driven-development discipline, dispatch sequentially like every other task).

**Files:**
- Modify: `src/components/employer-applications/application-status-actions.tsx`
- Modify: `src/components/employer-applications/status-transition-confirm-dialog.tsx`
- Modify: `src/components/employer-applications/employer-vacancies.module.scss` import target — actual stylesheet is `src/components/employer-vacancies/employer-vacancies.module.scss` (confirmed live: both components import styles from that shared module, not a local one — verify this hasn't changed before editing)
- Modify: `src/components/employer-applications/application-status-actions.test.tsx`
- Modify: `src/components/employer-applications/status-transition-confirm-dialog.test.tsx`
- Read (do not modify): `src/lib/employer/applications/status.ts` (for `employerApplicationActionLabel`) and `src/lib/employer/applications/transition-action-state.ts`

**This is the confirmed regression from P3.5 discovery** (Section 3.3, Section 5): both components currently do `disabled={pending || dialogOpen}` (or `disabled={pending}` in the dialog) with **no label change** — this is the exact gray-and-silent pattern every other async action in the codebase has already moved past.

### Required changes

1. **Ordinary transitions** (`application-status-actions.tsx:172-183`, the `ordinaryTransitions.map(...)` block): while `pending` is true for a given submission, the specific button that was pressed must show a pending label (e.g. `employerApplicationActionLabel(status)` swapped to its pending form — check `src/lib/employer/applications/status.ts` for whether a pending-label variant already exists; if not, add one small mapping alongside the existing label function, scoped to just the statuses this component renders — do not build a repo-wide label system per Global Constraint 5). The current code has no way to tell *which* button was pressed (only one shared `pending` boolean covers the whole form) — you will need to track the pressed status (e.g. a small local `useState<ApplicationStatus | null>` set on click, cleared when `pending` goes false, mirroring the existing `wasPending` ref pattern already in this file at lines 121-127) so only the pressed button shows the pending label while its siblings stay disabled-but-unlabeled (matching the existing sibling-lock behavior, which is correct and must be preserved).
2. **Terminal-transition openers** (lines 190-205): same treatment is not needed here in the same way, since clicking them only opens the dialog (no request yet) — but confirm `disabled={pending || dialogOpen}` still reads correctly once the dialog itself has its own pending state (item 3 below); this button's own label does not need to change since it never itself triggers the async request.
3. **`StatusTransitionConfirmDialog`'s real submit button** (`status-transition-confirm-dialog.tsx:145-155`) — this is the actual request-triggering control for Accept/Reject, and the highest-priority fix: while `pending` is true, its label must change (e.g. `copy.confirmLabel` "Accept application"/"Reject application" → a pending form such as "Recording…", matching the design artifact's own verb table in P3.5 discovery Section 8, row 03, which pairs both terminal application actions under "Recording…" specifically because "that is what the product does... Neither says 'Hiring' or 'Notifying'" — reuse that exact word, it's already the discovery's own recommendation and matches this codebase's existing convention of one verb per meaning, e.g. `void-outcome-button.tsx`'s "Voiding…", `record-outcome-form.tsx`'s "Recording…"). Also add `aria-busy={pending}` to this button. The Cancel button's `disabled={pending}` (line 141) is correct and unchanged.
4. **Both buttons should attempt to preserve their layout width** while pending, so the label swap doesn't cause a width jump — check whether the existing `.button`/`.buttonDanger`/`.buttonSecondary` classes in `employer-vacancies.module.scss` already have a stable min-width from prior work (P3's Task I added `--touch-target-min` height treatment) or whether a small addition (e.g. `min-width` derived from the longest label, or a CSS `width` reservation trick) is needed — read the current CSS before deciding, and keep whatever you add minimal and scoped to these specific button classes, not a global button-system change.
5. **`aria-busy`** must be added to whichever element(s) most directly represent "this control is busy" — likely the pressed button in the ordinary-transitions group, and the dialog's confirm button. Do not add it to every button in the group indiscriminately (only siblings that are disabled-because-something-else-is-pending are not themselves busy).
6. **Preserve exactly:** the application transition state machine (you are not touching `transition-actions.ts` or any RPC), terminal semantics (Accept/Reject still end the workflow the same way), the existing confirmation-dialog flow (open → confirm/cancel → auto-close-on-resolve), the existing focus-management effects (lines 112-133), and the existing `renderFeedback`/`role="status"`/`role="alert"` result rendering (lines 45-87) — none of that changes in this task.
7. **Do not add duplicate-submit protection beyond what already effectively exists** (`disabled={pending || dialogOpen}` already prevents a second click while the first is in flight) — Global Constraint 1 requires the pending state to be *legible*, not a new protection mechanism; the protection itself already works, per P3.5 discovery Section 3.4's confirmation that `disabled` re-rendering is the established, sufficient pattern used everywhere else in this codebase.

### Tests

Update/extend `application-status-actions.test.tsx` and `status-transition-confirm-dialog.test.tsx` to cover:
- Pressing an ordinary-transition button shows its pending label while pending, and reverts/updates correctly on resolution; sibling buttons stay disabled without gaining a pending label of their own.
- The dialog's confirm button shows "Recording…" (or your chosen exact pending copy — must match the design's rationale above) while pending, has `aria-busy="true"` while pending and not once resolved, and the Cancel button's existing disabled behavior is unchanged.
- No regression to the existing focus-management, auto-close-on-resolve, or terminal-state rendering tests already in these files.

### Verify

```bash
npx vitest run src/components/employer-applications
npx tsc --noEmit
npx eslint src/components/employer-applications
```

---

## Task F: Accessibility & pending-state polish (P3.6-touched surfaces only)

**Depends on:** Tasks A–E committed.

**Files:** touched only as needed — this task audits and polishes what Tasks A–E already changed, plus the small set of existing async-action components that sit directly alongside the routes Tasks B/C/D just added skeletons to, where a real gap is confirmed live (not assumed from the discovery doc alone — re-verify each claim against current source before touching it).

**Scope, precisely:**

1. **Re-audit every component Tasks A–E touched** for: `aria-busy` present where pending applies; no label-width jump (spot-check visually, not just by CSS reasoning); `role="status"`/`role="alert"` preserved unchanged; no `aria-live` added redundantly anywhere.
2. **Form pending/error sequence check** (per the brief's Scope E) on any form Tasks A–E touched or that sits immediately behind a new `loading.tsx` (e.g., if Task C's employer application detail skeleton precedes `ApplicationStatusActions`, confirm the full idle→pending→success and idle→pending→error sequences both leave the form in a genuinely actionable state afterward — no permanently disabled control after an error, no indefinite pending if a request fails). If you find a form in this narrow set with a real gap (e.g. a control that stays disabled after an error state, or an error message that shifts layout avoidably), fix it narrowly; do not expand this into a repo-wide form audit — Global Constraint / brief instruction: "Do not perform a broad form-system rewrite."
3. **Route-level `error.tsx` — only where tightly coupled to a `loading.tsx` you added.** For each new `loading.tsx` in Tasks B/C/D, check whether its route segment already has any error handling for a failed initial data fetch (per P3.5 discovery Section 3.3, none exist for employer routes today). Add a minimal `error.tsx` **only** where you judge the new loading boundary would otherwise fail unsafely (e.g., an uncaught render error leaving the skeleton frozen with no recovery) — most Server-Component data-fetch failures are already handled by existing `redirect()`-based patterns and may not need a new error boundary at all; read the real failure path for at least the employer application-detail and employer-vacancies routes before deciding. Where you decide not to add one, write one sentence in your report saying so and why (this satisfies the brief's "otherwise document it as deferred" instruction) — do not turn this into a whole-product error-page redesign.

### Verify

```bash
npx vitest run
npx tsc --noEmit
npx eslint .
npx prettier --check .
```

---

## Task G: Responsive, reduced-motion & E2E verification

**Depends on:** Tasks A–F committed — this is the task that proves the whole branch's UX work live, not a per-task spot-check.

**Files:**
- Create: e2e specs under `e2e/` for the flows named below — follow this repo's existing e2e conventions (check `e2e/` for the naming/helper pattern already used, e.g. the helpers referenced in P3.5's performance fork: `publishEligibleEmployerVacancy`, `registerAndApplyAsCandidate`, `transitionApplicationStatusAsEmployer` — reuse them rather than re-deriving fixtures).
- Modify: none of the product code from Tasks A–F unless this task's live verification surfaces a genuine defect — if it does, fix it narrowly here and note the fix in your report (a controller ruling, not silent scope creep).

### Controlled-slow-path pattern

Per the brief: "Add controlled-slow-path tests where practical so loading states are actually observable rather than relying on race timing." Check whether this repo's Playwright setup already supports request interception/throttling (`page.route(...)` with an artificial delay on the relevant RPC/API call) — this is the standard Playwright mechanism and should not require any product code change; it's a test-only technique. Use it for at least the flows explicitly named in the brief:

**Candidate:** Matches → job detail loading; Applications → application detail loading.
**Employer:** Home → Vacancies loading; Applications → application detail loading; application status-transition pending state (Task E's fix — verify the pending label actually appears and the sibling-lock behavior is intact under a real slowed request, not just in the component test).
**Public:** jobs → job detail loading, where meaningful (only if the earlier tasks judged this route worth a `loading.tsx` at all).

For each: verify (a) the loader appears when the artificial delay is long enough to cross the display-delay threshold; (b) a fast/unthrottled version of the same navigation never shows the loader at all; (c) no duplicate action submission is possible (for the status-transition case, attempt a rapid double-click under the slow path and confirm only one request fires); (d) an error response (mock a failure) leaves the UI in a recoverable state, not stuck loading forever; (e) nothing gets stuck in a loading state indefinitely even without an artificial error (a normal slow-but-successful response eventually resolves to real content).

### Responsive verification

At each of 360, 390, 430, 768, 1280, 1440, for every route touched in Tasks B/C/D/E:
- No horizontal scroll.
- Skeleton geometry stays inside the viewport (no overflow).
- Button pending labels (Task E) do not overflow their button or wrap awkwardly.
- The status-transition confirm dialog remains usable (per P3's existing responsive bottom-sheet treatment at narrow widths — confirm Task E's label change doesn't break that existing layout).
- Touch targets stay at the existing `--touch-target-min` size.

Produce real evidence (screenshots or scripted computed-layout assertions), not visual-inspection claims — this repo's own P3 history (Task I's brief) already flagged "a plausible-sounding claim of live verification without captured evidence" as insufficient once; do not repeat it.

### Reduced-motion verification

Using Playwright's `page.emulateMedia({ reducedMotion: 'reduce' })`, for each new skeleton/loading surface: confirm layout and information are identical to the normal-motion version (no animation-dependent content), and confirm content is never delayed *longer* under reduced motion than under normal motion (Global Constraint: reduced motion must be a faster/simpler experience, never slower — if your `DelayedReveal` display-delay is itself a CSS animation, verify the global reduced-motion override doesn't accidentally make the delay longer or the content permanently invisible; a `0.01ms` animation duration with an unchanged `animation-delay` could theoretically still wait out the delay before revealing at all — read your own Task A implementation carefully here and fix it in this task if you find that edge case).

### Full validation suite

Run on the branch's HEAD after this task's fixes (this is also effectively a rehearsal of the plan's final required validation, ahead of Task H's whole-branch review):

```bash
npm run lint
npx prettier --check .
npx tsc --noEmit
npx vitest run
npx playwright test   # or the relevant subset — full suite at least once before Task H
npm run build
```

---

## Task H: Final whole-branch review

Per subagent-driven-development: dispatch the final code reviewer on the most capable available model, covering the full branch diff against `main` at base `4b3c069474f06a4782fc33cf7f57db8afab77f20`. Apply the standard one-fix-wave, one-scoped-re-review discipline. Confirm explicitly in the review that:

- No file under `src/app/employer/layout.tsx` or `src/app/candidate/layout.tsx` was created (Global Constraint 4).
- No `Promise.all` conversion, N+1 batching, or notification-email change was introduced anywhere (Global Constraint 9) — a diff scan for touched files outside `src/components/shared/`, the named `loading.tsx`/`error.tsx` files, `application-status-actions.tsx`, `status-transition-confirm-dialog.tsx`, and their tests should show nothing else changed.
- No new CSS custom property was introduced that duplicates or parallels an existing token (Global Constraint 3).
- `src/app/candidate/account/export/**` is untouched (Global Constraint 6).
- No CI workflow file is touched (Global Constraint 10).

After this review is clean, do NOT merge. Per the controlling session's standing instruction for this unit: push the branch, open a PR against `main`, confirm CI is green on the exact final HEAD and the Vercel preview succeeds, then stop and report — the same discipline used for P3 and P3.5.
