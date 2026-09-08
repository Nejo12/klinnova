"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import { ThemePreferenceControl } from "@/components/theme/theme-preference-control";
import styles from "@/app/employer/employer-home.module.scss";
import {
  draftConsequence,
  formatVacancyDate,
  statusLabel,
} from "@/components/employer-vacancies/vacancy-list";
import type { EmployerDraftListItem } from "@/lib/employer/vacancies/load-employer-drafts";
import { jobCategoryLabel } from "@/lib/matching/labels";
import type { JobCategoryCode } from "@/lib/onboarding/allow-lists";

type Props = {
  displayName: string;
  verificationState: string;
  unseenApplicationsCount: number;
  drafts: EmployerDraftListItem[];
};

function vacancyConsequence(draft: EmployerDraftListItem, locale: "en" | "de") {
  if (draft.publicationState === "draft")
    return draftConsequence(draft, locale);
  if (locale === "de") {
    if (draft.publicationState === "paused")
      return "Für Bewerbende nicht sichtbar. Bestehende Bewerbungen bleiben offen.";
    if (draft.publicationState === "filled") {
      const date = formatVacancyDate(draft.filledAt, locale);
      return date === null
        ? "Als besetzt markiert. Keine weitere Aktion verfügbar."
        : `Am ${date} als besetzt markiert.`;
    }
    if (draft.publicationState === "expired") {
      const date = formatVacancyDate(
        draft.expiredAt ?? draft.expiresAt,
        locale,
      );
      return date === null
        ? "Abgelaufen, ohne besetzt zu werden."
        : `Am ${date} abgelaufen.`;
    }
    if (draft.publicationState === "withdrawn")
      return "Für Bewerbende nicht sichtbar. Bestehende Bewerbungen bleiben erhalten.";
    return null;
  }
  if (draft.publicationState === "paused")
    return "Not visible to candidates. Existing applications stay open.";
  if (draft.publicationState === "filled") {
    const date = formatVacancyDate(draft.filledAt, locale);
    return date === null
      ? "Marked filled. No further action is available."
      : `Marked filled on ${date}.`;
  }
  if (draft.publicationState === "expired") {
    const date = formatVacancyDate(draft.expiredAt ?? draft.expiresAt, locale);
    return date === null
      ? "Ran out without being filled."
      : `Ran out on ${date}.`;
  }
  if (draft.publicationState === "withdrawn")
    return "Not visible to candidates. Existing applications are preserved.";
  return null;
}

function VacancyRow({ draft }: { draft: EmployerDraftListItem }) {
  const { locale } = useLocale();
  const expiry =
    draft.publicationState === "published" && !draft.isEffectivelyExpired
      ? formatVacancyDate(draft.expiresAt, locale)
      : null;
  const actionHref =
    draft.publicationState === "draft"
      ? `/employer/vacancies/${draft.id}/edit`
      : `/employer/vacancies/${draft.id}`;
  return (
    <li className={styles.vacancyRow}>
      <div className={styles.vacancySummary}>
        <h3 className={styles.vacancyTitle}>{draft.title}</h3>
        <p className={styles.vacancyMeta}>
          {draft.publicLocality ??
            (locale === "de"
              ? "Ortsteil nicht angegeben"
              : "Locality not set")}{" "}
          · {jobCategoryLabel(draft.jobCategory as JobCategoryCode, locale)}
        </p>
        {vacancyConsequence(draft, locale) !== null ? (
          <p className={styles.vacancyConsequence}>
            {vacancyConsequence(draft, locale)}
          </p>
        ) : null}
      </div>
      <div className={styles.vacancyState}>
        <span
          className={styles.lifecycleBadge}
          data-state={draft.publicationState}
        >
          {statusLabel(draft, locale)}
        </span>
        {expiry !== null ? (
          <p className={styles.expiry}>
            {locale === "de" ? "Läuft ab" : "Expires"} {expiry}
          </p>
        ) : null}
        <Link className={styles.secondaryButton} href={actionHref}>
          {draft.publicationState === "draft"
            ? locale === "de"
              ? "Entwurf fortsetzen"
              : "Continue draft"
            : locale === "de"
              ? "Verwalten"
              : "Manage"}
        </Link>
      </div>
    </li>
  );
}

