import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import styles from "@/components/employer-verification/employer-verification.module.scss";
import { VERIFICATION_PAGE_HEADING } from "@/lib/employer/verification/messages";

// Every one of the five mutually-exclusive status panels (Not requested /
// Pending review / Verified / Not approved / Revoked) shares the same
// `.panel > .statusHeading + .lead [+ .detailList] [+ .actions]` shape —
// only the text and the exact detail rows differ per branch. Which branch
// resolves is unknown pre-load, so this skeletons the shape common to all
// of them rather than guessing a specific status. A representative row
// count, not a claim about which detail rows will actually be present.
const DETAIL_ROW_SKELETON_COUNT = 2;

/**
 * Route-loading state for /employer/verification. Renders the static page
 * heading for real (imported straight from the same source
 * `EmployerVerificationPage` uses) and skeletons the shared panel shape
 * every `view.status` branch renders (see
 * `employer-verification.module.scss`'s `.detailList`, which — like
 * employer-vacancies' — stacks bare `<dt>`/`<dd>` with no `.metaRow`-style
 * grid class, so each row here is two stacked blocks, not a paired grid).
 *
 * "Verification" is the one piece of copy identical across all five
 * `view.status` branches and never dependent on `loadEmployerProfile`
 * resolving — rendering it here for real means it never pops in above the
 * status-panel skeleton on swap, and this copy can't drift out of sync
 * with the real page since it's the same imported constant (the same fix
 * already applied to `src/app/jobs/loading.tsx`; Task F re-audit, P3.6).
 *
 * Left out entirely because their structure is data-dependent:
 * - `EmployerRestrictedNotice` (suspended employers only)
 * - which specific status heading/lead copy applies (the branch itself is
 *   unresolved)
 * - the "Finish employer onboarding" warning (`unverified` + incomplete
 *   onboarding only)
 * - `VerificationRequestForm` (only two of five branches show it, and it's
 *   interactive controls a skeleton must never fabricate)
 * - the revoked-only "no resubmit" warning
 */
// The real page (src/app/employer/verification/page.tsx) has two distinct
// top-level children under `<main className={styles.page}>`: the heading
// and whichever one of the five mutually-exclusive status panels renders —
// each individually gapped by `.page`'s `gap: var(--space-6)`. Keeping the
// heading a direct child of `<main>` (rather than wrapping it in its own
// DelayedReveal/SkeletonRegion, now that it's real content rather than a
// skeleton) and the status panel in its own pair preserves that gap
// between the two.
export default function Loading() {
  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>{VERIFICATION_PAGE_HEADING}</h1>

      <DelayedReveal>
        <SkeletonRegion label="Loading verification status">
          <div className={styles.panel}>
            <Skeleton height="1.25rem" width="9rem" radius="sm" />
            <Skeleton height="1rem" width="90%" radius="sm" />
            <div className={styles.detailList}>
              {Array.from({ length: DETAIL_ROW_SKELETON_COUNT }, (_, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-1)",
                  }}
                >
                  <Skeleton height="0.875rem" width="6rem" radius="sm" />
                  <Skeleton height="1rem" width="10rem" radius="sm" />
                </div>
              ))}
            </div>
            <div className={styles.actions}>
              <Skeleton height="2.75rem" width="10rem" radius="sm" />
            </div>
          </div>
        </SkeletonRegion>
      </DelayedReveal>
    </main>
  );
}
