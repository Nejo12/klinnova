import Link from "next/link";

import styles from "@/components/internal-verification/internal-verification.module.scss";
import { moderationPageHref } from "@/lib/internal/moderation/pagination";

type ModerationPaginationProps = {
  basePath: string;
  page: number;
  rowCount: number;
  limit: number;
};

/**
 * Deterministic Next/Previous pagination. "Next" only renders when this
 * page returned a full page of rows (rowCount === limit) — the operator
 * RPCs are already hard-bounded to 100, so this never requests an
 * unbounded page.
 */
export function ModerationPagination({
  basePath,
  page,
  rowCount,
  limit,
}: ModerationPaginationProps) {
  const hasPrevious = page > 1;
  const hasNext = rowCount === limit;

  if (!hasPrevious && !hasNext) {
    return null;
  }

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      {hasPrevious ? (
        <Link
          className={styles.linkButton}
          href={moderationPageHref(basePath, page - 1)}
        >
          Previous
        </Link>
      ) : (
        <span />
      )}
      {hasNext ? (
        <Link
          className={styles.linkButton}
          href={moderationPageHref(basePath, page + 1)}
        >
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