export function EmployerHomeContent({
  displayName,
  verificationState,
  unseenApplicationsCount,
  drafts,
}: Props) {
  const { locale, t } = useLocale();
  return (
    <>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1 className={styles.heading}>
            {t("employer.home.welcome")}, {displayName}
          </h1>
          <p className={styles.lead}>
            {locale === "de"
              ? "Ihr Arbeitsbereich für Einstellungen: zuerst neue Bewerbungen, dann die Bereitschaft Ihrer Stellen."
              : "Your hiring workspace: new applications first, vacancy readiness second."}
          </p>
        </div>
        {verificationState === "verified" ? (
          <span className={styles.verifiedBadge}>
            {t("employer.home.verified")}
          </span>
        ) : null}
      </header>

      {unseenApplicationsCount > 0 ? (
        <section
          className={styles.attentionCard}
          aria-labelledby="employer-attention-heading"
          role="status"
        >
          <div>
            <h2 id="employer-attention-heading" className={styles.cardHeading}>
              {t("employer.home.attention")}
            </h2>
            <p className={styles.cardCopy}>
              {locale === "de"
                ? `${unseenApplicationsCount} ${unseenApplicationsCount === 1 ? "neue Bewerbung wartet" : "neue Bewerbungen warten"} darauf, geöffnet zu werden.`
                : `${unseenApplicationsCount} new ${unseenApplicationsCount === 1 ? "application is" : "applications are"} waiting to be opened.`}
            </p>
          </div>
          <Link className={styles.primaryButton} href="/employer/applications">
            {t("employer.home.viewApplications")}
          </Link>
        </section>
      ) : verificationState !== "verified" ? (
        <section
          className={styles.attentionCard}
          aria-labelledby="employer-verification-heading"
        >
          <div>
            <h2
              id="employer-verification-heading"
              className={styles.cardHeading}
            >
              {locale === "de"
                ? "Verifizierung erforderlich"
                : "Verification needed"}
            </h2>
            <p className={styles.cardCopy}>
              {locale === "de"
                ? "Schließen Sie die Verifizierung ab, bevor Sie Stellen veröffentlichen."
                : "Your employer profile is complete. Verification is required before a vacancy can be published."}
            </p>
          </div>
          <Link
            className={styles.secondaryButton}
            href="/employer/verification"
          >
            {t("employer.nav.verification")}
          </Link>
        </section>
      ) : null}

      <section className={styles.section} aria-labelledby="vacancies-heading">
        <div className={styles.sectionHeader}>
          <h2 id="vacancies-heading" className={styles.sectionHeading}>
            {t("employer.home.vacancies")}
          </h2>
          <div className={styles.sectionActions}>
            <Link
              className={styles.primaryButton}
              href="/employer/vacancies/new"
            >
              {t("employer.home.createVacancy")}
            </Link>
          </div>
        </div>
        {drafts.length === 0 ? (
          <p className={styles.emptyState} role="status">
            {locale === "de"
              ? "Sie haben noch keine Stellen. Erstellen Sie einen privaten Entwurf, um eine Stelle zu beschreiben."
              : "You have no vacancies yet. Create a private draft to start describing a role."}
          </p>
        ) : (
          <ul className={styles.vacancyList}>
            {drafts.map((draft) => (
              <VacancyRow key={draft.id} draft={draft} />
            ))}
          </ul>
        )}
        <p className={styles.inlineActions}>
          <Link className={styles.textLink} href="/employer/vacancies">
            {t("employer.home.viewVacancies")}
          </Link>
        </p>
      </section>

      <section
        className={styles.accountSection}
        aria-labelledby="account-data-heading"
      >
        <div>
          <h2 id="account-data-heading" className={styles.sectionHeading}>
            {t("employer.account.data")}
          </h2>
          <p className={styles.note}>
            {locale === "de"
              ? "Laden Sie eine Kopie Ihrer Klinnova-Arbeitgeberdaten als JSON herunter."
              : "Download a copy of your Klinnova employer data as JSON."}
          </p>
        </div>
        <div className={styles.accountControls}>
          <ThemePreferenceControl />
          <div className={styles.accountActions}>
            <a className={styles.textLink} href="/employer/account/export">
              {t("employer.account.export")}
            </a>
            <Link className={styles.textLink} href="/employer/account/delete">
              {t("employer.account.delete")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
