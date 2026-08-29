import Link from "next/link";

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
  return (
    <div className={styles.filterPanel}>
      <form className={styles.filterForm} method="get">
        {filter.vacancyId !== null ? (
          <input type="hidden" name="vacancy" value={filter.vacancyId} />
        ) : null}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="status-filter">
            Filter by status
          </label>
          <select
            id="status-filter"
            name="status"
            className={styles.select}
            defaultValue={filter.status ?? ""}
          >
            <option value="">All statuses</option>
            {APPLICATION_STATUS_CODES.map((status) => (
              <option key={status} value={status}>
                {applicationStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterActions}>
          <button className={styles.buttonSecondary} type="submit">
            Apply filter
          </button>
        </div>
      </form>
      {filter.vacancyId !== null ? (
        <p className={styles.note}>
          Filtered to vacancy{vacancyTitle !== null ? `: ${vacancyTitle}` : ""}.{" "}
          <Link className={styles.linkButton} href="/employer/applications">
            Clear vacancy filter
          </Link>
        </p>
      ) : null}
    </div>
  );
}
