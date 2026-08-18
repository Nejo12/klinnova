"use client";

import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { germanRequirementLabel } from "@/lib/matching/labels";
import {
  GERMAN_COMFORT_CODES,
  type GermanComfortCode,
} from "@/lib/onboarding/allow-lists";

type GermanRequirementFieldProps = {
  value: GermanComfortCode;
  onChange: (value: GermanComfortCode) => void;
  name: string;
};

/**
 * Employer-facing German-requirement control for a vacancy. Options are
 * sourced by iterating the real 4-value `GERMAN_COMFORT_CODES` domain
 * (`none | basic | conversational | comfortable`) and labelling each via
 * `germanRequirementLabel` — never a hand-written option list, so this
 * cannot silently drift from the real domain (Founder Ruling #1: no CEFR
 * levels here).
 */
export function GermanRequirementField({
  value,
  onChange,
  name,
}: GermanRequirementFieldProps) {
  return (
    <fieldset className={styles.field}>
      <legend className={styles.label}>German requirement</legend>
      {GERMAN_COMFORT_CODES.map((code) => (
        <label key={code} className={styles.checkboxRow}>
          <input
            type="radio"
            name={name}
            value={code}
            checked={value === code}
            onChange={() => onChange(code)}
          />
          <span>{germanRequirementLabel(code)}</span>
        </label>
      ))}
    </fieldset>
  );
}
