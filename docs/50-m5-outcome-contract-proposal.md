# M5 Outcome Contract Proposal

**Status:** Proposed — founder review required before implementation

**Date:** 2026-08-09

**No schema/runtime authorization:** this document is discovery only. It does not authorize a migration, RPC, UI, or analytics change.

Related:

- Founder-approved direction D-M5-2/D-M5-3/D-M5-4 in `docs/49-m5-beta-transition-and-measurement.md`
- Existing application workflow contract: D-070 / `docs/39-slice-6-exit-proof.md`
- Current application workflow statuses: `submitted | reviewing | shortlisted | accepted | rejected`

## 1. Problem

M5 success depends on two business outcomes:

- completed interviews;
- confirmed hires.

The existing application workflow does not represent either metric precisely.

`shortlisted` is not proof that an interview occurred. `accepted` is not proof that a hire was confirmed. Reusing those statuses would make the beta funnel easy to query but semantically false.

Founder decision D-M5-4 therefore requires a conceptually separate outcome model.

## 2. Existing application/status model audit

The merged Slice 6 model already provides:

- one application per candidate/vacancy;
- five forward-only workflow statuses;
- immutable application snapshots;
- append-only status history;
- employer ownership authorization through vacancy ownership;
- candidate visibility of a candidate-safe status timeline;
- no candidate status mutation;
- terminal `accepted` and `rejected` workflow states.

Important boundary:

> Application workflow answers “where is this application in the employer's recruitment workflow?” Outcome measurement answers “what real-world event actually happened?”

They should remain separate.

## 3. Recommended smallest trustworthy model

### Recommended shape: append-only application outcome events

If implementation is authorized, prefer one small table conceptually named:

`application_outcome_events`

rather than adding more values to `applications.status`.

### Event types

Initial M5 event vocabulary should contain only:

- `interview_completed`
- `hired`

Do not add:

- interview invited
- interview scheduled
- offer made
- offer accepted
- onboarding started
- employment started
- no-show
- not hired

unless beta evidence demonstrates that one of those distinctions is required.

### Proposed minimum fields

Conceptual proposal only:

| Field | Purpose |
|---|---|
| `id uuid` | immutable event identity |
| `application_id uuid` | application/vacancy/candidate context via existing application |
| `event_type text` | `interview_completed` or `hired` only |
| `occurred_at timestamptz` | when the real-world event happened |
| `recorded_at timestamptz` | DB-generated audit timestamp |
| `recorded_by_employer_id uuid` | DB-derived/validated employer actor identity |
| `voided_at timestamptz null` | correction path without deleting history |
| `voided_by_employer_id uuid null` | actor that corrected the event |

No free-text note is proposed for M5. Free text would create unnecessary privacy/moderation/export/deletion scope and is not needed to count the approved outcomes.

## 4. Why append-only events instead of application columns

Rejected conceptual alternative:

```text
applications.interview_completed_at
applications.hired_at
```

Although smaller in column count, that design has several weaknesses:

- it loses history when a mistaken value is corrected;
- it cannot represent more than one actual interview round;
- it mixes recruitment workflow and real-world outcome state in the core application row;
- it makes actor/audit evidence less explicit;
- it creates ambiguity over whether changing a timestamp is a correction or a second event.

A tiny append-only event table is therefore more trustworthy while remaining narrow.

## 5. Authorization proposal

### Employer write

Only the employer that owns the application's vacancy may record or void an outcome event.

The mutation boundary should derive the employer identity from `auth.uid()` and prove vacancy ownership through the application → vacancy relationship.

No caller-supplied employer ID, candidate ID, or actor ID.

### Candidate write

None.

Candidate confirmation is explicitly not required for the initial private beta under D-M5-3.

### Candidate read

**Proposed:** a candidate may read non-sensitive outcome events for their own applications after the employer records them.

Candidate-visible projection should contain only:

- outcome type;
- occurred timestamp.

Do not expose internal actor IDs, voiding metadata, operator identity, or audit implementation detail.

### Operator/admin

No general outcome mutation is proposed for operators in the first implementation. If an employer makes a mistake, the employer-owned correction/void path should handle it. An operator override should be added only if beta operations prove it is necessary.

## 6. History and correction behavior

### Do not hard-delete outcome events

If an employer records an event incorrectly, preserve the original row and mark it voided through a narrow correction operation.

The active M5 metric counts only non-voided events.

### Hire uniqueness

Proposed invariant:

- at most one **active** `hired` event per application.

