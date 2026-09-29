import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe.each([
  ["confirmation", "signup", "Confirm email", "Confirm your email address"],
  ["recovery", "recovery", "Choose new password", "Reset your password"],
] as const)("Auth %s email template", (name, type, action, heading) => {
  const template = readFileSync(
    join(process.cwd(), "supabase", "templates", `${name}.html`),
    "utf8",
  );
  const callback = `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=${type}`;

  it("retains the scanner-resistant callback for CTA and fallback", () => {
    expect(template.split(`href="${callback}"`)).toHaveLength(3);
    expect(template).toMatch(
      new RegExp(
        `{{ \\.RedirectTo }}&amp;token_hash={{ \\.TokenHash\\s*}}&amp;type=${type}`,
      ),
    );
    expect(template).not.toContain("{{ .ConfirmationURL }}");
    expect(template).toContain("{{ .TokenHash }}");
  });

  it("has the approved action, guidance, and support without an expiry promise", () => {
    expect(template).toContain(`<h1 style="`);
    expect(template).toContain(heading);
    expect(template).toContain(action);
    expect(template).toContain("copy this address into your browser");
    expect(template).toContain("support@klinnova.com");
    expect(template).toMatch(/ignore this email/);
    expect(template).not.toMatch(/expir(?:e|es|y)|24.hour|24 hour/i);
  });
});
