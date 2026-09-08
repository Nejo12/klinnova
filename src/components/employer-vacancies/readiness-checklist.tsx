"use client";

import Link from "next/link";

import { draftConsequence } from "@/components/employer-vacancies/vacancy-list";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  readinessItemLabel,
  type ReadinessChecklistItem,
} from "@/lib/employer/vacancies/readiness";
import {
  VACANCY_PRIVATE_NOTICE,
  VACANCY_VERIFICATION_INFO,
} from "@/lib/employer/vacancies/messages";

type ReadinessChecklistProps = {
  ready: boolean;
  checklist: ReadinessChecklistItem[];
  available?: boolean;
  continueHref?: string;
};

export function ReadinessChecklist({
  ready,
  checklist,
  available = true,
  continueHref,
}: ReadinessChecklistProps) {
  const { locale, t } = useLocale();
  const orderedChecklist = [...checklist].sort((a, b) => {
    if (a.complete === b.complete) {
      return 0;
    }
    return a.complete ? 1 : -1;
  });

  return (
    <section className={styles.section} aria-labelledby="readiness-heading">
      <h2 id="readiness-heading" className={styles.sectionHeading}>
        {t("employer.vacancies.readiness")}
      </h2>
      <p className={styles.note}>
        {locale === "de"
          ? "Entwürfe bleiben privat, bis Sie sie ausdrücklich veröffentlichen."
          : VACANCY_PRIVATE_NOTICE}
      </p>
      <p className={styles.note}>
        {locale === "de"
          ? "Eine passende Verifizierung ist erforderlich, bevor eine Stelle veröffentlicht werden kann."
          : VACANCY_VERIFICATION_INFO}
      </p>
      {!available ? (
        <p className={styles.support} role="status">
          {locale === "de"
            ? "Die Veröffentlichungsbereitschaft dieses Entwurfs konnte nicht geladen werden."
            : "Readiness could not be loaded for this draft."}
        </p>
      ) : (
        <>
          <p
            className={styles.readinessStatusBadge}
            data-ready={ready ? "true" : "false"}
            role="status"
          >
            {draftConsequence({ checklist }, locale)}
          </p>
          <ul className={styles.checklist}>
            {orderedChecklist.map((item) => (
              <li
                key={item.id}
                className={styles.checklistItem}
                data-complete={item.complete ? "true" : "false"}
              >
                <span className={styles.checklistMarker}>
                  {item.complete
                    ? t("employer.vacancies.complete")
                    : t("employer.vacancies.missing")}
                </span>
                <span>{readinessItemLabel(item, locale)}</span>
              </li>
            ))}
          </ul>
          {continueHref !== undefined ? (
            <p className={styles.actions}>
              <Link className={styles.button} href={continueHref}>
                {t("employer.vacancies.edit")}
              </Link>
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
