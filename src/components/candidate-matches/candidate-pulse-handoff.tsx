"use client";

import { useEffect, useState } from "react";

import { useLocale } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/locale";
import {
  employmentTypeLabel,
  formatIsoCalendarDate,
  germanComfortLabel,
  jobCategoryLabel,
  languageLabel,
  shiftLabel,
} from "@/lib/matching/labels";
import type {
  EmploymentTypeCode,
  GermanComfortCode,
  JobCategoryCode,
  LanguageCode,
  ShiftPreferenceCode,
} from "@/lib/onboarding/allow-lists";
import type { CandidatePulseProfileItem } from "@/lib/pulse/candidate-profile";

import styles from "./candidate-pulse-handoff.module.scss";

type PulsePhase = "ready" | "matching";

type CandidatePulseHandoffProps = {
  profileItems: readonly CandidatePulseProfileItem[];
};

const ITEM_LABEL_KEYS: Record<CandidatePulseProfileItem["key"], MessageKey> = {
  categories: "candidate.pulse.roles",
  employment: "candidate.pulse.employment",
  shifts: "candidate.pulse.shifts",
  german: "candidate.pulse.german",
  languages: "candidate.pulse.languages",
  availability: "candidate.pulse.available",
};

function localizedPulseValue(
  item: CandidatePulseProfileItem,
  locale: Locale,
  notSet: string,
): string {
  if (item.key === "categories" && item.rawValues) {
    return (
      item.rawValues
        .map((value) => jobCategoryLabel(value as JobCategoryCode, locale))
        .join(", ") || notSet
    );
  }
  if (item.key === "employment" && item.rawValues) {
    return (
      item.rawValues
        .map((value) =>
          employmentTypeLabel(value as EmploymentTypeCode, locale),
        )
        .join(", ") || notSet
    );
  }
  if (item.key === "shifts" && item.rawValues) {
    return (
      item.rawValues
        .map((value) => shiftLabel(value as ShiftPreferenceCode, locale))
        .join(", ") || notSet
    );
  }
  if (item.key === "languages" && item.rawValues) {
    return (
      item.rawValues
        .map((value) => languageLabel(value as LanguageCode, locale))
        .join(", ") || notSet
    );
  }
  if (item.key === "german" && item.rawValue) {
    return germanComfortLabel(item.rawValue as GermanComfortCode, locale);
  }
  if (item.key === "availability" && item.rawValue) {
    return formatIsoCalendarDate(item.rawValue, locale);
  }
  return item.rawValue === null || item.rawValues?.length === 0
    ? notSet
    : item.value;
}

function stripPulseMarkerFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("pulse")) {
    return;
  }

  url.searchParams.delete("pulse");
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

export function CandidatePulseHandoff({
  profileItems,
}: CandidatePulseHandoffProps) {
  const { locale, t } = useLocale();
  const [phase, setPhase] = useState<PulsePhase>("ready");

  useEffect(() => {
    stripPulseMarkerFromUrl();

    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const delay = reducedMotion ? 0 : 650;
    const timer = window.setTimeout(() => setPhase("matching"), delay);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section
      className={styles.root}
      data-phase={phase}
      aria-label={t("candidate.pulse.label")}
    >
      <ol className={styles.rail} aria-label={t("candidate.pulse.stages")}>
        <li
          className={`${styles.stage} ${
            phase === "ready" ? styles.stageCurrent : styles.stageComplete
          }`}
          aria-current={phase === "ready" ? "step" : undefined}
        >
          {t("candidate.pulse.understanding")}
        </li>
        <li
          className={`${styles.stage} ${
            phase === "matching" ? styles.stageCurrent : ""
          }`}
          aria-current={phase === "matching" ? "step" : undefined}
        >
          {t("candidate.pulse.connecting")}
        </li>
        <li className={styles.stage}>{t("candidate.pulse.progressing")}</li>
      </ol>

      <div className={styles.ready} aria-hidden={phase === "matching"}>
        <p className={styles.eyebrow}>{t("candidate.pulse.profileReady")}</p>
        <h2 className={styles.readyTitle}>{t("candidate.pulse.ready")}</h2>
        <p className={styles.readyBody}>{t("candidate.pulse.readyBody")}</p>
        {phase === "ready" ? (
          <button
            className={styles.skipButton}
            type="button"
            onClick={() => setPhase("matching")}
          >
            {t("candidate.pulse.showNow")}
          </button>
        ) : null}
      </div>

      <div className={styles.matching} aria-hidden={phase === "ready"}>
        <p className={styles.matchingTitle}>{t("candidate.pulse.matching")}</p>
        <ul className={styles.profileItems}>
          {profileItems.map((item) => (
            <li className={styles.profileItem} key={item.key}>
              <span className={styles.itemLabel}>
                {t(ITEM_LABEL_KEYS[item.key])}
              </span>
              <span className={styles.itemValue}>
                {localizedPulseValue(item, locale, t("candidate.pulse.notSet"))}
              </span>
            </li>
          ))}
        </ul>
        <p className={styles.guidance}>{t("candidate.pulse.guidance")}</p>
      </div>
    </section>
  );
}
