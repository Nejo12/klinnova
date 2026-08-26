# Klinnova Pulse — D3-C Experience Acceptance

Status: **ACTIVE ACCEPTANCE CHECKPOINT**

Scope: hands-on acceptance of the first implemented Klinnova Pulse vertical slice after D3-B merge.

## 1. Reference state

- Governing design direction: `docs/85-klinnova-pulse-experience-motion-discovery.md`
- Governing implementation specification: `docs/86-klinnova-pulse-implementation-specification.md`
- D3-B implementation PR: #171 `feat(pulse): add profile-to-matching handoff`
- Merged commit: `d5ffd36323458437a6e1dbd2ff1680f4555e1212`
- Production deployment observed after merge: `dpl_HTiBhwjuRnghJmUWmq862pgASbHK`
- Deployment state at acceptance start: `READY`
- Post-deploy read-only Vercel runtime-error check: no `error`/`fatal` runtime logs observed in the checked post-deploy window.

This document is an experience-acceptance record, not evidence of legal, funding, security, or accessibility certification.

## 2. D3-C objective

Determine whether the implemented candidate flow actually delivers the intended Klinnova Pulse feeling before the motion grammar is expanded to the Apply journey.

The experience thesis under test is:

> fragmented → understood → connected → progressed

For this slice, the implemented portion is:

> completed profile → Ready for matching → Matching on your profile → current match results

The acceptance question is not merely whether the code works. It is whether the transition feels distinctive, calm, trustworthy, fast, and recognizably Klinnova.

## 3. Preconditions

Use a legitimate candidate test account whose onboarding can be completed through the real product flow.

Do not:

- mutate Production data outside normal product actions required for the test;
- use direct database writes;
- fabricate matching results;
- alter matching eligibility rules for acceptance convenience;
- activate Production Sentry;
- begin external Cohort A outreach.

The canonical server-side matching path remains authoritative. D3-C must evaluate the presentation of real product state, not a mocked matching engine.

## 4. Primary hands-on journey

Run the flow from the final candidate onboarding step through the first Matches screen.

Observe the following sequence:

1. Candidate completes the final onboarding requirement.
2. Authoritative onboarding completion succeeds.
3. Candidate lands in the first-run Pulse handoff.
4. `Understanding` is the current stage.
5. `Profile ready` / `Ready for matching` is visible.
6. The experience advances into `Connecting` without a blank-page discontinuity.
7. `Matching on your profile` persists as the continuity device.
8. Only real persisted matching inputs are shown.
9. Available match results Reveal/Settle without an artificial data delay.
10. Zero matches, where legitimate, remains a successful truthful state rather than simulated activity.
11. The transient `pulse=ready` marker does not persist in normal browser history/reload behavior.

## 5. Founder acceptance rubric

Score each area as `PASS`, `REMEDIATE`, or `BLOCK`.

### A. Distinctiveness

Questions:

- Does the transition feel materially more intentional than a conventional job-board redirect?
- Does `Ready for matching` feel like a meaningful product milestone rather than another card?
- Is there an identifiable Klinnova Pulse character without spectacle?

PASS when the flow feels recognizably designed around understanding and connection.

REMEDIATE when the idea is visible but too weak, generic, or visually flat.

BLOCK when it feels gimmicky, confusing, or materially worse than the pre-Pulse flow.

### B. Continuity

Questions:

- Does the profile-to-matching handoff feel like one journey?
- Does `Matching on your profile` successfully carry context forward?
- Is there any obvious fade-to-blank or unexplained page-state jump?

PASS when the user can perceive that the profile they just completed is the basis for the matching state.

### C. Truthfulness

Questions:

- Are displayed dimensions based on real persisted candidate data?
- Does the UI avoid implying AI, scoring, analysis, or live computation that Klinnova does not actually perform?
- Does a legitimate zero-match result remain honest?

Any fake processing claim is a BLOCK.

### D. Pacing

Questions:

- Does the ready state remain visible long enough to register?
- Does it advance quickly enough to avoid feeling like an artificial wait?
- Is `Show matches now` easy to use and immediate?
- Do result reveals feel quick rather than staged for spectacle?

Target feeling: deliberate but fast.

### E. Visual restraint

Questions:

- Do the stage rail, status copy, profile chips, and result reveal feel coherent with the existing Klinnova UI?
- Is olive/support emphasis used selectively rather than everywhere?
- Is the motion noticeable without competing with the actual jobs?

### F. Mobile quality

Test at a narrow mobile viewport or real phone.

Questions:

- Does the three-stage rail remain legible?
- Do profile chips wrap cleanly without creating a visually heavy block?
- Is the first job/result visible soon enough below the handoff?
- Is there excessive vertical displacement?
- Does `Show matches now` remain an easy touch target?

A technically correct but vertically bloated mobile experience requires remediation.

### G. Reduced motion

With `prefers-reduced-motion: reduce` enabled:

- spatial choreography should be removed or effectively skipped;
- the state transition must still make sense in text/layout;
- `Connecting` should become the active state without relying on motion to explain it;
- all information required to understand the state must remain visible.

Reduced-motion support is a release requirement, not optional polish.

### H. Interaction safety

Questions:

- Can the candidate interact immediately without waiting for animation completion?
- Does `Show matches now` skip cleanly?
- Does rapid interaction leave the UI in a coherent final state?
- Does motion avoid blocking navigation or data actions?

## 6. Acceptance result format

Record the Founder result using this compact structure:

```text
D3-C Founder acceptance

Desktop: PASS / REMEDIATE / BLOCK
Mobile: PASS / REMEDIATE / BLOCK
Reduced motion: PASS / REMEDIATE / BLOCK
Distinctiveness: PASS / REMEDIATE / BLOCK
Continuity: PASS / REMEDIATE / BLOCK
Pacing: PASS / REMEDIATE / BLOCK
Truthfulness: PASS / REMEDIATE / BLOCK

What feels strongest:
- ...

What feels wrong or weak:
- ...

Screenshots / recordings:
- ...

Decision:
- ACCEPT D3-B
- REMEDIATE D3-B
- BLOCK / RECONSIDER DIRECTION
```

Screenshots or a short screen recording are preferred whenever the issue is visual/pacing-related.

## 7. Remediation boundary

If D3-C returns `REMEDIATE`, the remediation branch must remain limited to this first Pulse slice unless a genuine architecture defect requires a separate decision.

Allowed examples:

- timing/easing adjustments;
- spacing and mobile wrapping fixes;
- copy refinements;
- stage-rail emphasis;
- chip density/order refinements;
- result-reveal restraint;
- reduced-motion fixes;
- skip-control usability fixes.

Not automatically allowed:

- Apply-journey implementation;
- employer-side Pulse expansion;
- new matching rules;
- database/schema/RLS changes;
- broad navigation redesign;
- new design system;
- new animation dependency without a separate technical justification.

## 8. Exit criteria

D3-C is complete only when:

1. the merged Production deployment is technically healthy;
2. the Founder has exercised the real first-run candidate flow;
3. desktop/mobile/reduced-motion observations are recorded;
4. the slice is explicitly `ACCEPTED` or a bounded remediation PR is identified;
5. only after acceptance may the next signature moment — Match → Apply → Application Journey — move into implementation planning.

Until then, the Apply journey remains design-approved but implementation-HOLD.
