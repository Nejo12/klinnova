import {
  EMPLOYMENT_TYPE_OPTIONS,
  JOB_CATEGORY_OPTIONS,
  LANGUAGE_OPTIONS,
  SHIFT_PREFERENCE_OPTIONS,
} from "@/lib/onboarding/allow-lists";

export type CandidatePulseProfileItem = {
  key:
    | "categories"
    | "employment"
    | "shifts"
    | "german"
    | "languages"
    | "availability";
  label: string;
  value: string;
};

type CandidatePulseProfileInput = {
  profile: {
    germanComfort: string | null;
    jobCategories: readonly string[] | null;
    availableFrom: string | null;
    employmentTypes: readonly string[] | null;
    shiftPreferences: readonly string[] | null;
  };
  languages: readonly {
    languageCode: string;
    proficiency: string;
  }[];
};

function optionLabels(
  values: readonly string[] | null,
  options: readonly { code: string; label: string }[],
): string {
  if (values === null || values.length === 0) {
    return "Not set";
  }

  return values
    .map(
      (value) =>
        options.find((option) => option.code === value)?.label ?? value,
    )
    .join(", ");
}

function germanComfortLabel(value: string | null): string {
  switch (value) {
    case "none":
      return "No German yet";
    case "basic":
      return "Basic German";
    case "conversational":
      return "Conversational German";
    case "comfortable":
      return "Comfortable working in German";
    default:
      return "Not set";
  }
}

function formatAvailability(value: string | null): string {
  if (value === null) {
    return "Not set";
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function buildCandidatePulseProfile(
  input: CandidatePulseProfileInput,
): CandidatePulseProfileItem[] {
  const languageLabels = input.languages.map((language) => {
    const languageLabel =
      LANGUAGE_OPTIONS.find((option) => option.code === language.languageCode)
        ?.label ?? language.languageCode;
    return languageLabel;
  });

  return [
    {
      key: "categories",
      label: "Roles",
      value: optionLabels(input.profile.jobCategories, JOB_CATEGORY_OPTIONS),
    },
    {
      key: "employment",
      label: "Employment",
      value: optionLabels(
        input.profile.employmentTypes,
        EMPLOYMENT_TYPE_OPTIONS,
      ),
    },
    {
      key: "shifts",
      label: "Shifts",
      value: optionLabels(
        input.profile.shiftPreferences,
        SHIFT_PREFERENCE_OPTIONS,
      ),
    },
    {
      key: "german",
      label: "German",
      value: germanComfortLabel(input.profile.germanComfort),
    },
    {
      key: "languages",
      label: "Languages",
      value: languageLabels.length > 0 ? languageLabels.join(", ") : "Not set",
    },
    {
      key: "availability",
      label: "Available from",
      value: formatAvailability(input.profile.availableFrom),
    },
  ];
}
