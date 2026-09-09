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
  ["workspace.switch", "Arbeitsbereich wechseln"],
  ["workspace.alsoEmployer", "Klinnova auch als Arbeitgeber nutzen"],
  ["auth.logOut", "Abmelden"],
  ["auth.logOutAll", "Von allen Geräten abmelden"],
  ["candidateReview.readyTitle", "Bereit fürs Matching"],
  ["candidateReview.continueProfile", "Profil fortsetzen"],
  ["candidateReview.group.workPreferences", "Arbeitswünsche"],
];

const REPRESENTATIVE_CANDIDATE_MESSAGES: Array<[MessageKey, string]> = [
  ["candidate.nav.matches", "Passende Jobs"],
  ["candidate.home.continue", "Onboarding fortsetzen"],
  ["candidate.onboarding.germanComfort", "Deutschkenntnisse"],
  ["candidate.onboarding.validation.date", "Gib ein gültiges Datum ein."],
  ["candidate.matches.emptyHeading", "Zurzeit keine passenden Jobs"],
  ["candidate.jobs.details", "Jobdetails"],
  ["candidate.applications.heading", "Bewerbungen"],
  ["candidate.applications.notSelected", "Nicht ausgewählt"],
  ["candidate.account.exportAction", "Bewerbendendaten herunterladen"],
  ["candidate.account.deleteHeading", "Mein Klinnova-Konto löschen"],
  ["candidate.loading.statusTimeline", "Statusverlauf wird geladen"],
];

const REPRESENTATIVE_EMPLOYER_MESSAGES: Array<[MessageKey, string]> = [
  ["employer.nav.vacancies", "Stellen"],
  ["employer.home.attention", "Erfordert Ihre Aufmerksamkeit"],
  ["employer.onboarding.howHire", "Wie stellen Sie ein?"],
  ["employer.vacancies.readiness", "Bereit zur Veröffentlichung"],
  ["employer.applications.needsReview", "Zu prüfen"],
  ["employer.verification.request", "Verifizierung beantragen"],
  ["employer.account.export", "Kontodaten exportieren"],
  ["employer.notifications.heading", "Benachrichtigungen"],
  ["employer.notifications.markAllRead", "Alle als gelesen markieren"],
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

describe("Candidate locale messages", () => {
  it.each(REPRESENTATIVE_CANDIDATE_MESSAGES)(
    "resolves %s in English and German",
    (key, german) => {
      expect(translate("en", key)).not.toHaveLength(0);
      expect(translate("de", key)).toBe(german);
    },
  );

  it("uses deterministic English fallback for Candidate copy", () => {
    expect(translate("de", "candidate.matches.retry")).toBe("Erneut versuchen");
    expect(translate("en", "candidate.matches.retry")).toBe("Try again");
  });
});

describe("Employer locale messages", () => {
  it.each(REPRESENTATIVE_EMPLOYER_MESSAGES)(
    "resolves %s in English and German",
    (key, german) => {
      expect(translate("en", key)).not.toHaveLength(0);
      expect(translate("de", key)).toBe(german);
    },
  );

  it("keeps deterministic English fallback behavior", () => {
    expect(translate("en", "employer.verification.reason")).toBe("Reason");
  });
});
