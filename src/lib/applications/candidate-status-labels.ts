import {
  applicationStatusLabel,
  type ApplicationStatus,
} from "@/lib/applications/status";
import type { Locale } from "@/lib/i18n/locale";

export function candidateStatusDisplayLabel(
  status: ApplicationStatus,
  locale: Locale = "en",
): string {
  if (status === "rejected") {
    return locale === "de" ? "Nicht ausgewählt" : "Not selected";
  }
  return applicationStatusLabel(status, locale);
}
