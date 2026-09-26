"use client";

import Link from "next/link";

import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  readinessItemLabel,
  type ReadinessChecklistItem,
} from "@/lib/employer/vacancies/readiness";

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
  const missing = checklist.filter((item) => !item.complete);
  const detailBlockers = missing.filter((item) => item.id !== "verification");
  const verificationOnly =
    !ready && missing.length === 1 && missing[0]?.id === "verification";
  const completed = checklist.length - missing.length;
  const count =
    locale === "de"
      ? `${completed} / ${checklist.length} abgeschlossen`
      : `${completed} / ${checklist.length} complete`;

  return (
    <section className={styles.section} aria-labelledby="readiness-heading">
      <h2 id="readiness-heading" className={styles.sectionHeading}>
        {t("employer.vacancies.readiness")}
      </h2>
      {!available || (!ready && checklist.length === 0) ? (
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
            data-verification-only={verificationOnly ? "true" : undefined}
            role="status"
          >
            {ready
              ? locale === "de"
                ? "Bereit zur Veröffentlichung"
                : "Ready to publish"
              : verificationOnly
                ? locale === "de"
                  ? "Stellenangaben vollständig"
                  : "Vacancy details complete"
                : locale === "de"
                  ? detailBlockers.length === 1
                    ? "1 Angabe fehlt"
                    : `${detailBlockers.length} Angaben fehlen`
                  : detailBlockers.length === 1
                    ? "1 detail missing"
                    : `${detailBlockers.length} details missing`}
          </p>
          <p className={styles.note}>{count}</p>
          {verificationOnly ? (
            <p className={styles.support}>
              {locale === "de"
                ? "Verifizierung vor der Veröffentlichung erforderlich. Ihr Entwurf bleibt gespeichert."
                : "Verification required before publishing. Your draft stays saved."}
            </p>
          ) : null}
          {detailBlockers.length > 0 ? (
            <ul className={styles.checklist}>
              {detailBlockers.map((item) => (
                <li key={item.id} className={styles.checklistItem}>
                  <span className={styles.checklistMarker}>
                    {t("employer.vacancies.missing")}
                  </span>
                  <span>{readinessItemLabel(item, locale)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {verificationOnly ? (
            <p className={styles.actions}>
              <Link className={styles.button} href="/employer/verification">
                {locale === "de" ? "Zur Verifizierung" : "Go to verification"}
              </Link>
            </p>
          ) : detailBlockers.length > 0 && continueHref !== undefined ? (
            <p className={styles.actions}>
              <Link className={styles.button} href={continueHref}>
                {locale === "de"
                  ? "Fehlende Angaben ergänzen"
                  : "Complete missing details"}
              </Link>
            </p>
          ) : null}
          {(ready || verificationOnly) && continueHref !== undefined ? (
            <p className={styles.actions}>
              <Link className={styles.linkButton} href={continueHref}>
                {t("employer.vacancies.edit")}
              </Link>
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
