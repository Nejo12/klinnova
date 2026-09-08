"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import { VerificationRequestForm } from "@/components/employer-verification/verification-request-form";
import styles from "@/components/employer-verification/employer-verification.module.scss";
import {
  VERIFICATION_HEADING_PENDING,
  VERIFICATION_HEADING_REJECTED,
  VERIFICATION_HEADING_REVOKED,
  VERIFICATION_HEADING_UNVERIFIED,
  VERIFICATION_HEADING_VERIFIED,
  VERIFICATION_INCOMPLETE_EMPLOYER,
  VERIFICATION_PENDING_LEAD,
  VERIFICATION_REJECTED_LEAD,
  VERIFICATION_REVOKED_LEAD,
  VERIFICATION_REVOKED_NO_RESUBMIT,
  VERIFICATION_STATUS_PENDING,
  VERIFICATION_STATUS_REJECTED,
  VERIFICATION_STATUS_REVOKED,
  VERIFICATION_STATUS_UNVERIFIED,
  VERIFICATION_STATUS_VERIFIED,
  VERIFICATION_UNVERIFIED_LEAD,
  VERIFICATION_VERIFIED_LEAD,
} from "@/lib/employer/verification/messages";
import type { VerificationViewState } from "@/lib/employer/verification/resolve-verification-view";

type PanelView = Extract<VerificationViewState, { kind: "panel" }>;

type VerificationStatePanelProps = {
  view: PanelView;
  requestedAt: string | null;
  reviewedAt: string | null;
  canRequest: boolean;
  onboardingIncomplete: boolean;
};

const STATUS_COPY: Record<
  PanelView["status"],
  { badge: string; heading: string; lead: string }
> = {
  unverified: {
    badge: VERIFICATION_STATUS_UNVERIFIED,
    heading: VERIFICATION_HEADING_UNVERIFIED,
    lead: VERIFICATION_UNVERIFIED_LEAD,
  },
  pending: {
    badge: VERIFICATION_STATUS_PENDING,
    heading: VERIFICATION_HEADING_PENDING,
    lead: VERIFICATION_PENDING_LEAD,
  },
  verified: {
    badge: VERIFICATION_STATUS_VERIFIED,
    heading: VERIFICATION_HEADING_VERIFIED,
    lead: VERIFICATION_VERIFIED_LEAD,
  },
  rejected: {
    badge: VERIFICATION_STATUS_REJECTED,
    heading: VERIFICATION_HEADING_REJECTED,
    lead: VERIFICATION_REJECTED_LEAD,
  },
  revoked: {
    badge: VERIFICATION_STATUS_REVOKED,
    heading: VERIFICATION_HEADING_REVOKED,
    lead: VERIFICATION_REVOKED_LEAD,
  },
};

