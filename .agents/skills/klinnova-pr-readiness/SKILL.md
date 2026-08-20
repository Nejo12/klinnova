---
name: klinnova-pr-readiness
description: "Prepare a Klinnova branch for Founder PR review. Use for final local checks, diff review, authorized push/PR, exact-head CI, and hosted proof readiness."
---

# Klinnova PR Readiness

Use this skill when a branch is nearing Founder review.

## Readiness Checklist

- Verify branch, base, exact HEAD, `git status --short`, and full diff.
- Confirm the branch contains no unrelated changes, protected interrupted work, secrets, unsupported config, or product-source edits outside the approved scope.
- Run the plan-required local checks. At minimum consider format, lint, typecheck, relevant tests, database/RLS checks, Playwright, and build according to risk.
- Confirm docs were updated only when a durable source of truth changed.
- Push only when explicitly authorized.
- Open a PR only when explicitly authorized.
- Verify exact-head CI and hosted/Vercel proof only when required and authorized.
- Stop before merge and report the final state.

Never treat a green local run as permission to push, open a PR, merge, deploy, or mutate Production/Preview.
