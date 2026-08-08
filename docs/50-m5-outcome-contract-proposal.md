# M5 Outcome Contract Proposal

**Status:** Founder-approved direction; discovery only; no implementation authorized

**Date:** 2026-08-09

**No schema/runtime authorization:** this document proposes the smallest trustworthy contract but does not authorize a migration, RPC, UI, or analytics change.

Related:

- M5 decisions: `docs/49-m5-beta-transition-and-measurement.md`
- Existing application workflow contract: D-070 / `docs/39-slice-6-exit-proof.md`
- Current application workflow statuses: `submitted | reviewing | shortlisted | accepted | rejected`

## 1. Problem

M5 success depends on two business outcomes:

- completed interviews;
- confirmed hires.

The existing application workflow does not represent either metric precisely.

`shortlisted` is not proof that an interview occurred. `accepted` is not proof that a hire was confirmed. Reusing those statuses would make the beta funnel semantically false.

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

Boundary:

> Application workflow answers “where is this application in the employer's recruitment workflow?” Outcome measurement answers “what real-world event actually happened?”

They remain separate.

## 3. Smallest trustworthy model

If implementation is later authorized, prefer one small append-only table conceptually named:

`application_outcome_events`

Do not add interview/hire values to `applications.status`.

### Initial event types

Only:

- `interview_completed`
- `hired`

Do not add invitation, scheduling, offer, no-show, onboarding, employment-start, or not-hired events without beta evidence.

### Proposed minimum fields

Conceptual shape only:

| Field | Purpose |
|---|---|
| `id uuid` | immutable event identity |
| `application_id uuid` | application/vacancy/candidate context |
| `event_type text` | `interview_completed` or `hired` |
| `occurred_at timestamptz` | when the real-world event occurred |
| `recorded_at timestamptz` | DB-generated immutable record timestamp |
| `recorded_by_employer_id uuid` | DB-derived/validated employer actor |
| `voided_at timestamptz null` | append-only correction marker |
| `voided_by_employer_id uuid null` | DB-derived correcting actor |
| `replacement_event_id uuid null` | optional link to corrected replacement event if the implementation needs an explicit relationship |

No free-text outcome note is proposed for Cohort A.

## 4. Authorization

### Employer write

Only the employer that owns the application's vacancy may record or void an outcome event.

Identity must derive from `auth.uid()` and ownership from application → vacancy → employer.

No caller-supplied employer ID, candidate ID, or actor ID.

### Candidate write

None.

Candidate confirmation is not required for initial M5.

### Candidate read — approved

Under D-M5-12, a candidate may read their own **active** outcome events in candidate-safe form containing only:

- outcome type;
- occurred date/time.

Do not expose:

- actor IDs;
- void/replacement metadata;
- operator details;
- internal audit details;
- internal notes.

### Operator/admin

No general operator outcome mutation is proposed initially. Add an override only if beta operations prove it necessary.

## 5. History and correction — approved

D-M5-13 requires append-only history with void/replacement correction.

Do not hard-edit or hard-delete an outcome event to rewrite history.

An active M5 outcome is a non-voided event.

### Hire uniqueness

Recommended invariant:

- at most one **active** `hired` event per application.

A voided mistaken hire may be replaced by a later corrected hire event.

### Interview multiplicity and top-line counting — approved

Multiple distinct `interview_completed` events may exist for one application when multiple interview rounds actually occurred.

However, the top-level M5 interview target is an **application conversion metric**:

- an application contributes `1` once it has at least one active, non-voided `interview_completed` event;
- further completed interview rounds remain historical events but do not increment the top-line target.

This prevents multi-round processes from inflating the target of 10 completed interviews.

## 6. Workflow/status relationship

Outcome events must not silently mutate `applications.status`.

Examples:

- `interview_completed` does not auto-transition an application;
- `hired` does not rewrite `accepted`;
- changing status to `accepted` does not create a hire event.

Do not impose a rule such as “interview can only be recorded while shortlisted”; D-070 intentionally permits workflow skips.

## 7. Deleted-candidate behavior — approved

D-M5-14 requires:

- once `candidate_profiles.account_deleted_at` is non-null, no new outcome event may be recorded for that application;
- existing non-identifying historical outcome facts may remain with the preserved application/history.

The authorization signal is the authoritative deleted-account state, not presentation data.

## 8. Outcome timestamp policy — approved

Employer-recorded `occurred_at`:

- may be backdated by at most 30 days;
- may not be future-dated except negligible clock-skew tolerance.

`recorded_at` is database-generated and immutable.

Future implementation must choose the exact negligible skew as a fixed system-owned constant, not a caller-selectable parameter.

## 9. Audit/security contract

The event row should provide the business audit trail:

- immutable event identity;
- DB-derived actor;
- occurred timestamp;
- DB-generated recorded timestamp;
- append-only void/replacement markers.

Do not duplicate every employer outcome into `admin_audit_events`; that ledger remains for sensitive operator/admin actions.

Any implementation must prove:

- authenticated employer only;
- vacancy ownership enforced in DB;
- cross-employer isolation;
- no caller-supplied actor identity;
- deleted-candidate write denial;
- correction history preservation;
- candidate-safe read projection;
- stale/deleted-account behavior;
- no service-role browser/ordinary SSR path.

## 10. M5 funnel integration

### Top-level metrics

- completed interviews = count distinct applications with at least one active `interview_completed` event;
- confirmed hires = count distinct applications with at least one active `hired` event.

### Diagnostic/history metrics

Separately retain:

- total completed interview rounds;
- application → interview conversion;
- interview → hire conversion;
- employer-level outcomes;
- vacancy-level outcomes.

The deterministic `proof:pilot-funnel` may be extended only after an outcome schema is accepted and implemented.

Do not introduce PostHog for these core Cohort A metrics.

## 11. Export/deletion impact

Any implementation must explicitly update the Slice 8 data inventory.

Expected direction:

- candidate export: include candidate-owned active/historical outcome facts in a candidate-safe shape appropriate to export;
- employer export: include employer-recorded outcome facts for own applications without candidate PII beyond already-authorized process context;
- candidate deletion: preserve non-identifying historical outcome facts, block new writes;
- employer deletion: preserve non-identifying historical facts while employer identity is tombstoned;
- no free text, avoiding another redaction surface.

Exact export shapes remain part of implementation planning because Slice 8's export contracts are intentionally narrow.

## 12. Proposed implementation decomposition — not authorized

If the founder later authorizes outcome implementation, the smallest likely delivery is:

1. schema/RLS/RPC/pgTAP contract;
2. narrow employer record/void UI + candidate-safe visibility + funnel integration;
3. focused local proof.

Merging M5.0 does **not** authorize this decomposition.

## 13. Founder decision status

The M5.0 founder decisions relevant to this proposal are now resolved:

- interview multiplicity/top-line counting — approved;
- candidate visibility — approved;
- append-only void/replacement correction — approved;
- deleted-candidate behavior — approved;
- 30-day backdating policy — approved.

No outcome schema/runtime work may begin until the founder explicitly selects and authorizes that post-M5.0 work unit after PR #74 review/merge.
