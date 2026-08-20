---
name: klinnova-ui-verification
description: "Verify Klinnova UI/UX live in browser. Use for responsive, accessibility, focus, keyboard, interaction-state, loading, and visual behavior checks."
---

# Klinnova UI Verification

Use this skill when live UI behavior matters.

## Verification

- Prefer Playwright or the browser tools against a running local build/server or authorized hosted Preview.
- Cover relevant viewports from the repository standard: `360`, `390`, `430`, `768`, `1280`, and `1440`.
- Check horizontal overflow, focus visibility, keyboard navigation, accessible names, landmarks, touch targets, reduced motion, interaction/pending/error states, and console errors.
- For loading or motion work, prove both fast paths and controlled slow paths where practical; do not rely on race timing.
- Screenshots alone are not enough. Pair them with behavioral assertions or direct DOM/layout checks.
- Do not mutate hosted environments unless the task explicitly authorizes that environment and action.
- Record exactly what was verified, what failed, and what remains unverified.

If verification finds product-scope or legal/privacy questions, stop and report rather than inventing UI copy or behavior.
