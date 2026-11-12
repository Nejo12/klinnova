# Agent Workflow

## Discovery

Inspect branch, status, current docs, relevant plans, and implementation reality. Separate facts, assumptions, open questions, and conflicts. Do not change product code during discovery unless the task explicitly authorizes implementation.

Discovery, architecture resolution, product decisions, schema decisions, and CI diagnosis should normally be completed in Chat before handing a task to Codex or Work. Do not spend coding-agent execution on questions that can be resolved from GitHub, current docs, or Founder review first.

## Coding-Agent Execution Boundary

Codex and Work are execution agents, not the default place for product discovery or open-ended repository analysis.

Before handing work to a coding agent, the task should normally have:

- one primary objective;
- explicit Founder-approved decisions;
- a known base branch/SHA;
- targeted files or repository areas to inspect;
- acceptance criteria;
- explicit out-of-scope items;
- required tests/checks.

If any material product, schema, authorization, privacy, legal, funding-sensitive, architectural, or irreversible decision is still unresolved, keep the task in Chat until that decision is closed.

Coding agents must not perform repository-wide inspection by default. Read only the files/areas named in the task plus directly required dependencies. Expand inspection only when implementation evidence makes it necessary, and report why.

Do not restart discovery already completed in GitHub issues, approved docs, or Founder decisions. Do not re-litigate settled product choices unless current authoritative evidence shows a genuine conflict.

Use the smallest relevant test/fix loop during implementation. Avoid repeatedly running the full quality gate during iteration; run focused checks first, then the required full gate once the implementation is stable.

Keep command output concise where tooling allows it. On successful checks, retain summaries rather than verbose logs. Inspect detailed logs only for failing commands.

Do not reinstall dependencies on every continuation. Run a frozen install when the environment is fresh, dependencies are missing, or the lockfile/package manifest changed.

## Quality Skills

During discovery and design, use `klinnova-ui-quality` for relevant UI work. During copy or prose work, use `klinnova-writing-quality` where relevant. During implementation, apply either skill only inside the approved scope.

If a quality recommendation requires redesign, a new dependency, a product-copy semantic change, a legal/privacy change, or scope expansion, stop and return to Founder/Chat instead of silently applying it.

## Implementation

Before editing, verify branch/base/status and reread the approved plan. Implement only the bounded tasks. Preserve product truth, auth/RLS boundaries, privacy constraints, and existing design-system conventions.

Use focused test/fix loops while building. If an unresolved product, legal, privacy, schema, authorization, or external-system decision is required, stop and report.

## PR Handoff

When a coding-agent task authorizes PR creation, the default endpoint is:

1. implement the approved scope;
2. run focused verification;
3. run the required final quality gate;
4. review the final diff for scope drift;
5. commit and push;
6. open the PR;
7. check required CI once on the exact PR head;
8. report the PR URL, exact head SHA, changed files, local verification, CI status and residual risk;
9. hand back to the Founder.

When any required check is incomplete, report **PENDING CI** and name the incomplete checks. Report failed checks separately. Stop and take one fresh snapshot only when the Founder explicitly requests another check. Apply the same rule during merge review. Return failed checks to Chat for diagnosis unless the Founder authorizes a bounded continuation.

Do not auto-merge. The Founder manually reviews and merges.

## Review

Review diffs against the intended base. Prioritize correctness, regressions, scope drift, data integrity, authorization, privacy, accessibility, responsive behavior, tests, and unnecessary complexity.

## PR Readiness

Before push or PR, verify exact HEAD, inspect the full diff, ensure no unrelated changes are included, run required local checks, and confirm hosted proof requirements where applicable. Push and PR only when authorized. Stop before merge.

## Post-Merge Verification

After the Founder merges, verify the PR merge state, main SHA, exact-head CI and hosted result where applicable. Report the authoritative state. The Founder performs all merges.
