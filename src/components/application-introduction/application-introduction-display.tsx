"use client";

import { useId } from "react";

import { useLocale } from "@/components/i18n/locale-provider";

import styles from "./application-introduction-display.module.scss";

type ApplicationIntroductionDisplayProps = {
  audience: "candidate" | "employer";
  text: string | null;
};

export function ApplicationIntroductionDisplay({
  audience,
  text,
}: ApplicationIntroductionDisplayProps) {
  const { t } = useLocale();
  const headingId = useId();

  if (text === null) {
    return null;
  }

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 className={styles.heading} id={headingId}>
        {t(
          audience === "candidate"
            ? "application.introduction.submittedHeading"
            : "application.introduction.employerHeading",
        )}
      </h2>
      <p className={styles.text}>{text}</p>
    </section>
  );
}