export function VerificationStatePanel({
  view,
  requestedAt,
  reviewedAt,
  canRequest,
  onboardingIncomplete,
}: VerificationStatePanelProps) {
  const { locale, t } = useLocale();
  const formatTimestamp = (value: string | null) => {
    if (value === null || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return value;
    return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Berlin",
    }).format(new Date(value));
  };
  const requestedLabel = formatTimestamp(requestedAt);
  const reviewedLabel = formatTimestamp(reviewedAt);
  const germanCopy: typeof STATUS_COPY = {
    unverified: {
      badge: "Nicht beantragt",
      heading: "Verifizierung wurde noch nicht beantragt",
      lead: "Die Verifizierung ist vor der Veröffentlichung von Stellen erforderlich. Es werden keine Dokumente verlangt; der Antrag verwendet Ihre aktuellen Arbeitgeberangaben und Ihre Bestätigung.",
    },
    pending: {
      badge: "In Prüfung",
      heading: "Ihr Verifizierungsantrag wird geprüft",
      lead: "Ihr Antrag ist eingegangen und wartet auf Prüfung. Die Veröffentlichung bleibt bis zur Entscheidung nicht verfügbar. Es gibt keine feste Bearbeitungszeit.",
    },
    verified: {
      badge: "Verifiziert",
      heading: "Ihr Arbeitgeberkonto ist verifiziert",
      lead: "Ihr Arbeitgeberkonto ist für die entsprechende Verifizierungsdimension bestätigt. Veröffentlichungsfähige Stellen können nun veröffentlicht werden.",
    },
    rejected: {
      badge: "Nicht genehmigt",
      heading: "Verifizierung wurde nicht genehmigt",
      lead: "Prüfen Sie den unten genannten Grund, aktualisieren Sie bei Bedarf Ihr Arbeitgeberprofil und stellen Sie den Antrag erneut.",
    },
    revoked: {
      badge: "Widerrufen",
      heading: "Verifizierung widerrufen",
      lead: "Die Verifizierung wurde widerrufen. Veröffentlichungen sind nicht verfügbar; zuvor veröffentlichte Stellen wurden automatisch pausiert. Prüfen Sie Ihre Profilangaben.",
    },
  };
  const copy = (locale === "de" ? germanCopy : STATUS_COPY)[view.status];
  const showReason = view.reviewReason !== null;
  const showRequested =
    requestedAt !== null &&
    (view.status === "pending" || view.status === "rejected");
  const showReviewed =
    reviewedAt !== null &&
    (view.status === "verified" ||
      view.status === "rejected" ||
      view.status === "revoked");
  const showDetails = showReason || showRequested || showReviewed;
  const profileActionLabel =
    view.status === "rejected"
      ? t("employer.verification.profileEdit")
      : t("employer.verification.profileReview");
  const showProfileAction = view.status !== "verified";

  return (
    <section className={styles.panel} aria-labelledby="verification-heading">
      <p
        className={styles.statusBadge}
        data-status={view.status}
        id="verification-status"
        role="status"
        aria-label={copy.badge}
      >
        {copy.badge}
      </p>
      <h2 className={styles.stateHeading} id="verification-heading">
        {copy.heading}
      </h2>
      <p className={styles.lead}>{copy.lead}</p>

      {onboardingIncomplete && view.status === "unverified" ? (
        <p className={styles.warning}>
          {locale === "de"
            ? "Schließen Sie die Arbeitgeber-Einrichtung ab, bevor Sie die Verifizierung beantragen."
            : VERIFICATION_INCOMPLETE_EMPLOYER}
        </p>
      ) : null}

      {showDetails ? (
        <dl className={styles.detailList}>
          {showReason ? (
            <div>
              <dt>{t("employer.verification.reason")}</dt>
              <dd>{view.reviewReason}</dd>
            </div>
          ) : null}
          {showRequested ? (
            <div>
              <dt>{t("employer.verification.requested")}</dt>
              <dd>{requestedLabel}</dd>
            </div>
          ) : null}
          {showReviewed ? (
            <div>
              <dt>{t("employer.verification.reviewed")}</dt>
              <dd>{reviewedLabel}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {view.status === "revoked" ? (
        <p className={styles.warning}>
          {locale === "de"
            ? "Nach einem Widerruf ist kein direkter Neuantrag möglich. Kontaktieren Sie den Support, wenn Sie dies für einen Fehler halten."
            : VERIFICATION_REVOKED_NO_RESUBMIT}
        </p>
      ) : null}

      {showProfileAction ? (
        <p className={styles.actions}>
          <Link className={styles.linkButton} href="/employer/onboarding">
            {profileActionLabel}
          </Link>
        </p>
      ) : null}

      {canRequest && view.status === "unverified" ? (
        <VerificationRequestForm
          submitLabel={t("employer.verification.request")}
          pendingLabel={t("employer.verification.requesting")}
        />
      ) : null}

      {canRequest && view.status === "rejected" ? (
        <VerificationRequestForm
          submitLabel={t("employer.verification.resubmit")}
          pendingLabel={t("employer.verification.resubmitting")}
        />
      ) : null}
    </section>
  );
}
