import type { MessageKey } from "@/lib/i18n/messages";

const ERROR_KEYS: Record<string, MessageKey> = {
  "We could not save that just now. Please try again.":
    "candidate.onboarding.failure",
  "Your session has ended. Log in again to continue.":
    "candidate.onboarding.sessionExpired",
  "We could not confirm your essentials just now. Please try again.":
    "candidate.onboarding.completeFailure",
  "Remove duplicate selections.": "candidate.onboarding.validation.duplicates",
  "Choose how comfortable you are using German.":
    "candidate.onboarding.validation.german",
  "Choose a language from the list.":
    "candidate.onboarding.validation.language",
  "Choose a proficiency level.": "candidate.onboarding.validation.proficiency",
  "Add at least one language.": "candidate.onboarding.validation.addLanguage",
  "Each language can only be listed once.":
    "candidate.onboarding.validation.uniqueLanguage",
  "Choose an option to continue.": "candidate.onboarding.validation.option",
  "Choose a maximum one-way travel time.":
    "candidate.onboarding.validation.travel",
  "Choose at least one job category.":
    "candidate.onboarding.validation.category",
  "Enter a valid date.": "candidate.onboarding.validation.date",
  "Choose today or a future date.":
    "candidate.onboarding.validation.futureDate",
  "Choose at least one employment type.":
    "candidate.onboarding.validation.employment",
  "Choose at least one shift preference.":
    "candidate.onboarding.validation.shift",
};

export function localizeOnboardingError(
  error: string,
  t: (key: MessageKey) => string,
): string {
  const key = ERROR_KEYS[error];
  return key ? t(key) : error;
}
