import Link from "next/link";

import type { OnboardingGroupId } from "@/lib/onboarding/allow-lists";
import {
  onboardingGroupHref,
  previousOnboardingGroup,
} from "@/lib/onboarding/navigation";

import styles from "./onboarding.module.scss";

type GroupNavProps = {
  current: OnboardingGroupId;
  pending: boolean;
  continueLabel?: string;
};

export function GroupNav({
  current,
  pending,
  continueLabel = "Save and continue",
}: GroupNavProps) {
  const previous = previousOnboardingGroup(current);

  return (
    <div className={styles.actions}>
      {previous !== null ? (
        <Link
          className={styles.linkButton}
          href={onboardingGroupHref(previous)}
        >
          Back to previous section
        </Link>
      ) : (
        <Link className={styles.linkButton} href="/candidate">
          Back to candidate home
        </Link>
      )}
      <button className={styles.button} type="submit" disabled={pending}>
        {pending ? "Saving…" : continueLabel}
      </button>
    </div>
  );
}
