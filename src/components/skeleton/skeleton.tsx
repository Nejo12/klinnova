import styles from "./skeleton.module.scss";

export type SkeletonVariant = "line" | "block" | "card";

export type SkeletonProps = {
  variant?: SkeletonVariant;
  className?: string;
};

export function Skeleton({ variant = "line", className }: SkeletonProps) {
  const classNames = [styles.skeleton, className].filter(Boolean).join(" ");

  return (
    <div className={classNames} data-variant={variant} aria-hidden="true">
      {variant === "card" ? (
        <>
          <span className={styles.media} data-skeleton-part="media" />
          <span className={styles.content} data-skeleton-part="content">
            <span className={styles.title} data-skeleton-part="title" />
            <span className={styles.bodyLong} data-skeleton-part="body" />
            <span className={styles.bodyShort} data-skeleton-part="body" />
            <span className={styles.action} data-skeleton-part="action" />
          </span>
        </>
      ) : null}
    </div>
  );
}
