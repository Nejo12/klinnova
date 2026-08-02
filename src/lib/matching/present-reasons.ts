import {
  employmentTypeLabel,
  jobCategoryLabel,
  joinLabels,
  languageLabel,
  shiftLabel,
} from "@/lib/matching/labels";
import type { MatchReason } from "@/lib/matching/types";

export const MAX_DISPLAYED_MATCH_REASONS = 4;

export type PresentedMatchReason = {
  key: string;
  text: string;
};

export function presentMatchReason(reason: MatchReason): PresentedMatchReason {
  switch (reason.code) {
    case "category_match":
      return {
        key: reason.code,
        text: `Matches your ${jobCategoryLabel(reason.category).toLowerCase()} preference`,
      };
    case "employment_type_match": {
      const labels = reason.employmentTypes.map(employmentTypeLabel);
      if (labels.length === 1) {
        return {
          key: reason.code,
          text: `${labels[0]} work matches your preference`,
        };
      }
      return {
        key: reason.code,
        text: `${joinLabels(labels)} work matches your preference`,
      };
    }
    case "shift_match":
      if (reason.viaFlexible) {
        return {
          key: reason.code,
          text: "Your flexible shift preference fits",
        };
      }
      return {
        key: reason.code,
        text: `${joinLabels(reason.shifts.map(shiftLabel))} shifts fit your preference`,
      };
    case "german_requirement_met":
      return {
        key: `${reason.code}:${reason.germanRequirement}`,
        text: "Your German level meets the requirement",
      };
    case "additional_languages_met": {
      const labels = reason.languageCodes.map(languageLabel);
      if (labels.length === 1) {
        return {
          key: `${reason.code}:${reason.languageCodes[0]}`,
          text: `Your listed ${labels[0]} meets the requirement`,
        };
      }
      return {
        key: reason.code,
        text: "Your listed languages meet the requirement",
      };
    }
    case "availability_match":
      if (reason.kind === "flexible_start") {
        return {
          key: reason.code,
          text: "Start date fits your availability",
        };
      }
      return {
        key: reason.code,
        text: "Start date fits your availability",
      };
    case "berlin_job":
      return {
        key: reason.code,
        text: "Based in Berlin",
      };
  }
}

/** Preserve matcher order; display at most four reasons (docs/20). */
export function presentMatchReasons(
  reasons: readonly MatchReason[],
): PresentedMatchReason[] {
  return reasons.slice(0, MAX_DISPLAYED_MATCH_REASONS).map(presentMatchReason);
}
