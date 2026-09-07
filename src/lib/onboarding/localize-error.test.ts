import { describe, expect, it } from "vitest";

import { translate } from "@/lib/i18n/messages";
import { localizeOnboardingError } from "@/lib/onboarding/localize-error";

describe("localizeOnboardingError", () => {
  it("localizes known validation and session messages", () => {
    const t = (key: Parameters<typeof translate>[1]) => translate("de", key);

    expect(localizeOnboardingError("Enter a valid date.", t)).toBe(
      "Gib ein gültiges Datum ein.",
    );
    expect(
      localizeOnboardingError(
        "Your session has ended. Log in again to continue.",
        t,
      ),
    ).toBe(
      "Deine Sitzung ist abgelaufen. Melde dich erneut an, um fortzufahren.",
    );
  });

  it("preserves an unknown server message instead of hiding it", () => {
    expect(localizeOnboardingError("Unexpected message", () => "unused")).toBe(
      "Unexpected message",
    );
  });
});