A voided mistaken hire may be replaced by a later corrected hire event.

### Interview multiplicity — founder decision required

Two valid options remain:

**Option A — event count (recommended for literal metric wording):** every distinct employer-recorded interview that actually occurred counts. One application may contribute multiple completed interviews.

**Option B — application conversion count:** each application contributes at most one completed-interview conversion regardless of interview rounds.

The founder-approved wording says “10 completed interviews,” which points toward Option A, but this should be explicitly approved before implementation so the metric cannot change later.

## 7. Workflow/status relationship

Outcome events must not silently mutate `applications.status`.

Examples:

- recording `interview_completed` does not auto-transition `shortlisted` → `accepted`;
- recording `hired` does not rewrite `accepted`;
- changing application status to `accepted` does not create a `hired` event.

The employer may legitimately record a hire after an application is `accepted`, but the two writes remain separate facts.

### Proposed validity guard

For Cohort A, do not over-constrain outcome recording to a particular application workflow status unless required for integrity.

Recommended minimum:

- application must belong to the employer's vacancy;
- candidate account deletion rules must be audited before allowing post-deletion outcome recording;
- outcome timestamp must not be unreasonably future-dated;
- `hired` cannot be inferred from workflow status.

A strict rule such as “interview can only be recorded while shortlisted” is rejected at proposal stage because real recruiting may skip statuses and D-070 explicitly allows workflow skips.

## 8. Deleted-account behavior to decide during implementation planning

The current D-087 rule freezes employer status transitions after candidate deletion and preserves the application as historical/read-only.

**Recommended consequence:** once the candidate account is deleted, no new outcome event may be recorded for that application. Existing outcome events remain historical, with candidate-identifying data absent because the event table should contain no candidate PII of its own.

This should be promoted into an explicit implementation decision if the outcome contract is authorized.

## 9. Audit/security proposal

The event row itself should provide the business audit trail:

- immutable event ID;
- DB-derived actor;
- occurred timestamp;
- recorded timestamp;
- optional void marker and void actor.

Do not duplicate every outcome event into `admin_audit_events`; that ledger is currently for sensitive operator/admin actions, while this is an employer-owned business event.

Any implementation must retain the established security posture:

- authenticated employer only;
- ownership checked in the database;
- no broad cross-employer application read;
- no caller-supplied actor identity;
- no service-role browser/ordinary SSR path;
- pgTAP proof for ownership, isolation, duplicate/void behavior, stale/deleted-account behavior, and candidate-safe read projection.

## 10. Funnel integration

After implementation, production M5 measurement can derive:

- completed interviews = count of active `interview_completed` events according to the founder-approved multiplicity rule;
- confirmed hires = count of active `hired` events;
- application → interview conversion;
- interview → hire conversion;
- employer-level interview/hire outcomes;
- vacancy-level interview/hire outcomes.

The existing deterministic `proof:pilot-funnel` may be extended only after the outcome schema is accepted and implemented. Do not introduce PostHog for these core metrics.

## 11. Export/deletion impact

Any implementation must explicitly update the Slice 8 data inventory.

Proposed treatment:

- candidate export: include candidate-owned application outcome events in a candidate-safe shape;
- employer export: include employer-recorded outcome events only for applications against the employer's own vacancies, without candidate PII;
- candidate deletion: preserve non-identifying recruitment outcome facts with the preserved application history;
- employer deletion: preserve non-identifying outcome facts while employer identity is tombstoned;
- no free text, which avoids an additional redaction surface.

This interaction with export/deletion is one reason the outcome feature requires a schema/privacy decision rather than being treated as an ordinary beta UI fix.

## 12. Proposed implementation decomposition — not authorized

If founder approval is later granted, the smallest likely delivery is:

1. one schema/RLS/RPC/pgTAP PR for outcome events;
2. one narrow employer record/void UI + candidate visibility + funnel integration PR;
3. focused local proof.

Do not authorize this decomposition merely by merging M5.0 documentation.

## 13. Founder decisions required before implementation

1. Interview multiplicity: count each completed interview event or at most one per application?
2. Candidate visibility: approve/revise candidate read access to employer-recorded interview/hire outcomes.
3. Employer correction: approve append-only void/replacement rather than hard edit/delete.
4. Deleted candidate: approve/revise the recommendation that no new outcome can be recorded after candidate account deletion.
5. Timestamp policy: approve whether employers may backdate `occurred_at`, and if so by what maximum window.

Until these are approved, **no outcome schema or product implementation is authorized**.
