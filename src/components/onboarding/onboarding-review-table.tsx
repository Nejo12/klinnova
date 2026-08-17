import Link from "next/link";

import { formatReviewRow } from "@/lib/onboarding/review-values";
import {
  ONBOARDING_GROUPS,
  type OnboardingGroupId,
} from "@/lib/onboarding/allow-lists";
import { onboardingGroupHref } from "@/lib/onboarding/navigation";
import type { ProgressLanguage, ProgressProfile } from "@/lib/onboarding/progress";

type OnboardingReviewTableProps = {
  profile: ProgressProfile;
  languages: readonly ProgressLanguage[];
};

export function OnboardingReviewTable({
  profile,
  languages,
}: OnboardingReviewTableProps) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginBottom: "var(--space-5)",
      }}
    >
      <tbody>
        {ONBOARDING_GROUPS.map((group: OnboardingGroupId) => {
          const row = formatReviewRow(group, profile, languages);
          return (
            <tr
              key={group}
              style={{
                borderBottom: "1px solid var(--color-border-default)",
              }}
            >
              <td
                style={{
                  padding: "var(--space-4)",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-text-primary)",
                  verticalAlign: "top",
                  width: "30%",
                }}
              >
                {row.label}
              </td>
              <td
                style={{
                  padding: "var(--space-4)",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                  verticalAlign: "top",
                }}
              >
                {row.value}
              </td>
              <td
                style={{
                  padding: "var(--space-4)",
                  textAlign: "right",
                  verticalAlign: "top",
                }}
              >
                <Link
                  href={onboardingGroupHref(group)}
                  style={{
                    color: "var(--color-text-link)",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-semibold)",
                    textDecoration: "none",
                  }}
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
