"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import styles from "@/components/employer-applications/employer-applications.module.scss";
import type { ApplicationListFilter } from "@/lib/employer/applications/schemas";
import {
  APPLICATION_STATUS_CODES,
  applicationStatusLabel,
} from "@/lib/employer/applications/status";

type ApplicationListFiltersProps = {
  filter: ApplicationListFilter;
  vacancyTitle: string | null;
};

/**
 * A plain GET form — no client JS, no router hook. The status filter is
 * a real select; the vacancy filter is carried as a hidden field so a
 * status change never silently drops an active vacancy filter, and can
 * be cleared with a plain link back to the unfiltered list.
 */
export function ApplicationListFilters({
  filter,
  vacancyTitle,
}: ApplicationListFiltersProps) {
  const { locale } = useLocale();
  const copy =
    locale === "de"
      ? {
          label: "Nach Status filtern",
          all: "Alle Status",
          apply: "Filter anwenden",
          filtered: "Gefiltert nach Stelle",
          clear: "Stellenfilter löschen",
        }
      : {
          label: "Filter by status",
          all: "All statuses",
          apply: "Apply filter",
          filtered: "Filtered to vacancy",
          clear: "Clear vacancy filter",
        };
  return (
    <div className={styles.filterPanel}>
      <form className={styles.filterForm} method="get">
        {filter.vacancyId !== null ? (
          <input type="hidden" name="vacancy" value={filter.vacancyId} />
        ) : null}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="status-filter">
            {copy.label}
          </label>
          <select
            id="status-filter"
            name="status"
            className={styles.select}
            defaultValue={filter.status ?? ""}
          >
            <option value="">{copy.all}</option>
            {APPLICATION_STATUS_CODES.map((status) => (
              <option key={status} value={status}>
                {applicationStatusLabel(status, locale)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterActions}>
          <button className={styles.buttonSecondary} type="submit">
            {copy.apply}
          </button>
        </div>
      </form>
      {filter.vacancyId !== null ? (
        <p className={styles.note}>
          {copy.filtered}
          {vacancyTitle !== null ? `: ${vacancyTitle}` : ""}.{" "}
          <Link className={styles.linkButton} href="/employer/applications">
            {copy.clear}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
