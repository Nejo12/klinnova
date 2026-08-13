# Cohort A Employer Acquisition Playbook

**Status:** Prepared — founder-operational playbook, execution not started.

**Date:** 2026-08-13

**Authority:** Converts the approved strategy in `docs/51-m5-operating-plan.md` (§4 Cohort A employer segment, §6 employer acquisition channels, §7 founder-assisted onboarding) into a bounded, execution-ready founder workflow. Does not change or reopen that approved strategy.

**Scope:** Preparation only. No employers have been contacted, no accounts created, no vacancies published, and no external research or outreach was performed to produce this document.

**Naming note:** This document is an internal repository operating record and follows repository convention in referring to the underlying product/engineering identity as "Stint" where relevant. Everything the founder sends or shows to an employer must use **Klinnova**, the current public-facing identity (`docs/53-m5.1-beta-readiness-closure.md`, K2/K5). See §13 for why the domain/brand split still matters for outreach.

**Pricing note:** The founder has decided employer pricing for M5/Cohort A (D-092, `docs/10-decisions.md`): participation is free for employers during the private beta — no subscription, placement fee, or commission. This is a beta-scoped policy, not a permanent commitment; future commercial terms remain undecided. §6, §7, and §8 below use this wording directly.

---

## 1. Employer Ideal Candidate Profile (ICP)

Grounded in `docs/51` §4 and `docs/03-users.md`'s employer persona. Do not broaden beyond this without a founder decision.

