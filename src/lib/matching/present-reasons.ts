import {
  employmentTypeLabel,
  jobCategoryLabel,
  joinLabels,
  languageLabel,
  shiftLabel,
} from "@/lib/matching/labels";
import type { Locale } from "@/lib/i18n/locale";
import type { MatchReason } from "@/lib/matching/types";

export const MAX_DISPLAYED_MATCH_REASONS = 4;

export type PresentedMatchReason = {
  key: string;
  text: string;
};

export function presentMatchReason(
  reason: MatchReason,
  locale: Locale = "en",
): PresentedMatchReason {
  switch (reason.code) {
    case "category_match":
      return {
        key: reason.code,
        text:
          locale === "de"
            ? `Passt zu deiner Präferenz: ${jobCategoryLabel(reason.category, locale)}`
            : `Matches your ${jobCategoryLabel(reason.category).toLowerCase()} preference`,
      };
    case "employment_type_match": {
      const labels = reason.employmentTypes.map((code) =>
        employmentTypeLabel(code, locale),
      );
      if (labels.length === 1) {
        return {
          key: reason.code,
          text:
            locale === "de"
              ? `${labels[0]} passt zu deiner Präferenz`
              : `${labels[0]} work matches your preference`,
        };
      }
      return {
        key: reason.code,
        text:
          locale === "de"
            ? `${joinLabels(labels, locale)} passen zu deiner Präferenz`
            : `${joinLabels(labels)} work matches your preference`,
      };
    }
    case "shift_match":
      if (reason.viaFlexible) {
        return {
          key: reason.code,
          text:
            locale === "de"
              ? "Deine flexible Schichtpräferenz passt"
              : "Your flexible shift preference fits",
        };
      }
      return {
        key: reason.code,
        text:
          locale === "de"
            ? `${joinLabels(
                reason.shifts.map((code) => shiftLabel(code, locale)),
                locale,
              )} ${reason.shifts.length === 1 ? "passt" : "passen"} zu deiner Schichtpräferenz`
            : `${joinLabels(reason.shifts.map((code) => shiftLabel(code)))} shifts fit your preference`,
      };
    case "german_requirement_met":
      return {
        key: `${reason.code}:${reason.germanRequirement}`,
        text:
          locale === "de"
            ? "Deine Deutschkenntnisse erfüllen die Anforderung"
            : "Your German level meets the requirement",
      };
    case "additional_languages_met": {
      const labels = reason.languageCodes.map((code) =>
        languageLabel(code, locale),
      );
      if (labels.length === 1) {
        return {
          key: `${reason.code}:${reason.languageCodes[0]}`,
          text:
            locale === "de"
              ? `Deine angegebene Sprache ${labels[0]} erfüllt die Anforderung`
              : `Your listed ${labels[0]} meets the requirement`,
        };
      }
      return {
        key: reason.code,
        text:
          locale === "de"
            ? "Deine angegebenen Sprachen erfüllen die Anforderung"
            : "Your listed languages meet the requirement",
      };
    }
    case "availability_match":
      if (reason.kind === "flexible_start") {
        return {
          key: reason.code,
          text:
            locale === "de"
              ? "Der Starttermin passt zu deiner Verfügbarkeit"
              : "Start date fits your availability",
        };
      }
      return {
        key: reason.code,
        text:
          locale === "de"
            ? "Der Starttermin passt zu deiner Verfügbarkeit"
            : "Start date fits your availability",
      };
    case "berlin_job":
      return {
        key: reason.code,
        text: locale === "de" ? "In Berlin" : "Based in Berlin",
      };
  }
}

/** Preserve matcher order; display at most four reasons (docs/20). */
export function presentMatchReasons(
  reasons: readonly MatchReason[],
  locale: Locale = "en",
): PresentedMatchReason[] {
  return reasons
    .slice(0, MAX_DISPLAYED_MATCH_REASONS)
    .map((reason) => presentMatchReason(reason, locale));
}
