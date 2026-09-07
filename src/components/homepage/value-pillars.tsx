"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

import styles from "./value-pillars.module.scss";

type Pillar = {
  heading: MessageKey;
  body: MessageKey;
};

const PILLARS: Pillar[] = [
  {
    heading: "homepage.pillars.fit.heading",
    body: "homepage.pillars.fit.body",
  },
  {
    heading: "homepage.pillars.requirements.heading",
    body: "homepage.pillars.requirements.body",
  },
  {
    heading: "homepage.pillars.status.heading",
    body: "homepage.pillars.status.body",
  },
  {
    heading: "homepage.pillars.verified.heading",
    body: "homepage.pillars.verified.body",
  },
];

export function ValuePillars() {
  const { t } = useLocale();

  return (
    <section className={styles.section} aria-labelledby="value-pillars-heading">
      <h2 className={styles.heading} id="value-pillars-heading">
        {t("homepage.pillars.heading")}
      </h2>
      <ul className={styles.grid}>
        {PILLARS.map((pillar) => (
          <li key={pillar.heading} className={styles.card}>
            <h3 className={styles.cardHeading}>{t(pillar.heading)}</h3>
            <p className={styles.cardBody}>{t(pillar.body)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
