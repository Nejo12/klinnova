# Klinnova Development Impact & Migration Plan

*Planning only — no repository changes made when this document was authored.*

A repo-grounded reconciliation of the Klinnova Design System Spec and Visual Validation against the current Stint codebase, product contracts, and M5.1 sequencing — for founder and Development review.

**Base:** main @ `592062b3b564a6cf596a9b434dbfe640647effdc` (post PR #79)
**PR #80 (Unit D):** untouched by this plan
**PR #81 (baseline stabilization):** untouched by this plan
**Repository changes made while authoring this plan:** none

> **Note on currency:** this document was authored before the founder's logo preference was updated to Option 2 (the angled doorway/aperture). Section 2 and section 17 below still reflect the *earlier* state, where the founder-approved direction was the two-segment step-evolution mark and Visual Validation's Option 2 recommendation was treated as a conflict to be resolved in the two-segment direction's favor. That conclusion is now superseded by the founder's current preference. This document is transferred here unedited, exactly as authored; the discrepancy is called out explicitly in the transfer commit's completion report rather than silently corrected.

---

## 1. Executive verdict

**Ready for implementation planning, not for implementation.** Nothing found in the repository blocks starting a bounded Klinnova technical-preparation unit later. But three things need resolution before Development scopes actual work, and this document resolves the first two by hierarchy and flags the third for founder review.

**What's already true:**

- Reduced-motion handling exists globally today (`globals.scss`) — no new implementation needed for that alone.
- Vacancy lifecycle is already one field with six states — the "Draft/Published/Paused/Filled/Closed" requirement is a copy-only rename, not a schema change.
- Candidate IA already has the same four destinations Klinnova proposes (Matches, Applications, Profile, Account) — only the bottom-tab-bar presentation is new.
- No logo asset exists anywhere in the repo today — this is greenfield work, not a replacement.

**Major risks:**

- Visual Validation directly contradicts two of the four founder decisions supplied at authoring time (logo direction, tagline). Resolved below by the stated hierarchy — but worth explicit founder re-confirmation since Visual Validation was produced without apparent knowledge of decision A. (See currency note above regarding the logo conflict specifically.)
- One Visual Validation mockup shows an application state ("Interview set") that doesn't exist in the product's status model at all — no scheduling-related data is tracked anywhere.
- The employer/admin left-sidebar is a genuine **RESTRUCTURE**, not the lighter lift its position in the design doc might suggest — every employer page's outer wrapper changes.

**Recommended interaction with Unit E:** Hybrid (option C, §8) — build Unit E now on the current, live token system, because Klinnova's own migration matrix already classifies the primitives Unit E needs (buttons, badges, timeline) as **DEFER** or token-only **RESTYLE**. Building on unfinished, unapproved primitives would mean building the rebrand foundation and Unit E at the same time — exactly the "rebrand as excuse for redesign" risk the design brief itself warns against — and would delay a real M5 beta-measurement requirement behind non-measurement work.

---

## 2. Source-of-truth reconciliation

Per the stated hierarchy at authoring time (founder decisions → Design System Spec → Visual Validation → repo/product contracts → report-for-review), three items in the supplied Visual Validation directly conflicted with the founder decisions supplied at that time. All three resolved the same way: **the founder decision stands; the Visual Validation recommendation is recorded as evidence only.**

> **Conflict 1 — Logo direction.** Visual Validation §01 recommends **Option 2, "the open door"** over the step-evolution direction, citing risk that the step mark "reads as a Stint variant." Decision C as supplied at authoring time approved the **two-segment step-evolution direction**, provisionally, pending the small-size validation checkpoint (§11) — not Option 2. Visual Validation's concern is real design feedback worth having in the room when the checkpoint sign-off happens, but at authoring time it did not change which direction Development prepares.
>
> *(Superseded — see currency note at the top of this document. The founder's current preference is Option 2.)*

> **Conflict 2 — Tagline.** Visual Validation §06 recommends "reposition, not retire" — keeping "One step closer" as public candidate-facing marketing/app-store/onboarding copy, and explicitly states this "supersedes the prior document's retire recommendation." Founder decision A as supplied is more specific: **retire it as a public tagline entirely** (candidate-side included), retain only as an internal design principle, with public candidate-only reuse requiring separate future approval. Because that decision post-dates and is more specific than Visual Validation's internal reasoning about the Design Spec, it governs.

> **Conflict 3 — Blue informational state.** Visual Validation §04/§07 recommends dropping the blue `--info` token, arguing it "added a fifth hue" the palette otherwise avoids. Founder decision D keeps it explicitly: semantic clarity over palette purity. This also reverses the Design System Spec's own draft — the Spec listed removing blue as an open question for founder review; Visual Validation then treated its own recommendation as settled. It is not; the founder decision settles it in the other direction.

> **Repo/product contract holds firm.** The **application status model** (`submitted | reviewing | shortlisted | accepted | rejected`) and the **outcome-event model** being added by Unit D (`interview_completed | hired`, explicitly excluding any scheduling/invitation state) remain authoritative. Visual Validation's candidate Applications screen shows a status labelled **"Interview set"** with a scheduled date/time — this does not correspond to any status, outcome type, or stored field anywhere in the current schema or in Unit D. See §6 for the full breakdown; this is reported, not silently resolved by inventing a new state.

Two smaller notes, not conflicts: AGENTS.md's own product-language guidance ("every interaction should reduce uncertainty or move someone one step closer") embeds the retiring phrase directly into engineering guidance prose — worth a documentation pass eventually, not touched here. And the four pillars (Seen, Progress, Dignity, Trust) are treated by both supplied documents as design/product principles, not literal UI badges — consistent with the instruction not to manufacture per-pillar UI treatment.

---

## 3. Current repository design/architecture map

### Tokens

The live token system (`src/styles/tokens.css`) is the exact V1 baseline recorded as decision **D-017** in `docs/06-design-system.md` — the two files match value-for-value. Two-layer system: primitive colours (oxblood/paper/cream/clay/olive/ink/line) feeding semantic aliases (`--color-bg-page`, `--color-action-primary`, etc.). Spacing, radius, shadow, motion, z-index, and a dedicated step-motif token group all already exist. `src/styles/breakpoints.scss` defines four SCSS breakpoints (30/48/64/80rem); `src/styles/globals.scss` already contains a global `@media (prefers-reduced-motion: reduce)` block disabling animation/transition duration and scroll-behavior — this is the one piece of "development question" infrastructure confirmed to exist without qualification.

Font: `--font-family-ui` lists **Inter as an optional system-stack entry only** — D-017 explicitly forbade bundling it as a real webfont in Slice 0, and no `next/font` usage or font file exists anywhere in `src/` today. The current app renders in whatever sans-serif the visitor's OS provides. This means adopting DM Sans is genuinely new work, but on a clean slate — there is no existing webfont pipeline to migrate off.

### Shared primitives & shells

| Component | Path | Actual role today |
|---|---|---|
| `BrandMark` | `src/components/brand-mark.tsx` | Text-only wordmark ("Stint"). No logo graphic exists anywhere in the repo — `public/` is empty except `.gitkeep`. |
| `ShellHeader`, `CandidateShell`, `EmployerShell` | `src/components/{shell-header,candidate-shell,employer-shell}.tsx` | Landing-page-only marketing preview sections (used once, in `src/app/page.tsx`). Not the real authenticated app shells — a common misreading risk when scoping this work. |
| `StepProgress` | `src/components/step-progress.tsx` | The literal step-motif implementation — currently only rendered inside the landing page's marketing preview, not inside real onboarding. Real onboarding progress uses a separate mechanism (see `src/lib/onboarding`). |
| `CandidateAppHeader` / `CandidateNav` | `src/components/candidate-nav/` | The **real** authenticated candidate header (M5.1 Unit B / D-M5-20). Top horizontal nav, four items (Matches, Applications, Profile, Account), sign-out deliberately excluded from nav and placed only in Account. |
| `EmployerVacancyPageHeader` | `src/components/employer-vacancies/employer-vacancy-page-header.tsx` | The **real** authenticated employer header, already consistently reused across every employer page (home, vacancies, applications, verification). Top horizontal nav, four items, `LogoutButton` rendered directly in the header (not consolidated into an Account destination the way candidate nav was). |
| `InternalNav` / `InternalLayout` | `src/components/internal-shared/`, `src/app/internal/layout.tsx` | Minimal two-item flat nav (Verification, Employers) shared via a real Next.js nested layout. No dashboard framing, no sidebar. |
| `CapabilityNav` | `src/components/employer-onboarding/capability-nav.tsx` | Candidate/Employer switcher for dual-capability accounts (D-047) — appears in both candidate and employer headers. |
| `PublicFooter` | `src/components/public-shared/public-footer.tsx` | Legal nav (Privacy/Terms/Impressum), shared across public/auth pages only — not present on authenticated dashboards. |

### No sidebar pattern exists anywhere

A repo-wide search for "sidebar" returns zero matches. Nothing to migrate away from — but nothing to extend either; a left-sidebar employer/admin shell (§6, §9 slice K5) is new construction using Next.js App Router's nested-layout mechanism, not a restyle of an existing pattern.

### Candidate / employer / admin / public surfaces (routes)

Verified directly from `src/app/`, not assumed from `docs/07-architecture.md` (which lists earlier, superseded route names like `/employer/profile` and `/employer/company` that no longer exist). Actual current routes:

- **Candidate:** `/register /login /candidate /candidate/onboarding /candidate/matches /candidate/jobs/[vacancyId] /candidate/applications /candidate/applications/[id] /candidate/account /candidate/account/delete` (+ `/candidate/account/export` as a route handler, not a page)
- **Employer:** `/employer/register /employer/onboarding /employer /employer/vacancies /employer/vacancies/new /employer/vacancies/[id] /employer/vacancies/[id]/edit /employer/applications /employer/applications/[id] /employer/verification /employer/account/delete` (+ export route handler)
- **Admin/operator:** `/internal/verification /internal/verification/[id] /internal/employers /internal/employers/[id] /internal/employers/[id]/vacancies/[id]`
- **Public/auth/legal:** `/ /jobs /jobs/[id] /forgot-password /reset-password /auth/error /account/choose /impressum /privacy /terms`

---

## 4. Brand-surface inventory

Grep-verified across `src/`, `e2e/`, `supabase/` — 51 files reference "Stint" in code (excluding docs). Grouped by disposition, not by file count.

| Class | Representative evidence | Disposition |
|---|---|---|
| Public / user-visible | Every auth/legal page renders a raw hardcoded `<Link>Stint</Link>` wordmark (not via `BrandMark` — a pre-existing inconsistency worth folding into the same pass); `CandidateAppHeader`/`EmployerVacancyPageHeader` render `Stint` as literal text; account-deletion copy ("Delete my Stint account," "Your Stint account has been deleted"). | RENAME |
| Metadata / SEO | Every page sets `metadata.title = "<Page> · Stint"`; root layout sets `description: "One step closer."` — the single most visible occurrence of the retiring tagline. No manifest.json, no OpenGraph image, no `sitemap.ts`/`robots.ts` exist today. | RENAME (title/description) + DEFER (no OG/manifest/sitemap exists to touch) |
| Auth / email | `NEXT_PUBLIC_SITE_URL` (`src/lib/env/public.ts`) drives `resolveSiteOrigin`/`resolveRedirectOrigin` (`src/lib/auth/site-origin.ts`) for every Auth email redirect and same-app confirm callback. No literal brand string in the redirect logic itself — see §7 for the domain-specific plan. | DEFER here; full plan in §7 |
| Legal / support | `src/app/impressum/page.tsx`, `privacy/page.tsx`, `terms/page.tsx` all reference "Stint" in both title and body copy ("the legal entity operating Stint," "Stint connects candidates in Berlin with employers…"). `PublicFooter`'s link labels (Privacy/Terms/Impressum) are already generic and need no rename. | Founder/legal-gated — see §15, not a Development-only rename |
| Deployment / config | `PRODUCTION_HOSTS = new Set(["stint.company","www.stint.company"])` in `src/lib/proof/local-environment-guard.ts` — a real safety gate that refuses to run local proof scripts against Production by hostname. `stint.company` also appears in ~14 test files as the fixture value for `NEXT_PUBLIC_SITE_URL`. | Decision required at cutover — see §7 |
| Tests / fixtures | 15 Playwright assertions across 6 spec files select on literal brand text or tagline text (`getByRole("link",{name:"Delete my Stint account"})`, `getByText("Stint")`, tagline heading text). Full list in §13. | RENAME — copy-driven maintenance, not weakening |
| Documentation | 50 docs files under `docs/` reference Stint extensively as historical decision/PR record (D-001–D-090, slice closures, hosted-proof runbooks quoting `https://stint.company`). | Historical — do not rewrite. These are audit trail, not live product surface. |
| Internal code identifiers | `package.json` `"name": "stint"`; `supabase/config.toml` `project_id = "stint"` (local Docker project naming only — the real hosted Supabase project ref is `kvrzmzoszitdicjvrprt`, already opaque); GitHub repo `Nejo12/stint`; component names like `CandidateShell`, `stint`-prefixed env keys. | Retain. A public rename does not imply renaming internal identifiers — none of these are user-visible, and renaming the npm package name or local Supabase project ref mid-beta adds real friction for zero user-facing benefit. |

---

## 5. Design-system gap analysis

This is the same matrix requested again in §9 as bounded slices — presented once here at component/area grain, grouped into shippable units there. Classification follows the Design Spec's own legend, applied against what's actually in the repo rather than against how different a mockup looks.

Legend: **DEFER** already conforms or untouched · **RENAME** label/copy only · **RESTYLE** visual values change, structure doesn't · **RESTRUCTURE** layout/hierarchy changes.

| Area | Current | Klinnova requirement | Class | Reason |
|---|---|---|---|---|
| Color tokens | `tokens.css`, D-017 baseline | Same token names, lightened oklch values, blue info state **kept** (decision D) | RESTYLE | Semantic names already map 1:1; only underlying values change. |
| Type tokens / font family | System sans stack; Inter never actually loaded | DM Sans 400–700, tabular numerals for admin tables | RESTYLE | Same scale/roles; swap the family via `next/font/google`, zero new dependency (§14). |
| Wordmark ("Stint") | `BrandMark` text component + ~15 hardcoded literals | "klinnova" lowercase, DM Sans 600, tightened tracking | RESTRUCTURE | Design Spec itself classifies this as restructure ("not a find-and-replace") — new typography treatment, not just a string swap. |
| App icon / logo mark | None exists | Two-segment mark (founder-approved direction *at authoring time — see currency note*), ring+dot recognition device | RESTYLE in spirit, new build in practice | No legacy asset to evolve from — greenfield. Gated on §11 checkpoint. |
| Button / input / chip / badge primitives | Defined by D-017 tokens, consumed via SCSS Modules; no dedicated primitive component library yet — styles are largely per-feature SCSS Modules following the tokens | Same states/structure, new color values only | DEFER → RESTYLE | Structure and interaction states already match the spec's description; only token values need to flow through. |
| Progress / step motif | `StepProgress` used only in the landing-page marketing preview today; real onboarding uses its own mechanism | Scope the literal step graphic to onboarding only; elsewhere use timelines/chips/counts | RESTYLE | Already narrowly scoped by circumstance — the current implementation isn't decoratively repeated anywhere, so no removal work is needed, only the color/token pass. |
| Job card | `src/components/candidate-job-detail/`, `candidate-matches/` | Unchanged structure per spec | DEFER | Spec explicitly says no changes needed. |
| Application status timeline | Real, already vertical-on-mobile per Slice 6 | Same pattern, reused not duplicated | DEFER | Matches spec's own description of what to keep. |
| Employer verification badge | Exists (Slice 5), attestation-based | Single olive badge, tappable explanation | RESTYLE | Recolor only per Klinnova's own matrix note. |
| Vacancy lifecycle labels | Single field `publication_state`: draft/published/paused/filled/expired/withdrawn | Draft/Published/Paused/Filled/Closed, displayed explicitly instead of generic "drafts" | RENAME | Field already exists — confirmed by migration inspection, not assumption. One small open item: does "Closed" cover both `expired` and `withdrawn`, or does it need two labels? (§17) |
| Candidate navigation (IA) | `CandidateNav`: top horizontal links, same 4 items (Matches/Applications/Profile/Account) | Bottom tab bar, same 4 items | RESTRUCTURE | Content model already matches exactly (Unit B/D-M5-20 already landed this IA); only the physical placement/chrome changes. |
| Employer navigation (IA) | `EmployerVacancyPageHeader`: top horizontal nav, 4 items (Home/Vacancies/Applications/Verification), sign-out inline in header, no Account destination | Left sidebar, 5 items incl. Account, sign-out moved out of primary nav | RESTRUCTURE | Biggest structural item in this plan — new nested layout, new Account destination, sign-out relocation mirroring the candidate-side D-M5-20 precedent. Full feasibility answer in §6. |
| Admin/operator navigation | `InternalNav`: flat 2-item nav via a real nested layout | Not explicitly specified by either document beyond "employer/admin" | DEFER | Out of stated scope; two items don't warrant a sidebar. Revisit only if the admin surface grows. |
| Domain, legal footer, deletion flow | Live, Slice 8-complete | Not a design concern per the Spec itself | DEFER | Explicitly flagged by the source document as Development/legal-only, not design scope. |

---

## 6. Answers to Development questions from the design package

**1. Is a left-sidebar employer/admin navigation feasible given current routing, or does it need a larger refactor?**

Feasible, and it's exactly what Next.js App Router's nested `layout.tsx` mechanism is for — `src/app/internal/layout.tsx` already proves the pattern at small scale. But it's real structural work, not a restyle: there is currently no `src/app/employer/layout.tsx` at all, and every employer page independently imports and renders `EmployerVacancyPageHeader` as an inline top-of-page component. Implementing a sidebar means introducing that missing layout file, extracting navigation out of the per-page header into a persistent sidebar, and restyling every employer page's content area to sit beside a fixed rail instead of full-width below a header — plus the ≤430px collapse-to-top-bar behavior the spec itself calls for. Not a "larger refactor than this rename should trigger," but sized correctly as its own slice (K5, §9), not folded into a token pass.

**2. Can vacancy lifecycle states be modeled as a single field today, or does "Vacancy drafts" reflect an existing constraint?**

Yes — confirmed directly from the migration, not assumed. `public.vacancies.publication_state` already has the check constraint `in ('draft','published','paused','filled','expired','withdrawn')`. Five of Klinnova's five proposed states map directly; the sixth, "Closed," needs one small copy decision — the real schema distinguishes `expired` (time-based) from `withdrawn` (employer-initiated), and the mockup collapses both into one "Closed" label. That's a genuine open question, not a blocker: either "Closed" becomes a shared display label for both states, or Development renders two distinct labels. Either way, no new column, no new migration.

**3. Are tabular/monospace numeral fonts available today, or does that require a new font/file?**

`--font-family-mono` exists as a token but `font-variant-numeric: tabular-nums` is used nowhere in the codebase today (zero matches) — because no digit-dense admin table exists yet to need it. No new font file is required: `font-variant-numeric: tabular-nums` is a CSS property that works with system fonts and with DM Sans equally; it just hasn't been declared anywhere because the employer/admin surfaces dense enough to need it (Unit E's outcome data, in particular) don't exist yet.

**4. Does the reduced-motion media query already gate existing animations, or does the new system need net-new implementation work?**

Already gated, globally, today — `src/styles/globals.scss` wraps a `@media (prefers-reduced-motion: reduce)` block around `animation-duration`, `animation-iteration-count`, `transition-duration`, and `scroll-behavior`, forcing near-instant values. Adopting Klinnova's new motion token *values* (§K duration/easing) is additive to `tokens.css`; the enforcement mechanism itself needs no new work.

### Additional Development-facing questions raised by the Visual Validation pass

**Are the employer dashboard stats (hire rate, response time) real or illustrative?**

Visual Validation already self-flags these as placeholders. One concrete fact to add: **hire rate becomes nearly computable once Unit D (PR #80) merges** — active `hired` outcome events divided by total applications is a direct query. **"Response time" is not tracked anywhere today** — no timestamp captures "first employer view or action" on an application. That's new instrumentation, a real product decision, not something this plan resolves.

**Does the icon system assumed by the Design Spec ("continuing the inherited Lucide-style language") actually exist?**

**No — this is a false assumption in the supplied Design Spec, not a gap in this plan.** `package.json` has no icon library dependency at all (no `lucide-react`, nothing else). There is no icon system to "continue." See §14 for the dependency call.

**Is the profile "60% complete" indicator shown in Visual Validation §02 real today?**

No — flagged independently, since neither supplied document caught it. The current completion model (`src/lib/onboarding/candidate-completion-status.ts` and the DB-side `_profile_first_incomplete_group` function) is a *gate* — complete or not, and which group is first-incomplete — not a percentage. Computing a numeric percentage is new, small work, parallel to the employer-stats caveat Visual Validation already raised for itself.

**Does "1 document requested" (employer verification) correspond to a real feature?**

No. Current employer verification (Slice 5) is attestation-based — profile fields plus a declaration, no document upload. Document-based verification was explicitly parked in `NOT_NOW.md` ("Employer verification document uploads (Storage)... pulls retention/privacy complexity forward"). Visual Validation already correctly self-flags this as layout-only, not a real requirement — confirmed, not contradicted.

---

## 7. Domain / auth cutover impact plan — planning only, no mutation

### What actually controls this today

`NEXT_PUBLIC_SITE_URL` (`src/lib/env/public.ts`) is the single canonical origin. It feeds `resolveSiteOrigin` (used for every `emailRedirectTo`/`redirectTo` passed to Supabase Auth — signup confirmation, password recovery) and `resolveRedirectOrigin` (used for same-app confirm/callback redirects, with a strict allow-list of `localhost:3000`, `127.0.0.1:3000`, and whatever host the resolved site URL itself has — it does *not* trust the request's `Host`/`X-Forwarded-Host` headers). Because that allow-list derives from the same env var, changing `NEXT_PUBLIC_SITE_URL` automatically updates it — no separate list to hunt down for that mechanism specifically.

> **One real safety item to carry forward.** `src/lib/proof/local-environment-guard.ts` hardcodes `PRODUCTION_HOSTS = new Set(["stint.company","www.stint.company"])` — the guard local proof scripts (`pnpm proof:*`) use to refuse ever running against Production. If `NEXT_PUBLIC_SITE_URL` in Production changes to the Klinnova domain without this set being updated in the same change, the guard silently stops recognizing the real Production host — a fail-open safety regression, not a cosmetic gap. This must ship in the same PR as the env-var flip, not "eventually."

### Order that minimizes auth breakage

1. Add the Klinnova domain to the Vercel Production project as an *additional* custom domain — Vercel supports multiple domains resolving to one project simultaneously; `stint.company` keeps serving unchanged.
2. Add the Klinnova domain to Supabase Auth's Site URL / additional-redirect-URLs allow-list (additive; does not remove the existing one).
3. Validate a full real auth journey (register → confirm → password reset) against the new domain while it is *not yet* canonical — ideally in Preview first, once Preview is restored (an existing, separately-tracked Cohort A readiness item, not something this rebrand should race).
4. Only then flip the Production `NEXT_PUBLIC_SITE_URL` env var to the new domain and redeploy.
5. **In the same change as step 4:** update `local-environment-guard.ts`'s `PRODUCTION_HOSTS`.
6. Decide the old domain's fate (see below) — separately from the technical cutover.
7. Update metadata/title/OG references, legal-page domain mentions, and any email-template domain references (none found templated outside GoTrue's own hosted mailer today — Auth emails go through Supabase's built-in mailer per the password-recovery unit's work, not a custom React Email template in this repo).

### What can safely coexist

- Both domains resolving in Vercel simultaneously — normal, supported, no conflict.
- Both hosts present in Supabase's Auth allow-list at once.
- Both hosts present in `PRODUCTION_HOSTS` at once — being permissive here only makes the "refuse Production" guard *stricter*, never looser, so there's no reason to remove the old entry quickly.

### What must change atomically

Only the pairing in step 4/5 above: the env-var flip and the safety-guard update, together, one PR. Nothing else in this repo requires a synchronized multi-system change — no CSP/security-header configuration, no cookie-domain override, and no `sitemap.ts`/`robots.ts` anywhere in `src/app` were found to update (none exist today, so there's nothing to break, but also nothing protecting SEO during the transition — a possible future gap, not a cutover blocker). One caveat not exhaustively verified: whether any Supabase Auth cookie is set with an explicit domain attribute anywhere in the Supabase-managed session flow — no repo-side override was found, but not every cookie write in the Supabase SSR helper library itself was traced.

### Rollback

Low-risk by construction as long as the old domain was never fully decommissioned: revert the `NEXT_PUBLIC_SITE_URL` env var, redeploy, and revert Supabase's primary Site URL setting. Both domains continuing to resolve throughout the transition window is what makes this cheap.

### Requires founder authorization at cutover time — not decided here

The actual DNS/Vercel domain attachment; the actual Supabase dashboard changes; the actual `NEXT_PUBLIC_SITE_URL` Production flip; and the old-domain decision (continue serving indefinitely, redirect, or eventually decommission).

---

## 8. Unit E integration recommendation

**Recommend Hybrid (C):** build Unit E's employer outcome-recording/void UI and candidate-safe outcome display directly on the current, live Stint token system and existing shared primitives — no Klinnova foundation slice first.

### Why not A (build directly on approved Klinnova primitives)

There is nothing to build "on" yet. The palette needs founder re-confirmation on the info-token question (already resolved by decision D, but the Spec/Validation disagreement means the actual CSS values need one more explicit pass), DM Sans isn't loaded, and the logo is pending the §11 checkpoint. Treating Unit E as blocked on Klinnova would mean standing up the rebrand foundation and Unit E simultaneously — precisely the "rebrand as an excuse for redesign" failure mode the design brief itself warns against — and would delay a real M5 beta-measurement requirement (Unit D/E) behind non-measurement work, which D-M5-1's feature freeze doesn't authorize.

### Why C over plain B

B ("stay behavior-first, migrate visuals afterward") is correct but underspecified on cost. The reason C is safe, not just expedient: Klinnova's own migration matrix (§5) already classifies every primitive Unit E actually touches — buttons, status badges, the application timeline — as DEFER or token-only RESTYLE. That means Unit E built today is not throwaway UI; it's exactly the shape a later token-only pass would restyle in place, with zero structural rework. The one Unit E surface with any real design-system tension is the vacancy-status/outcome vocabulary itself (§6, §2's "Interview set" discrepancy) — and that's a product-semantics question this plan explicitly does not resolve by invention, not a visual-system question.

---

## 9. Proposed implementation slices — not implemented

Derived from the gap analysis in §5, grouped by what can ship and be reviewed independently. Not a mechanical foundation-first ordering — K6 and K7 are fully independent of everything else, for instance.

### K1 — Token foundation (RESTYLE)

Swap primitive/semantic colour values in `tokens.css` to the Klinnova palette (info token retained per decision D); load DM Sans via `next/font/google`; add Klinnova's new motion-duration values alongside the existing reduced-motion gate.

- **Depends on:** final sign-off on exact palette values (info-token question already resolved; light-field/oxblood-ratio values still need a literal review pass against §D's oklch values).
- **Non-goals:** no component restructuring; no copy changes.
- **Proof:** existing component tests must pass unchanged (values change, not structure); a visual/contrast check against §O's minimums.
- **Blocks Cohort A:** No.

### K2 — Shared primitive restyle (RESTYLE)

Buttons, inputs, chips, badges, the application timeline, the verification badge — recolor only, inheriting K1's tokens. Per Klinnova's own matrix, these already match required structure/states.

- **Depends on:** K1.
- **Non-goals:** no new components, no new states.
- **Proof:** existing Vitest/Testing Library suites for each primitive stay green; visual spot-check against §H.
- **Blocks Cohort A:** No.

### K3 — Wordmark & brand-copy rename (RESTRUCTURE)

`BrandMark` component (new typography treatment, DM Sans 600, tightened tracking), the ~15 hardcoded literal "Stint" strings, every page-title metadata string, tagline retirement to internal-only (root layout `description` changes).

- **Depends on:** K1 (font must be loaded first); founder timing call on atomic-vs-incremental public exposure (§10).
- **Non-goals:** no logo graphic yet (K7); no domain change (K8).
- **Proof:** the 15 identified E2E brand-copy assertions updated deliberately (§13) — copy-driven maintenance, not weakened tests.
- **Blocks Cohort A:** founder's call — not a technical requirement.

### K4 — Candidate bottom-tab navigation (RESTRUCTURE)

Move `CandidateNav`'s existing four destinations from the top header into a bottom tab bar per Klinnova §I. Same items, same order, same `aria-current` contract — only placement and chrome change.

- **Depends on:** K1/K2.
- **Non-goals:** no new nav destinations; sign-out stays inside Account per D-M5-20, unchanged.
- **Proof:** reuse/extend the existing 360/390/430px accessibility E2E pattern already established for candidate nav (Unit B).
- **Blocks Cohort A:** No — current top nav is fully functional.

### K5 — Employer/admin sidebar shell (RESTRUCTURE)

The largest slice. New `src/app/employer/layout.tsx`; extract navigation out of `EmployerVacancyPageHeader` into a persistent sidebar; add the missing **Account** destination; move sign-out out of the header into Account, mirroring the candidate-side D-M5-20 precedent; ≤430px collapse to top bar + overflow menu per §J.

- **Depends on:** K1/K2; confirmed feasibility already established in §6 (Q1) — App Router supports this natively.
- **Non-goals:** no new employer capabilities; no change to any authorization/RLS boundary.
- **Proof:** every existing employer E2E journey re-run unchanged in outcome (nav relocation must not change route behavior); new responsive proof at the widths in §12.
- **Blocks Cohort A:** No — current flat nav is fully functional.

### K6 — Vacancy lifecycle copy rename (RENAME)

Display labels only: Draft/Published/Paused/Filled/Closed, replacing the generic "drafts" framing. Requires resolving the `expired`-vs-`withdrawn` "Closed" mapping first (§17).

- **Depends on:** nothing — fully independent, smallest slice in this plan.
- **Non-goals:** no schema/migration change — confirmed unnecessary in §6.
- **Proof:** copy-assertion test updates only.
- **Blocks Cohort A:** No.

### K7 — Logo/mark implementation (RESTYLE, new build)

Only after the §11 small-size validation checkpoint produces real assets and the founder gives final written sign-off — separate from the already-provisional direction approval.

- **Depends on:** §11 checkpoint; Design deliverables listed there.
- **Non-goals:** no favicon/app-icon shipped before the checkpoint passes.
- **Proof:** visual proof at every size/context listed in §11.
- **Blocks Cohort A:** No — no logo exists today either, so this changes nothing about current readiness.

### K8 — Domain / auth cutover execution (RESTRUCTURE, infra)

Execution of the plan in §7. Requires explicit founder authorization at each hosted step per the hard-stop list this planning pass operated under.

- **Depends on:** founder timing decision (§10, §17) relative to K3's public exposure.
- **Non-goals:** no DNS/Vercel/Supabase change happens as part of any other slice.
- **Proof:** full real auth journey validated pre-cutover, per §7's ordering.
- **Blocks Cohort A:** only if the founder wants the new domain live before Cohort A — Preview restoration is the actual existing gate.

### K9 — Accessibility/responsive regression pass (verification)

Full sweep of §12/§13 across every surface touched by K1–K6, run once the visible slices land.

- **Depends on:** K1–K6.
- **Non-goals:** no new features discovered here get implemented inline — findings get their own follow-up.
- **Blocks Cohort A:** No, but recommended before any public cutover (K8).

---

## 10. Rollout strategy

**Staged technical migration, one coordinated public cutover.** K1/K2 (tokens, primitive restyle) are invisible to the brand identity itself — a color/spacing pass reads as "Stint got a visual refresh," not as a company rename, so these can ship quietly whenever ready. K4/K5 (navigation restructure) are also brand-neutral — a bottom tab bar or sidebar doesn't announce a new company name.

K3 (wordmark/copy), K7 (logo), and K8 (domain) are the actual public identity change and should land together, close in time, to avoid the exact thing the source documents warn against: a visitor seeing "klinnova" in the header while the URL still reads `stint.company`, or vice versa. Internal code identifiers (§4's last row) are explicitly excluded from this cutover — no reason to touch `package.json`'s name, the local Supabase project ref, component names, or the GitHub repo during a beta.

---

## 11. Logo small-size validation checkpoint — not implemented

Founder decision C as supplied at authoring time was the two-segment direction, not Visual Validation's Option 2 — provisional, pending this checkpoint. *(See currency note at the top of this document: the founder's current preference is now Option 2, the angled doorway/aperture. The checkpoint requirements below apply regardless of which direction is finalized.)* No asset exists in the repository today to replace — this is new construction against a clean slate.

### Required proof before implementation

- Favicon at 16px and 32px
- Navigation/icon use at 20–24px
- Browser tab rendering (actual browser chrome, not an isolated crop)
- Mobile home-screen/shortcut icon context, if the product ever gets a PWA manifest (none exists today — see §4)
- Light background, dark background, and solid-tile-on-photography conditions the product actually supports today (confirmed: no photography surfaces exist in the current product — this reduces to light/dark/solid paper only)
- Recognizable silhouette test at the smallest supported size
- Stroke/negative-space degradation check — does the mark survive simplification below 20–24px?
- Non-text contrast check against the palette in §D

### What Development needs from Design before implementation

Final vector source (SVG) for the mark at each reference size above; the monochrome variant; written confirmation of clear-space and minimum-size rules from Design Spec §C; and explicit written founder sign-off *after* this checkpoint — a provisional approval is not a substitute for it.

---

## 12. Accessibility / responsive verification plan

| Surface | Widths | Already covered | Needs new proof |
|---|---|---|---|
| Candidate | 360 / 375 / 390 / 430px | 360/390/430 already exercised by the real Unit B accessibility E2E suite (`e2e/candidate-navigation-ia.spec.ts`) — keyboard/focus reachability and no-horizontal-overflow are already proven at these widths for the current top-nav. | Same checks re-run once K4 (bottom-tab restructure) lands — a layout change invalidates the existing proof's assumptions about where focus order/landmarks live. |
| Employer | 1280 / 1440 desktop; 390/430 narrow fallback | Desktop-first functional coverage exists in the current employer E2E journeys, but explicit multi-width viewport parametrization (1280 vs 1440) was not found in those specs — worth confirming precisely before relying on it. | Full new proof once K5 (sidebar) lands, since the layout itself is new: sidebar collapse behavior, stacked-card table fallback, "best viewed on desktop" notice for vacancy creation/bulk actions. |
| Admin/operator | Desktop primary; narrow functional fallback | Minimal surface today (2-item flat nav) — implicitly covered by general layout, no dedicated responsive suite. | Low priority — nothing in this plan changes admin's structure (§5 classifies it DEFER). |

### Checklist mapped against current state

- **Already true today, confirmed:** reduced motion (global media query in `globals.scss`); visible focus (global `:focus-visible` outline using `--focus-ring-width`/`--color-focus-ring`); touch targets (`--touch-target-min: 2.75rem` = 44px, matching both the current design system and Klinnova's §O minimum).
- **Needs fresh proof after each restructure slice:** keyboard navigation order, landmarks, nav `aria-current` state, no horizontal overflow, 200% zoom — all previously proven against the *current* layouts; a layout restructure (K4/K5) invalidates those specific proofs, not the underlying components.
- **Not yet exercised anywhere found:** destructive-action safety at the new visual weights (Klinnova's "never filled solid by default" destructive-button rule) — worth a dedicated check once K2 restyles the destructive button.
- **Status-not-color-only:** already the existing convention (badges/status pills already pair a text label with color per D-017's "status must never be communicated by colour alone" rule) — carries forward unchanged.

---

## 13. Test / regression plan

### Brand-copy-coupled E2E assertions requiring deliberate update

| Spec | Assertion |
|---|---|
| `shell.spec.ts` | `getByRole("banner").getByText("Stint")`; tagline H1 "One step closer." |
| `account-deletion-journey.spec.ts` | 3 assertions on "Delete my Stint account" / "Your Stint account has been deleted." |
| `application-outcome-events-journey.spec.ts` | Same 2 link/heading assertions, reused in Unit D's own E2E fixture. |
| `candidate-navigation-ia.spec.ts` | 3 assertions on the same deletion link/heading text. |
| `slice2-critical-journey.spec.ts`, `job-detail-journey.spec.ts` | Both assert the exact work-authorisation disclaimer copy: *"…Stint has not verified documents."* |

All of these are genuine copy-driven maintenance, not weakening — the tests assert real user-facing behavior (a link exists, does what it says, produces the stated confirmation) and will keep doing so once the brand string changes underneath the same accessible-name pattern. Where selectors are already role/label-based (most of them, via `getByRole`) rather than raw text search, they age better; the deletion-flow assertions are inherently brand-coupled because the link itself is literally named "Delete my Stint account" by design (D-081/Unit B), so a copy change is unavoidable there specifically, not a sign the test was poorly written.

### Other impact

- **Component tests:** `candidate-shell.test.tsx` and `shell-header.test.tsx` assert literal "Stint"/tagline text (landing-page-only components, §3) — update alongside K3. `brand-mark.tsx` has no dedicated test file today — zero regression risk there specifically.
- **Auth/recovery tests:** ~14 Vitest files fixture `NEXT_PUBLIC_SITE_URL` as `https://stint.company` (§4) — these are testing URL-shape logic, not brand copy; update the fixture value only if/when the real Production origin changes (§7/§8), not as part of any visual slice.
- **Navigation tests:** K4/K5 restructure existing, currently-passing E2E journeys for candidate/employer nav — expect deliberate rewrites of the physical-layout assertions (e.g., "nav is inside a header" → "nav is inside a bottom tab bar"), while the underlying route/authorization assertions in those same specs should not need to change.

---

## 14. Dependencies, fonts & assets

### New dependency required?

**No new package.json dependency for DM Sans.** `next/font/google` ships inside the already-installed Next.js 16 package — zero install, self-hosted at build time (no runtime Google Fonts request, no CDN link that would trip the CSP concerns raised elsewhere in this plan). Weights 400/500/600/700 are all available through Google Fonts' DM Sans distribution under the SIL Open Font License.

**No new dependency for tabular numerals** — pure CSS (`font-variant-numeric: tabular-nums`), works with any font.

**Icon library — genuinely open, deferred to scope discovery.** The Design Spec assumes "the inherited Lucide-style language," but no icon library is installed today (§6). Default answer stays no: the icon needs described (24×24 line icons for nav/status/actions) are few enough in practice that hand-authored inline SVG — matching the existing "no unnecessary dependency" convention in AGENTS.md — is very plausibly sufficient. Recommend deciding only once K2/K5 reveal the actual icon count needed, rather than pre-installing `lucide-react` speculatively.

### Font/asset licensing

| Asset | Currently in repo? | License | Founder-provided asset needed? |
|---|---|---|---|
| DM Sans (400/500/600/700) | No | SIL Open Font License — free for commercial use | No |
| Logo mark | No — nothing exists | N/A, original work | **Yes** — final vector source, per §11 |
| Icon set | No | TBD, pending scope | Only if hand-authoring proves insufficient |

No font files or licensed assets were downloaded, added, or exposed as part of this planning pass.

---

## 15. Legal / support gates

This planning pass does not constitute legal approval, does not author German legal content, and does not claim GDPR compliance — consistent with the existing founder-owned legal-readiness gate (D-M5-17) already in force for Cohort A.

### Exact surfaces affected, founder/legal-gated

- `src/app/impressum/page.tsx` — business-identity content references "Stint" throughout.
- `src/app/privacy/page.tsx` — "the legal entity operating Stint," "What Stint currently processes."
- `src/app/terms/page.tsx` — "Stint connects candidates…," "Stint is currently operated as…"
- Support/contact channel content — a dedicated support/contact surface beyond what may be embedded in the legal pages themselves was not confirmed to exist in the codebase; this needs a targeted check before any Klinnova legal-copy pass, separate from this plan.
- Sentry disclosure, if/when Sentry is configured (already gated by D-M5-16/D-M5-17, unaffected by this rebrand).

None of these are touched by K1–K9 as scoped in §9 — they route through the existing legal gate, not through Development's design-system work.

---

## 16. Cohort A blockers vs. non-blockers

> **Finding.** None of the Klinnova rebrand work (K1–K9) is a technical blocker for intentional Cohort A external traffic. The existing Cohort A readiness gates — isolated Preview restoration, minimal Sentry configuration, founder-owned legal review, Production demo-fixture cleanup by 2026-09-02 — are unchanged by this plan and remain the actual blockers.

**Recommend explicitly:** do not bundle rebrand work into the Cohort A critical path. If K3/K7/K8 (the public-identity cutover) is desired before Cohort A for positioning reasons, that's a legitimate priority call — but it is a scope/priority decision for the founder to make deliberately, not something this technical plan concludes is required.

---

## 17. Exact founder decisions still required

Kept minimal at authoring time — not reopening anything already settled by decisions A–D as then supplied.

1. Final written logo sign-off *after* the §11 small-size checkpoint produces real assets — a formality given the direction is already approved, but the checkpoint itself is a real gate, not a rubber stamp. *(See currency note: this now applies to Option 2, the angled doorway/aperture, per the founder's updated preference.)*
2. Timing: does the public identity cutover (K3+K7+K8) happen as one coordinated release, and roughly when relative to Cohort A — recommended approach is in §10, but the calendar call is the founder's.
3. Old-domain (`stint.company`) fate after cutover — continue resolving, redirect, or eventual decommission (§7).
4. Small copy decision: does "Closed" (vacancy lifecycle, §6/§9-K6) cover both `expired` and `withdrawn` as one label, or does the UI need to distinguish them?
5. Confirm support/contact channel content ownership before any Klinnova legal-copy pass (existing D-M5-17 gate, not a new requirement).

---

## 18. Recommended next action

Hold this document for founder review alongside the source Design Spec and Visual Validation. On approval: authorize the Unit E interaction model (Hybrid C, §8) so Unit D/E sequencing is not blocked by rebrand timing — Unit D (PR #80) and the stabilization PR (#81) continue on their own track, untouched by anything in this document. Separately, when ready, authorize a bounded first Klinnova implementation unit (most likely K1, the token foundation) as its own explicitly-scoped piece of work — not automatically triggered by this planning pass. No code, branch, commit, dependency, or hosted change was made while authoring this plan.
