# Agent Workflow

## Discovery

Inspect branch, status, current docs, relevant plans, and implementation reality. Separate facts, assumptions, open questions, and conflicts. Do not change product code during discovery unless the task explicitly authorizes implementation.

## Implementation

Before editing, verify branch/base/status and reread the approved plan. Implement only the bounded tasks. Preserve product truth, auth/RLS boundaries, privacy constraints, and existing design-system conventions.

Use focused test/fix loops while building. If an unresolved product, legal, privacy, schema, authorization, or external-system decision is required, stop and report.

## Review

Review diffs against the intended base. Prioritize correctness, regressions, scope drift, data integrity, authorization, privacy, accessibility, responsive behavior, tests, and unnecessary complexity.

## PR Readiness

Before push or PR, verify exact HEAD, inspect the full diff, ensure no unrelated changes are included, run required local checks, and confirm hosted proof requirements where applicable. Push and PR only when authorized. Stop before merge.

## Post-Merge Verification

After the Founder merges, verify the PR merge state, main SHA, exact-head CI, and hosted result where applicable. Report authoritative state. Do not perform the merge unless governance is explicitly changed for that task.
