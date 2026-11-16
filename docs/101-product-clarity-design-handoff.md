# Product Clarity & Guided Self-Service — #287 Design Handoff

**Status (16 November 2026): DESIGN / SPEC ONLY — design direction approved; implementation NOT authorized.**

This record is a concise handoff to preserve the approved design *direction*, source-of-truth boundaries, and the separately reconciled #255 Figma artifact. It is **not** a new feature specification, a commercial launch approval or an authorization to build.

## Primary references

- [Issue #287 — authoritative scope and acceptance criteria](https://github.com/Nejo12/klinnova/issues/287)
- [Founder approval of #287 direction (16 November)](https://github.com/Nejo12/klinnova/issues/287#issuecomment-6911399446)
- [Figma #287 — proposed experience / eight editable screens plus specification](https://www.figma.com/design/AMGtkXbC5D28v6D0rjvf4q/Klinnova?node-id=293-2)
- [Figma #255 — original Founder-approved UX hardening pack](https://www.figma.com/design/AMGtkXbC5D28v6D0rjvf4q/Klinnova?node-id=251-3)
- [Historical #255 artifact reconciliation](https://github.com/Nejo12/klinnova/issues/255#issuecomment-6911400128)
- [M5 execution and funding controls](14-founder-dashboard.md), [post-submission IBB control](100-gruendungsbonus-plus-post-submission-control.md)

## #287 — what was actually approved

The Founder approves **the direction** of clearer public product explanation and guided self-service for two distinct groups: Candidate and Employer. Within three minutes a first-time visitor should understand what Klinnova is, who it is for, where to start, what information is required, which stages depend on actual vacancies or manual verification, and what happens next.

The Figma proposal contains eight screens:
1. Public homepage — desktop.
2. Public homepage — mobile.
3. Candidate getting started — mobile.
4. Candidate onboarding guidance — mobile.
5. Employer getting started — desktop.
6. Employer verification and publication guidance — desktop.
7. Candidate no-vacancies state — mobile.
8. Employer pending-verification state — desktop.

A ninth **specification/handoff board**, not a ninth primary screen, covers EN/DE copy, an implemented-versus-illustrative-versus-proposed capability matrix, a proposed three-minute comprehension check and possible implementation sequencing.

**Design direction approval is NOT final implementation sign-off.** No issue is promoted to BUILD NOW by this document. #287 remains open. A new Founder decision is required for each bounded implementation slice.

## Potential implementation order — proposals, not approvals

| Slice | Possible objective | Existing contracts to preserve |
|---|---|---|
| A — Public explanation | Homepage value proposition, distinct Candidate/Employer journeys, honest illustrative previews, FAQ, EN/DE copy and responsive behavior | Public auth and registration entry points, claims about real vacancies, existing Klinnova brand and Nova-UI |
| B — Candidate guidance | Pre-registration expectations and truthful empty-state guidance, only where the current runtime actually lacks them | Six onboarding groups, server-owned completion, saved progress, matching, candidate profile/review and application transitions |
| C — Employer guidance | Pre-registration explanation, type-specific manual verification and vacancy publication next actions | Employer type, verification/readiness permissions, current vacancy lifecycle, private location and applicant privacy |

Before opening any child implementation issue, verify the exact relevant source files on current `main`, check whether approved design and runtime already satisfy the requested behavior, identify actual gaps, and propose *one* bounded issue. Do not reimplement completed work. Recheck active GitHub issues and PRs before implementation.

**Future execution checks:** relevant EN/DE copy, accessibility, desktop/mobile layout, no misleading job listings, no claims of guaranteed matching, no automatic verification or publication, focused tests and applicable CI. Only after Founder promotion should Claude Code / Work implement through one objective per PR; exact-head CI once; Founder manually merges.

## #255 historical Figma reconciliation — completed, separate

The original [#255 approved root](https://www.figma.com/design/AMGtkXbC5D28v6D0rjvf4q/Klinnova?node-id=251-3) was never missing. The earlier report of an empty page came from an unloaded Figma page during inventory. On 16 November 2026, direct inspection verified its six sections:
- Vacancy / Readiness;
- Candidate Onboarding Progress;
- Employer Home / Account;
- Responsive Header / CTA;
- Transactional Email;
- Handoff.

A container-only visual defect was corrected: the existing approved root clipped its wider responsive section. Root width increased from 1500px to 2556px (height remains 5699px; 19 direct children retained; original node ID remains `251:3`). This was a Figma layout repair only. No UX contract or runtime code changed.

Issues #255, #258, #262, #264 and #266 are completed and must not be reopened merely for #287. Existing decisions #226, #228 and #272 must be reused as relevant.

## Conflict, privacy and funding boundaries

At the verification snapshot (16 November 2026), `main` was `c9db5679afb80e092561aba4b3f5da752cadffe3`; [PR #283](https://github.com/Nejo12/klinnova/pull/283) was merged and no open PRs remained. **Treat this as a dated snapshot, not a permanent current head.**

Active independent concerns:
- [#284](https://github.com/Nejo12/klinnova/issues/284) admin roles — outside #287;
- [#282](https://github.com/Nejo12/klinnova/issues/282) IBB Nachforderung — external confirmation/clarification pending; grant safe-start boundary remains closed;
- [#205](https://github.com/Nejo12/klinnova/issues/205) public bilateral reviews — WAIT FOR BETA, not part of #287.

No grant-funded work, external provider engagement, paid acquisition, Cohort A market entry, additional behavioral tracking, Production/Preview mutation, schema/RLS changes, payment features, user study with participants, invented testimonials or fictional live jobs are authorized. Private application/identity/tax/banking evidence stays outside Git.

## Next Founder decision

**Required before engineering:** Review the design/spec against the actual public homepage and registration routes, then decide whether **Slice A — Public explanation** should become a separately approved, implementation-ready GitHub issue. Alternatively request design revisions. Do not interpret the overall direction approval as a blanket build instruction.

The next Chat should first verify current `main`, open issues/PRs, #287, and the relevant homepage/registration files. Return a compact recommendation and ask only for the essential promotion decision.

## Communication format

The Founder prefers strictly candid, concise answers: no pretense, inflated progress or unnecessary explanations. Separate facts from assumptions and blockers. When input is genuinely required, ask a precise question rather than guessing. State **FOUNDER ACTION REQUIRED** or **NO FOUNDER ACTION**, name the responsible agent, and provide bounded copy-paste execution instructions when applicable.
