import Link from "next/link";

import { formatReviewRow } from "@/lib/onboarding/review-values";
import {
  ONBOARDING_GROUPS,
  type OnboardingGroupId,
} from "@/lib/onboarding/allow-lists";
import { onboardingGroupHref } from "@/lib/onboarding/navigation";
import type {
  ProgressLanguage,
  ProgressProfile,
} from "@/lib/onboarding/progress";

import styles from "./onboarding.module.scss";

type OnboardingReviewTableProps = {
  profile: ProgressProfile;
  languages: readonly ProgressLanguage[];
};

export function OnboardingReviewTable({
  profile,
  languages,
}: OnboardingReviewTableProps) {
  return (
    <table className={styles.reviewTable}>
      <tbody>
        {ONBOARDING_GROUPS.map((group: OnboardingGroupId) => {
          const row = formatReviewRow(group, profile, languages);
          return (
            <tr key={group} className={styles.reviewTableRow}>
              <th scope="row" className={styles.reviewTableHeaderCell}>
                {row.label}
              </th>
              <td className={styles.reviewTableValueCell}>{row.value}</td>
              <td className={styles.reviewTableActionCell}>
                <Link
                  href={onboardingGroupHref(group)}
                  className={styles.reviewTableLink}
                  aria-label={`Edit ${row.label}`}
                >
                  Edit
                </Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
