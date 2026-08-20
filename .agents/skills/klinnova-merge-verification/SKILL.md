---
name: klinnova-merge-verification
description: "Verify Klinnova state after the Founder merges. Use for post-merge GitHub, main SHA, CI, hosted proof, and authoritative-state checks."
---

# Klinnova Merge Verification

Use this skill only after the Founder says a merge happened or asks for post-merge verification.

## Verification

- Verify the PR is merged via GitHub or local Git evidence.
- Verify `main`/`origin/main` SHA, merge commit, and parents when material.
- Confirm post-merge CI status on the exact merged head.
- Verify hosted result only when applicable and authorized; do not mutate Production/Preview while checking.
- Report whether repository docs or dashboards need follow-up updates, but do not rewrite product history unless authorized.
- Never perform the merge yourself unless the user explicitly changes governance for that task.

Final output should state the authoritative repository state, remaining risks, and any blocked external proof.
