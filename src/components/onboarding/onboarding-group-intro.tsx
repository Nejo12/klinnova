"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import type { OnboardingGroupId } from "@/lib/onboarding/allow-lists";
import type { MessageKey } from "@/lib/i18n/messages";

import styles from "./onboarding.module.scss";

const GROUP_KEYS: Record<OnboardingGroupId, MessageKey> = {
  languages: "candidate.onboarding.group.languages",
  work_authorisation: "candidate.onboarding.group.workAuthorisation",
  location: "candidate.onboarding.group.location",
  categories: "candidate.onboarding.group.categories",
  availability: "candidate.onboarding.group.availability",
  employment: "candidate.onboarding.group.employment",
};

export function OnboardingGroupIntro({ group }: { group: OnboardingGroupId }) {
  const { t } = useLocale();

  return (
    <>
      <h1 className={styles.heading}>{t(GROUP_KEYS[group])}</h1>
      <p className={styles.lead}>{t("candidate.onboarding.savedLead")}</p>
    </>
  );
}
