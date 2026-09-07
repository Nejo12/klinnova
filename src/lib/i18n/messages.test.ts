import { describe, expect, it } from "vitest";

import { translate, type MessageKey } from "@/lib/i18n/messages";

const REPRESENTATIVE_PUBLIC_MESSAGES: Array<[MessageKey, string]> = [
  ["homepage.hero.heading", "Jobs, die zu deiner Situation passen."],
  ["homepage.pillars.heading", "Gemacht für den Berliner Arbeitsalltag"],
  ["homepage.candidate.heading", "Du weißt immer, wie es weitergeht"],
  ["homepage.jobs.heading", "Jetzt offene Stellen in Berlin"],
  ["homepage.employer.heading", "Erreiche Menschen, die anfangen können"],
  ["homepage.final.heading", "Jetzt arbeiten — zuerst in Berlin"],
  ["publicJobs.heading", "Jobs in Berlin"],
  ["publicJobs.failureHeading", "Jobs sind nicht verfügbar"],
];

describe("public and shared locale messages", () => {
  it.each(REPRESENTATIVE_PUBLIC_MESSAGES)(
    "resolves %s in English and German",
    (key, german) => {
      expect(translate("en", key)).not.toHaveLength(0);
      expect(translate("de", key)).toBe(german);
    },
  );

  it("keeps the established English fallback for a missing German value", () => {
    expect(translate("de", "footer.impressum")).toBe("Impressum");
  });
});
