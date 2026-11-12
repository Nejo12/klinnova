---
name: klinnova-review
description: "Perform an independent Klinnova branch or diff review. Use for pre-merge, whole-branch, risk, scope, or regression reviews."
---

# Klinnova Review

Use a code-review stance. Findings come first.

## Review Scope

For merge review, follow the [PR handoff](../../../docs/agent/workflow.md#pr-handoff). If required exact-head checks are incomplete, report **PENDING CI** with their names and resume only on a new Founder request.

- Resolve the intended base and inspect the full diff, untracked files, and changed tests/docs.
- Check correctness, regressions, scope drift, product truth, data integrity, authorization/RLS, privacy, accessibility, responsive behavior, tests, and unnecessary complexity.
- Verify no deferred `NOT_NOW.md` work, unapproved product semantics, hosted mutation assumptions, CI changes, or unrelated cleanup entered the branch.
- Treat user-visible Stint/Klinnova naming according to current approved plans; do not demand historical/internal identifier renames unless the plan requires them.
- Classify severity clearly and cite exact files/lines.
- Do not silently fix findings unless the current task explicitly authorizes a fix wave.

If no issues are found, say so and name any residual verification gaps.
