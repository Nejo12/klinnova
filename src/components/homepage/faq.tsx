"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

import styles from "./faq.module.scss";

type FaqEntry = {
  id: string;
  question: MessageKey;
  answer: MessageKey;
};

const ENTRIES: FaqEntry[] = [
  {
    id: "language",
    question: "homepage.faq.language.q",
    answer: "homepage.faq.language.a",
  },
  {
    id: "verification",
    question: "homepage.faq.verification.q",
    answer: "homepage.faq.verification.a",
  },
  {
    id: "empty",
    question: "homepage.faq.empty.q",
    answer: "homepage.faq.empty.a",
  },
];

export function Faq({
  authenticatedDestination,
}: {
  authenticatedDestination?: string;
}) {
  const { t } = useLocale();

  return (
    <section className={styles.section} id="faq" aria-labelledby="faq-heading">
      <h2 className={styles.heading} id="faq-heading">
        {t("homepage.faq.heading")}
      </h2>
      <div className={styles.list}>
        {ENTRIES.map((entry) => (
          <details key={entry.id} className={styles.item}>
            <summary className={styles.question}>{t(entry.question)}</summary>
            <p className={styles.answer}>{t(entry.answer)}</p>
          </details>
        ))}
        <details className={styles.item}>
          <summary className={styles.question}>
            {t("homepage.faq.start.q")}
          </summary>
          <p className={styles.answer}>{t("homepage.faq.start.a")}</p>
          <div className={styles.links}>
            {authenticatedDestination === undefined ? (
              <>
                <Link className={styles.link} href="/register">
                  {t("homepage.faq.start.candidate")}
                </Link>
                <Link className={styles.link} href="/employer/register">
                  {t("homepage.faq.start.employer")}
                </Link>
              </>
            ) : (
              <Link className={styles.link} href={authenticatedDestination}>
                {t("shell.dashboard")}
              </Link>
            )}
          </div>
        </details>
      </div>
    </section>
  );
}
