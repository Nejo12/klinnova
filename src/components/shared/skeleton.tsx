import type { CSSProperties, ReactNode } from "react";

import styles from "./skeleton.module.scss";

type SkeletonRadius = "sm" | "md" | "pill";

// Non-null assertions: these classes are always defined in
// skeleton.module.scss (covered by the radius tests below); the assertions
// exist only because tsconfig's noUncheckedIndexedAccess widens every
// styles.* lookup to `string | undefined`.
const RADIUS_CLASS: Record<SkeletonRadius, string> = {
  sm: styles.radiusSm!,
  md: styles.radiusMd!,
  pill: styles.radiusPill!,
};

type SkeletonProps = {
  width?: string; // e.g. "100%", "8rem" — default "100%"
  height: string; // required — callers must be deliberate about the geometry they're replacing
  radius?: SkeletonRadius;
  className?: string;
};

/**
 * A single placeholder block standing in for content that hasn't loaded yet.
 *
 * Flat, static tint by default — no shimmer. The design artifact this plan
 * came from proposed a 1400ms shimmer, but Global Constraint 3 forbids
 * inventing new timing tokens and no existing token matches that duration,
 * so a static tint is the compliant default rather than an arbitrary number.
 *
 * Always aria-hidden: this element must never reach the accessibility tree —
 * the announcement is SkeletonRegion's job.
 */
export function Skeleton({
  width = "100%",
  height,
  radius = "sm",
  className,
}: SkeletonProps) {
  const classNames = [styles.skeleton, RADIUS_CLASS[radius], className]
    .filter(Boolean)
    .join(" ");
  const style: CSSProperties = { width, height };

  return <div aria-hidden="true" className={classNames} style={style} />;
}

type SkeletonRegionProps = {
  label: string; // e.g. "Loading vacancies" — screen-reader-only text
  children: ReactNode; // the Skeleton blocks (or any placeholder content) for this region
};

/**
 * Announces a loading region to assistive tech and wraps its placeholder
 * content. role="status" already implies aria-live="polite", so no explicit
 * aria-live is added (Global Constraint 7 forbids the redundancy).
 */
export function SkeletonRegion({ label, children }: SkeletonRegionProps) {
  return (
    <div role="status" aria-busy="true">
      <span className={styles.srOnly}>{label}</span>
      {children}
    </div>
  );
}

type DelayedRevealProps = { children: ReactNode };

/**
 * Withholds its children visually until --duration-standard has elapsed,
 * then fades them in — a pure-CSS display-delay with no setTimeout. See
 * skeleton.module.scss for why this matters: a CSS-only approach means a
 * fast-resolving route unmounts this tree before the animation ever starts,
 * so the skeleton it wraps never appears at all.
 */
export function DelayedReveal({ children }: DelayedRevealProps) {
  return <div className={styles.delayedReveal}>{children}</div>;
}
