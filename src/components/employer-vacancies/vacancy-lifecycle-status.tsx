"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import type { EmployerVacancyDetail } from "@/lib/employer/vacancies/load-employer-vacancy";
import {
  VACANCY_EFFECTIVE_EXPIRED_NOTE,
  VACANCY_VERIFICATION_BLOCKER,
} from "@/lib/employer/vacancies/messages";

function formatTimestamp(
  value: string | null,
  locale: "en" | "de",
): string | null {
  if (value === null) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const STATE_LABELS: Record<EmployerVacancyDetail["publicationState"], string> =
  {
    draft: "Private draft",
    published: "Published",
    paused: "Paused",
    filled: "Filled",
    expired: "Expired",
    withdrawn: "Withdrawn",
  };

type VacancyLifecycleStatusProps = {
  vacancy: EmployerVacancyDetail;
};

export function VacancyLifecycleStatus({
  vacancy,
}: VacancyLifecycleStatusProps) {
  const { locale, t } = useLocale();
  const publishedAt = formatTimestamp(vacancy.publishedAt, locale);
  const expiresAt = formatTimestamp(vacancy.expiresAt, locale);
  const isVerified = vacancy.verificationState === "verified";
  const showEffectiveExpiredNote =
    vacancy.publicationState === "published" && vacancy.isEffectivelyExpired;
  const showVerificationBlocker =
    (vacancy.publicationState === "draft" ||
      vacancy.publicationState === "paused") &&
    !isVerified;

  return (
    <section
      className={styles.section}
      aria-labelledby="lifecycle-status-heading"
    >
      <h2 id="lifecycle-status-heading" className={styles.sectionHeading}>
        {t("employer.vacancies.status")}
      </h2>
      <p className={styles.readyBadge} role="status">
        {
          (locale === "de"
            ? {
                draft: "Privater Entwurf",
                published: "Veröffentlicht",
                paused: "Pausiert",
                filled: "Besetzt",
                expired: "Abgelaufen",
                withdrawn: "Zurückgezogen",
              }
            : STATE_LABELS)[vacancy.publicationState]
        }
        {showEffectiveExpiredNote
          ? locale === "de"
            ? " — faktisch abgelaufen"
            : " — effectively expired"
          : ""}
      </p>

      {publishedAt !== null ? (
        <p className={styles.support}>
          {locale === "de" ? "Veröffentlicht" : "Published"}: {publishedAt}
        </p>
      ) : null}
      {expiresAt !== null ? (
        <p className={styles.support}>
          {locale === "de" ? "Läuft ab" : "Expires"}: {expiresAt}
        </p>
      ) : null}

      {showEffectiveExpiredNote ? (
        <p className={styles.warning}>
          {locale === "de"
            ? "Der Veröffentlichungszeitraum ist abgelaufen. Aktualisieren Sie den Status, um die Stelle zu erneuern."
            : VACANCY_EFFECTIVE_EXPIRED_NOTE}
        </p>
      ) : null}

      {vacancy.publicationState === "published" && !showEffectiveExpiredNote ? (
        <p className={styles.support}>
          {locale === "de"
            ? "Diese Stelle ist derzeit für passende Bewerbende sichtbar."
            : "This vacancy is currently visible to eligible candidates."}
        </p>
      ) : null}

      {vacancy.publicationState === "paused" ? (
        <p className={styles.support}>
          {locale === "de"
            ? "Während der Pause ist diese Stelle nicht öffentlich sichtbar. Bestehende Bewerbungen bleiben erhalten."
            : "This vacancy is not publicly visible while paused. Existing applications are preserved."}
        </p>
      ) : null}

      {vacancy.publicationState === "filled" ? (
        <p className={styles.support}>
          {locale === "de"
            ? "Diese Stelle ist als besetzt geschlossen. Es ist keine weitere Aktion verfügbar."
            : "This vacancy is closed as filled. No further action is available."}
        </p>
      ) : null}

      {vacancy.publicationState === "withdrawn" ? (
        <p className={styles.support}>
          {locale === "de"
            ? "Diese Stelle wurde zurückgezogen. Es ist keine weitere Aktion verfügbar."
            : "This vacancy was withdrawn. No further action is available."}
        </p>
      ) : null}

      {vacancy.publicationState === "expired" ? (
        <p className={styles.support}>
          {locale === "de"
            ? "Der Veröffentlichungszeitraum dieser Stelle ist abgelaufen. Erneuern Sie sie als Entwurf, prüfen Sie die Angaben und veröffentlichen Sie erneut."
            : "This vacancy’s publication period ended. Renew it to return to draft, then review and publish again."}
        </p>
      ) : null}

      {showVerificationBlocker ? (
        <p className={styles.warning}>
          {locale === "de"
            ? "Die erforderliche Verifizierung muss abgeschlossen sein, bevor Sie veröffentlichen können."
            : VACANCY_VERIFICATION_BLOCKER}{" "}
          <Link className={styles.linkButton} href="/employer/verification">
            {t("employer.home.reviewVerification")}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