| Dimension | Definition |
|---|---|
| **Company type** | Cleaning-first, in priority order: (1) small/medium cleaning businesses; (2) property managers / managed-property operators with recurring cleaning demand; (3) shops/retail premises with legitimate cleaning requirements; (4) private households where verification/privacy stays straightforward. At most 1–2 adjacent low-language-barrier employers where founder access is strong and the hiring model fits. |
| **Size/complexity** | Small to medium. No enterprise HR/procurement process, no multi-layer approval chain, no requirement for integrations, exports, or bespoke reporting. |
| **Berlin boundary** | Work must be performed in Berlin (`docs/51` §3, D-004). No Brandenburg/nationwide roles. |
| **Type of cleaning demand** | Recurring or ongoing cleaning need (household, apartment, common-area/property, shop/retail-store, or premises-support cleaning) — matches `docs/12`'s "workplace or service location" and `docs/03`'s "especially important for early hiring" list. |
| **Expected vacancy volume** | 1–4 vacancies per employer is realistic for Cohort A's 10–20-vacancy target across 3–5 employers; recurring-demand employers (property managers, multi-site cleaning businesses) are more likely to supply more than one. |
| **Hiring simplicity** | Employer can describe schedule, duties, pay, frequency, and employment basis in structured product fields (`docs/03` "Private-employer core needs"). No dependency on a CV-first or document-heavy hiring process. |
| **Language-barrier compatibility** | Genuinely willing to accept candidates with limited German where the actual role does not require fluency (`docs/03` "Primary employer" definition; `docs/12`'s language-requirement labels). |
| **Verification suitability** | Can complete verification using only structured profile data plus an attestation (D-057) — no ability or willingness to fabricate identity/business information, no expectation that Klinnova will collect tax numbers, ID/passport uploads, business-registration documents, or exact private addresses, because the product does not collect any of that in this slice. |
| **Exclusions / red flags** | Undeclared work or cash-in-hand arrangements (`docs/03` line 56); freelancer-marketplace intent; roles outside Berlin; roles requiring document/CV upload as a hard gate (unsupported — `docs/11` anti-goals); employer unwilling to state realistic pay/schedule; any employer asking Klinnova to represent a role it cannot verify honestly; any employer expecting messaging, payroll, or full-ATS functionality (explicit non-goals, `docs/51` §18). |

Nothing above invents a legal requirement — every line traces to an existing product decision or persona doc, not to assumed German employment law beyond what those documents already state.

## 2. Qualification criteria

Three tiers only — do not add a fourth without a founder decision.

### Strong fit
- Legitimate, recurring Berlin cleaning (or premises-support) demand.
- Clear, verifiable employer identity (private individual/household or an organisation with a real, describable business).
- Can state role, schedule, pay, and frequency without needing a CV/document-driven process.
- Comfortable with limited-German candidates where the role allows it.
- Current product can fully represent the vacancy (see §3 mandatory facts — no gap).
- No need for messaging, payroll, scheduling, or ATS-style features.
- Willing to use the platform honestly (no fabricated vacancies, no off-platform side deals used to bypass verification) and willing to give the founder outcome feedback (interview happened / hire made or not).

### Possible fit
- Meets most Strong-fit criteria but has one bounded gap — e.g. one non-cleaning but plausibly adjacent role, uncertainty about recurring demand, or a language expectation that needs a short founder conversation to clarify.
- Worth a qualifying call before committing founder onboarding time.

### Reject / defer
- Work outside Berlin.
- Undeclared/cash-in-hand hiring intent, or any inability to describe the role honestly.
- Requires a CV-first, document-heavy, or agency-style hiring process.
- Expects a feature Klinnova does not have (messaging, payments/payroll, subscriptions, video interviewing, saved jobs — `docs/51` §18) as a condition of participating.
- Not genuinely open to limited-German candidates.
- Sector outside cleaning/adjacent without a founder-approved exception slot remaining (only 1–2 exception slots exist for the whole of Cohort A).

## 3. Vacancy-quality criteria

Directly derived from the product's own publish-readiness contract (`publish_employer_vacancy` / `_employer_vacancy_publish_missing`, PR 5.2) — not invented.

### Mandatory facts (the vacancy cannot be published without these)
- Title.
- Job category.
- Description.
- City = Berlin, plus a privacy-safe public locality/area.
- Workplace type.
- Work frequency.
- Salary: a single EUR amount in cents, gross, with a period of hourly, monthly, or fixed-job (no ranges, no net figures, no other currency — D-... salary decision, `docs/10` line 689).
- At least one language requirement, using the product's Accepted codes (`docs/12` language-requirement labels) — never a free-text language description.
- Whether a CV is required (boolean).
- Whether English-only interviewing is acceptable (boolean).
- An expiry date the employer sets or accepts (must be in the future and no more than 90 days out).

### Helpful facts (not required to publish, but improve match quality / candidate trust)
- Recurring vs one-off nature of the work.
- Approximate weekly hours or shift pattern.
- Whether the role is part of a larger recurring engagement (useful for future vacancies from the same employer).
- Any genuinely required language beyond the minimum (stated honestly, not padded "to be safe").

### Unsupported / must not be invented
- A CV-upload requirement presented as mandatory (the product supports CV-optional; do not imply otherwise to sound more "professional").
- A salary range, negotiable pay, or net pay (the schema only allows one gross EUR figure per period).
- Free-text language requirements phrased outside the product's Accepted codes.
- Promises of a minimum number of applicants, a guaranteed hire, or a hiring timeline.
- Any legal-employment guarantee (work-authorisation declaration is self-declared by the candidate, not verified by Klinnova, per `docs/12`).

Founder-assisted onboarding may help an employer phrase these fields, but must never fabricate a fact the employer did not actually state (`docs/51` §7).

## 4. Acquisition funnel

Uses repository terminology (`verification_state`, `publication_state`, and the "Participating employer" / "Verified vacancy" counting rules in `docs/51` §15) as the stage backbone.

| Stage | Exit criteria to advance |
|---|---|
| **Prospect** | Identified as matching the ICP (§1); not yet contacted. |
| **Contacted** | First outreach message/call sent via an approved channel (§6, §9). |
| **Replied** | Employer responded in any form (interest, question, decline). A decline exits the funnel here, recorded, not deleted from tracking. |
| **Qualified** | Assessed as Strong fit or Possible-fit-resolved using §2. Reject/defer employers stop here. |
| **Onboarding** | Employer has started or completed the product's employer onboarding (profile fields, employer type, attestation). Not yet `verification_state = pending`. |
| **Verification requested** | Employer has submitted a verification request (`verification_state = pending`, via `request_employer_verification`). |
| **Verified** | Operator-approved (`verification_state = verified`, via `approve_employer_verification`). This is the point the employer becomes eligible to publish. |
| **Vacancy drafted** | At least one vacancy exists in `publication_state = draft` for this employer. |
| **Vacancy published** | At least one vacancy is effectively public (`publication_state = published`, per `is_vacancy_effectively_public`). |
| **Active participant** | Meets the full M5 "Participating employer" definition (`docs/51` §15): onboarding complete, verified, and at least one employer-submitted vacancy became effective-public. This is the stage that counts toward the 3–5 Cohort A target. |

Employers can drop out at any stage (Contacted → no reply; Qualified → Reject/defer; Verification requested → rejected). Record the exit stage and reason rather than deleting the row — it is diagnostic evidence for §10.

## 5. Founder tracking fields

A flat list/spreadsheet, not a CRM product. One row per employer prospect.

| Field | Purpose |
|---|---|
| Employer / company name | Identity. |
| Contact person | Who the founder is actually talking to. |
| Employer type | Private / organisation (matches product's `employer_type`). |
| Source / channel | Which of the §9/§6 channels produced this prospect. |
| Contact method | Phone, email, in-person, referral intro, etc. |
| Date first contacted | Funnel timing. |
| Current stage | One of the §4 funnel stages. |
| Qualification | Strong fit / Possible fit / Reject-defer (§2). |
| Expected vacancy count | Founder's estimate, for supply planning against the 10–20 target. |
| Next action | The single next thing the founder must do. |
| Next-action date | Keeps the sheet actionable, not just a log. |
| Blocker | Anything stalling progress (e.g. "waiting on employer to confirm schedule"). |
| Verification status | Mirrors `verification_state` once onboarding has started. |
| Vacancies published | Count of effective-public vacancies for this employer. |
| Notes | Free text — objections raised, feedback given, anything not captured above. |

Sixteen fields is the ceiling for Cohort A's scale (3–5 employers, a few dozen prospects at most). Do not add automation, integrations, or a second tool.

## 6. Outreach messaging framework

Founder-usable structures, not scripts to read verbatim. None of these claim Klinnova is publicly launched or promise guaranteed candidates/hires. Where pricing comes up naturally, use the approved free-during-beta wording (D-092) — see §8 for the full objection response; do not improvise beyond it (e.g. do not say "free forever").

**Warm introduction** (via a mutual contact)
> Structure: reference the mutual contact by name → one sentence on what Klinnova is (Berlin hiring for cleaning and similar roles, private beta) → one sentence on why you thought of them specifically (recurring cleaning need, property portfolio, etc.) → ask for 10–15 minutes, no commitment implied.

**Cold/direct cleaning-company outreach**
> Structure: brief self-introduction (founder, Berlin-based) → one sentence describing the problem you're solving (finding reliable people for cleaning/premises work, including candidates with limited German where the role allows it) → explicit "private beta, currently a small group of employers" framing → ask if they're open to a short call.

**Property manager outreach**
> Structure: acknowledge they likely manage cleaning across multiple properties/units → note that recurring demand is exactly what this beta is built around → ask whether they currently struggle with turnover/coverage for cleaning staff → offer a short call.

**Referral request** (to an already-participating employer)
> Structure: thank them for participating → ask directly whether they know another cleaning business, property manager, or shop that might have similar hiring needs → make the ask specific and low-effort ("just a name and a way to reach them is enough").

**Follow-up after no response**
> Structure: one short message, no guilt/pressure language, restate the one-sentence value proposition, make it trivially easy to say no ("totally fine if this isn't useful right now").

**Response when employer is interested**
> Structure: thank them → propose a specific short call/meeting time → briefly set expectations (private beta, founder-assisted onboarding, free to participate during the beta with no subscription/placement/commission fees — see §8) → confirm Berlin location and cleaning/premises-support nature of the work before scheduling, to avoid a wasted call.

## 7. Founder call / meeting script

A short discovery-call outline, not a sales pitch.

1. **What Klinnova is** — a Berlin hiring platform focused on legitimate work, currently emphasizing cleaning and similar premises-support roles, connecting employers with candidates including those with limited German where the role allows it.
2. **Why cleaning-first** — cleaning demand is structured, often recurring, and candidates with limited German can genuinely do the work without a CV-first process (`docs/51` §4 rationale).
3. **Current status** — private beta ("Cohort A"), a small deliberately-limited group of employers, not a general public marketplace yet. Do not claim the product is already publicly launched (see §13).
4. **What participation involves** — completing a short employer profile, an honesty attestation (no document upload required), describing one or more real vacancies, and reviewing candidates who apply.
5. **Vacancy legitimacy** — the role must be real, in Berlin, and described honestly; Klinnova does not support undeclared/cash-in-hand work.
6. **Verification** — a manual review of the profile and attestation (D-057); no tax number, ID, or business-registration document is collected in this stage.
7. **Candidate matching** — candidates are shown vacancies that fit their stated language, availability, and location; a match is not a guarantee of interview or hire (`docs/12`).
8. **Founder-assisted onboarding** — the founder can walk the employer through onboarding and help phrase a vacancy honestly, but will not fabricate details on the employer's behalf (`docs/51` §7).
9. **Feedback expectations** — the founder will ask for brief feedback after publication and after any interview/hire (`docs/51` §9); this is what makes the beta useful.
10. **Pricing / commercial terms** — participation is free for employers during the current private beta: no subscription fee, no placement fee, no commission, no other paid employer service during Cohort A (D-092, `docs/10-decisions.md`). This is a beta-scoped policy, not a permanent commitment — future commercial terms are not yet defined. Use the exact wording in §8 if asked directly; do not add or improvise beyond it.

## 8. Objection handling

| Objection | Response guidance |
|---|---|
| "Why should I use this instead of Indeed/Kleinanzeigen?" | Klinnova is deliberately narrow: Berlin, cleaning-first, built around candidates with limited German who general boards often filter out by CV/language defaults. It's a small private beta, not a claim to replace a general job board. |
| "Do applicants speak German?" | Some do, some don't — the platform is built so a vacancy's actual language requirement (from "English accepted" to "Fluent German") determines who is shown the role, so mismatches are avoided rather than hidden. |
| "Do I need to pay?" | "No. Participation in the current Klinnova private beta is free for employers. There are no subscription fees, placement fees, or commissions during this beta phase. Future commercial terms have not been decided yet." (D-092, `docs/10-decisions.md`.) Do not add "free forever" or any permanent-pricing claim beyond this. |
| "Can you guarantee workers?" | No — a match is not a guarantee of interview or hire (`docs/12`). Be direct about this; overpromising damages trust in a beta this small. |
| "Can you upload our jobs for us?" | Founder-assisted onboarding can help phrase and structure a real vacancy the employer describes, but will not invent or embellish facts the employer didn't state (`docs/51` §7). |
| "What information do you need from us?" | A completed employer profile (private or organisation), an attestation that the information is accurate and the vacancy is genuine — no ID/passport, tax number, or business-registration document at this stage (D-057). |
| "How do you verify employers?" | Manual review of the profile plus the attestation by the founder/an authorized reviewer — not an automated or document-based check in this stage. |
| "Is this already live/public?" | No — currently a private beta with a small number of employers by design, and the public brand/domain cutover has not happened yet (see §13). Be straightforward about this rather than implying broader scale. |

Anything not covered above and not resolvable from `docs/51`/`docs/53`/`docs/10-decisions.md` should be flagged, not improvised — pricing is no longer in that category (D-092), but §13 below still lists what remains genuinely open.

## 9. First-batch sourcing plan

No external research, scraping, or outreach was performed to write this section — it defines *how* the founder should build the list, not the list itself.

**Recommended first-batch composition** (before any outreach begins):

| Source | Suggested count | Notes |
|---|---:|---|
| Warm-network prospects (founder's direct contacts) | 5–8 | Highest qualification likelihood; start here per `docs/51` §6 channel order. |
| Cleaning businesses (direct outreach) | 8–12 | Primary wedge; largest share of the batch. |
| Property managers / managed-property operators | 5–8 | Recurring-demand multiplier — one relationship can yield several vacancies. |
| Shops/retail premises | 3–5 | Selective — only where a genuine, describable cleaning need exists. |
| Adjacent low-language-barrier exception | 0–2 | Only if founder access is strong; this is a hard cap across all of Cohort A, not per batch. |

**Recommended total first batch: roughly 20–30 identified prospects** before starting outreach, sized to comfortably yield the 3–5 "Active participant" target after typical funnel attrition (not every Contacted prospect replies; not every Qualified prospect completes onboarding). This is a planning heuristic, not a hard product gate — the founder can adjust based on real response rates once outreach begins (§10).

## 10. Success/failure thresholds

Track these, not vanity metrics like raw message-send counts.

| Signal | What it indicates |
|---|---|
| Reply rate (Replied ÷ Contacted) | Whether the messaging/channel choice is landing at all. |
| Qualified-employer rate (Qualified ÷ Replied) | Whether the ICP (§1) is being targeted accurately. |
| Onboarding-completion rate (Onboarding-complete ÷ Qualified) | Whether the product's onboarding is a real friction point for this audience. |
| Verified-employer count | Direct progress toward the 3–5 target. |
| Legitimate-vacancy count | Direct progress toward the 10–20 target — track alongside verified-employer count, since one employer can supply several. |
| Recurring objections | Same objection appearing 3+ times signals a messaging or product gap worth a weekly-review item (`docs/51` §8), not a one-off. |
| Repeated product blockers | Same friction point blocking onboarding/publication for multiple employers should be promoted per the blocker-intake rules in `docs/51` §10. |

Avoid tracking things like total messages sent, social-media engagement, or website traffic — none of those are Cohort A exit criteria.

## 11. Operational handoff to candidate recruitment

`docs/51` does not state a hard numeric employer/vacancy threshold that gates the start of candidate recruitment, so this section does not invent one.

What the repository does support: candidate recruitment is only *meaningfully* useful once there is real, effective-public vacancy supply for candidates to match against (`docs/51` §5, §15 "Verified vacancy"). A reasonable, non-binding operating guideline consistent with that: begin ramping candidate recruitment once the first 1–2 employers reach "Active participant" with at least 2–3 published vacancies between them, so early candidates have something real to apply to rather than an empty vacancy list. This is a founder judgment call each week (`docs/51` §8 weekly cadence), not a product gate — do not treat it as a blocking condition.

## 12. Founder action list

Precise next real-world actions once this playbook is approved. None of these are performed by this task.

1. Pricing is decided (D-092, §8) — no further action needed before outreach on this point. Confirm the remaining §13 caveats (legal identity, support channel, domain mismatch) don't block the specific outreach planned.
2. Build the first prospect batch per §9 (target ~20–30), using the founder's own network and direct knowledge of Berlin cleaning businesses/property managers — no scraping.
3. Set up the tracking sheet using the fields in §5.
4. Begin outreach in the channel order from `docs/51` §6 (warm network first), using the message structures in §6.
5. Run qualifying calls using the script in §7 and the criteria in §2.
6. For Qualified employers, begin founder-assisted onboarding per `docs/51` §7's exact boundaries (help structure, never fabricate).
7. Track funnel movement weekly against §4 and roll it into the existing `docs/51` §8 weekly review cadence.
8. Revisit §10's thresholds after the first 2–3 weeks of outreach to see whether messaging, ICP, or product friction needs adjustment.
9. Escalate any recurring objection or product blocker per `docs/51` §8/§10, not silently.
10. Do not begin candidate recruitment ramp-up (§11) until the guideline in §11 is met, and do not treat Cohort A as ready for GO/NO-GO based on employer acquisition alone — Unit H, Production Sentry decision, and K6 remain independent gates (`docs/53-m5.1-beta-readiness-closure.md`).

## 13. Unresolved commercial/support/legal wording — remaining founder decisions before outreach

### Resolved

**Are employers free during M5/Cohort A? RESOLVED — 2026-08-13.** The founder has decided: employer participation is free during the M5/Cohort A private beta — no subscription fee, no placement fee, no commission, no other paid employer service (D-092, `docs/10-decisions.md`). This is a beta-scoped policy, not a permanent commitment; future commercial terms remain undecided. §6, §7, and §8 above now use this wording directly. Do not extend it beyond the approved wording (no "free forever," no "never any fees," no promise about future services).

### Still open — do not resolve these silently

1. **Legal entity/business identity (Impressum).** Still open — Unit H has not started (`docs/53`). Do not present a finalized company/legal identity to employers; if asked, defer rather than improvise.
2. **Support/contact channel.** Still open — Unit H item, linked to the same legal/support readiness finalization (`docs/53`). The founder is the de facto support channel today; there is no separate published support address/process yet. Do not promise a dedicated support channel beyond direct founder contact.
3. **K6 domain cutover has not occurred.** The Klinnova public-domain cutover (K6) remains separately gated and has not happened (`docs/53` K5 section). Production still runs on the `stint.company` domain.
4. **Brand/domain mismatch.** The product's user-visible identity is already "Klinnova" (K2, complete), but Production still runs on `stint.company` because K6 (point 3 above) hasn't occurred. A discerning employer signing up today will see "Klinnova" branding at a `stint.company` URL. This is not a legal problem, but it is a plausible outreach/trust question ("why does the link say stint.company?"). The founder must be ready to explain this honestly if it comes up before K6 — e.g. "we're mid-rebrand; the product is Klinnova, the URL hasn't caught up yet" — rather than being surprised by the question or glossing over it.

Nothing else in `docs/51`/`docs/53`/`docs/10-decisions.md` was found to materially affect outreach wording beyond these points.
