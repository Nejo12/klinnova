import type { Locale } from "@/lib/i18n/locale";

const GERMAN_MESSAGES: Record<string, string> = {
  "Something went wrong. Please try again.":
    "Etwas ist schiefgegangen. Bitte versuchen Sie es erneut.",
  "You must be signed in to continue as an employer.":
    "Sie müssen angemeldet sein, um als Arbeitgeber fortzufahren.",
  "Choose an employer type.": "Wählen Sie eine Arbeitgeberart aus.",
  "Confirm that you will hire lawfully.":
    "Bestätigen Sie, dass Sie nur rechtmäßig einstellen.",
  "Your employer details were saved.":
    "Ihre Arbeitgeberangaben wurden gespeichert.",
  "Your organisation details were saved.":
    "Ihre Organisationsangaben wurden gespeichert.",
  "The display name is required.": "Der Anzeigename ist erforderlich.",
  "The Berlin locality is required.": "Der Berliner Ortsteil ist erforderlich.",
  "The organisation legal name is required.":
    "Der rechtliche Name der Organisation ist erforderlich.",
  "The company name is required.": "Der Unternehmensname ist erforderlich.",
  "The company slug is required.": "Der Unternehmens-Slug ist erforderlich.",
  "This company slug is already in use.":
    "Dieser Unternehmens-Slug wird bereits verwendet.",
  "The vacancy title is required.": "Der Stellentitel ist erforderlich.",
  "Choose a job category.": "Wählen Sie eine Stellenkategorie aus.",
  "Enter a valid date.": "Geben Sie ein gültiges Datum ein.",
  "The draft was saved.": "Der Entwurf wurde gespeichert.",
  "Language requirements were saved.":
    "Die Sprachanforderungen wurden gespeichert.",
  "The draft was deleted.": "Der Entwurf wurde gelöscht.",
  "Confirm the attestation before requesting verification.":
    "Bestätigen Sie die Erklärung, bevor Sie die Verifizierung beantragen.",
  "Verification requested. You will see the review status here.":
    "Die Verifizierung wurde beantragt. Den Prüfstatus sehen Sie hier.",
};

/** Localizes known server-owned feedback without translating authored text. */
export function localizeEmployerMessage(
  message: string,
  locale: Locale,
): string {
  return locale === "de" ? (GERMAN_MESSAGES[message] ?? message) : message;
}
