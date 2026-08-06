import {
  missingRequirementLabel,
  type MissingRequirementCode,
} from "@/lib/matching/missing-requirement-codes";

import styles from "./candidate-job-detail.module.scss";

type MissingRequirementsListProps = {
  codes: readonly MissingRequirementCode[];
  labelledBy: string;
};

/**
 * Renders the canonical missing-requirement codes as accessible labels —
 * never the raw codes. Order is preserved exactly as supplied (the
 * database's own evaluation order); never re-sorted here.
 */
export function MissingRequirementsList({
  codes,
  labelledBy,
}: MissingRequirementsListProps) {
  return (
    <ul className={styles.languageList} aria-labelledby={labelledBy}>
      {codes.map((code) => (
        <li key={code} className={styles.languageItem}>
          {missingRequirementLabel(code)}
        </li>
      ))}
    </ul>
  );
}
