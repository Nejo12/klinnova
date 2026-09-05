import type { Locale } from "@/lib/i18n/locale";

export const APPLICATION_INTRODUCTION_MAX_LENGTH = 1_000;

type ApplicationIntroductionContext = {
  employerDisplayName: string;
  vacancyTitle: string;
};

/**
 * Deterministic starting text using only job context already shown on the
 * application page. It is not persisted before explicit submission.
 */
export function buildApplicationIntroductionSuggestion(
  locale: Locale,
  context: ApplicationIntroductionContext,
): string {
  if (locale === "de") {
    return `Guten Tag, ich interessiere mich für die Stelle ${context.vacancyTitle} bei ${context.employerDisplayName}. Gerne bespreche ich, wie meine Erfahrung und Verfügbarkeit zu der Stelle passen.`;
  }

  return `Hello, I’m interested in the ${context.vacancyTitle} role at ${context.employerDisplayName}. I’d be happy to discuss how my experience and availability fit the job.`;
}

/** The database applies the same normalization authoritatively. */
export function normalizeApplicationIntroduction(value: string): string {
  return value.trim();
}
