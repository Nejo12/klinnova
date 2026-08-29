import Link from "next/link";

import { EmployerEmptyState } from "@/components/employer-shared/employer-empty-state";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import type {
  EmployerDraftListItem,
  VacancyLifecycleState,
} from "@/lib/employer/vacancies/load-employer-drafts";
import type { ReadinessChecklistItem } from "@/lib/employer/vacancies/readiness";
import {
  VACANCY_EMPTY_LIST,
  VACANCY_LIST_LEAD,
  VACANCY_PRIVATE_NOTICE,
  VACANCY_VERIFICATION_EMPTY_ACTION,
  VACANCY_VERIFICATION_EMPTY_HEADING,
  VACANCY_VERIFICATION_EMPTY_SUPPORT,
} from "@/lib/employer/vacancies/messages";
import { jobCategoryLabel } from "@/lib/matching/labels";
import type { JobCategoryCode } from "@/lib/onboarding/allow-lists";

type VacancyListProps = {
  drafts: EmployerDraftListItem[];
  /**
   * Own-profile `verification_state` ('unverified' | 'pending' | 'verified'
   * | 'rejected' | 'revoked'), loaded once by the page via
   * `loadEmployerProfile`. `null` means the caller didn't load it (or the
   * load failed) — treated the same as "not verified" would be wrong, so
   * callers that omit it simply never see the verification-specific empty
   * state, falling back to the generic one.
   */
  verificationState?: string | null;
};

export const STATE_LABELS: Record<
  EmployerDraftListItem["publicationState"],
  string
> = {
  draft: "Private draft",
  published: "Published",
  paused: "Paused",
  filled: "Filled",
  expired: "Expired",
  withdrawn: "Withdrawn",
};

// "Live" = publicly visible or resumable-to-visible without a full
// republish (published, paused). Everything else — draft (never
// published), filled/expired/withdrawn (terminal or renew-only) — is
// "Not live".
const LIVE_STATES = new Set<VacancyLifecycleState>(["published", "paused"]);

export type GroupedVacancies = {
  live: EmployerDraftListItem[];
  notLive: EmployerDraftListItem[];
};

export function groupVacancies(
  drafts: EmployerDraftListItem[],
): GroupedVacancies {
  const live: EmployerDraftListItem[] = [];
  const notLive: EmployerDraftListItem[] = [];
  for (const draft of drafts) {
    (LIVE_STATES.has(draft.publicationState) ? live : notLive).push(draft);
  }
  return { live, notLive };
}

/** Berlin-facing calendar dates for vacancy list/manage consequence copy. */
export function formatVacancyDate(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/Berlin",
  }).format(date);
}

export function statusLabel(draft: EmployerDraftListItem): string {
  const base = STATE_LABELS[draft.publicationState];
  if (draft.publicationState === "published" && draft.isEffectivelyExpired) {
    return `${base} — effectively expired`;
  }
  return base;
}

function nextActionHint(draft: EmployerDraftListItem): string {
  switch (draft.publicationState) {
    case "draft":
      return "Review readiness, then publish";
    case "published":
      return draft.isEffectivelyExpired
        ? "Refresh expired status or renew"
        : "Pause, mark filled, or withdraw";
    case "paused":
      return "Resume, mark filled, or withdraw";
    case "expired":
      return "Renew to draft";
    case "filled":
    case "withdrawn":
      return "No action available";
  }
}

function formatMissingList(labels: string[]): string {
  if (labels.length === 1) {
    return labels[0]!;
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

/**
 * Shared truncation discipline: names each label when there are 3 or
 * fewer, falls back to a bare count when there are more (a fresh draft's
 * readiness checklist can have ~13 missing items — naming all of them
 * would be an unreadable run-on). Used by `draftConsequence` below (row
 * consequence sentence) and by the employer home page's attention-card
 * reason (`draftIncompleteReason` in `src/app/employer/page.tsx`), so the
 * two surfaces don't re-solve the same problem differently.
 */
export function summarizeMissingLabels(labels: string[]): string {
  if (labels.length > 3) {
    return `${labels.length} required details`;
  }
  return formatMissingList(labels);
}

const DRAFT_FALLBACK_CONSEQUENCE =
  "Missing required details before publishing.";

/**
 * Derived from an already-loaded readiness checklist — never a hardcoded
 * sentence. Falls back to a shorter, always-true statement when readiness
 * could not be computed (`checklist` empty) or when more than three fields
 * are missing (naming all of them would be an unreadable run-on — see
 * `summarizeMissingLabels` above). Takes only `{ checklist }` (not the
 * full `EmployerDraftListItem`) so it can also be reused for a
 * single-vacancy readiness lookup that isn't a full list row — see
 * `application-list.tsx`'s "This vacancy is a draft" empty state.
 */
export function draftConsequence(draft: {
  checklist: ReadinessChecklistItem[];
}): string {
  if (draft.checklist.length === 0) {
    return DRAFT_FALLBACK_CONSEQUENCE;
  }
  const missing = draft.checklist.filter((item) => !item.complete);
  if (missing.length === 0) {
    return "Ready to publish.";
  }
  const summary = summarizeMissingLabels(missing.map((item) => item.label));
  return missing.length > 3
    ? `${summary} missing before publishing.`
    : `${summary} still needed before publishing.`;
}

/**
 * One consequence-of-current-state sentence per row, distinct from
 * `nextActionHint` (an available-actions hint). `null` for `published`
 * (no consequence copy for this state; per-vacancy application counts
 * remain unsupported and must not be shown).
 *
 * Every non-null sentence here is verified against
 * `_transition_employer_vacancy`
 * (supabase/migrations/20260805110000_verification_and_vacancy_publication.sql):
 * `pause` and `withdraw` only ever update the `vacancies` row, never
 * `applications` — so "existing applications" claims below are real, not
 * assumed.
 */
function consequenceSentence(draft: EmployerDraftListItem): string | null {
  switch (draft.publicationState) {
    case "draft":
      return draftConsequence(draft);
    case "paused":
      return "Not visible to candidates. Existing applications stay open.";
    case "filled": {
      const date = formatVacancyDate(draft.filledAt);
      return date === null
        ? "Marked filled. No further action is available."
        : `You marked this filled on ${date}.`;
    }
    case "expired": {
      const date = formatVacancyDate(draft.expiredAt ?? draft.expiresAt);
      return date === null
        ? "Ran out without being filled."
        : `Ran out on ${date} without being filled.`;
    }
    case "withdrawn":
      return "Not visible to candidates. Existing applications are preserved. No further action is available.";
    case "published":
      return null;
  }
}

export function VacancyList({
  drafts,
  verificationState = null,
}: VacancyListProps) {
  const { live, notLive } = groupVacancies(drafts);

  // A zero-draft employer who isn't verified yet isn't blocked by "forgot
  // to create a draft" — they're blocked by verification. More specific
  // and more useful than the generic empty state in that situation.
  const showVerificationEmptyState =
    drafts.length === 0 &&
    verificationState !== null &&
    verificationState !== "verified";

  return (
    <>
      <div className={styles.pageIntro}>
        <div className={styles.pageIntroCopy}>
          <p className={styles.lead}>{VACANCY_LIST_LEAD}</p>
          <p className={styles.note}>{VACANCY_PRIVATE_NOTICE}</p>
        </div>
        <p className={styles.pageIntroActions}>
          <Link className={styles.button} href="/employer/vacancies/new">
            Create draft
          </Link>
        </p>
      </div>

      {drafts.length === 0 ? (
        showVerificationEmptyState ? (
          <EmployerEmptyState
            headingId="vacancies-verification-empty-heading"
            heading={VACANCY_VERIFICATION_EMPTY_HEADING}
            support={VACANCY_VERIFICATION_EMPTY_SUPPORT}
            actionHref="/employer/verification"
            actionLabel={VACANCY_VERIFICATION_EMPTY_ACTION}
          />
        ) : (
          // No action link here: the "Create draft" button immediately
          // above already is the one action this state would otherwise
          // repeat with identical text/href.
          <EmployerEmptyState
            headingId="vacancies-empty-heading"
            heading={VACANCY_EMPTY_LIST}
          />
        )
      ) : (
        <>
          <VacancyListGroup
            headingId="live-vacancies-heading"
            heading="Live"
            drafts={live}
          />
          <VacancyListGroup
            headingId="not-live-vacancies-heading"
            heading="Not live"
            drafts={notLive}
          />
        </>
      )}
    </>
  );
}

type VacancyListGroupProps = {
  headingId: string;
  heading: string;
  drafts: EmployerDraftListItem[];
};

function VacancyListGroup({
  headingId,
  heading,
  drafts,
}: VacancyListGroupProps) {
  return (
    <section
      className={`${styles.section} ${styles.vacancyGroup}`}
      aria-labelledby={headingId}
    >
      <div className={styles.sectionHeader}>
        <h2 id={headingId} className={styles.sectionHeading}>
          {heading}
        </h2>
        <span className={styles.sectionCount}>{drafts.length}</span>
      </div>
      {drafts.length > 0 ? (
        <ul className={styles.list}>
          {drafts.map((draft) => (
            <VacancyListRow key={draft.id} draft={draft} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function primaryFactLine(draft: EmployerDraftListItem): string {
  const category = jobCategoryLabel(draft.jobCategory as JobCategoryCode);
  const locality = draft.publicLocality ?? "Locality not set";
  const employerContext =
    draft.employerType === "organisation"
      ? draft.companyName !== null
        ? `Organisation · ${draft.companyName}`
        : "Organisation"
      : "Private";
  return `${category} · ${locality} · ${employerContext}`;
}

function VacancyListRow({ draft }: { draft: EmployerDraftListItem }) {
  const showExpiry =
    draft.publicationState === "published" &&
    draft.isEffectivelyExpired === false;
  const expiresAt = showExpiry ? formatVacancyDate(draft.expiresAt) : null;
  const consequence = consequenceSentence(draft);
  const canEdit =
    draft.publicationState === "draft" || draft.publicationState === "paused";
  const canDelete = draft.publicationState === "draft";

  return (
    <li className={`${styles.listItem} ${styles.vacancyRow}`}>
      <div className={styles.rowMain}>
        <h3 className={styles.listTitle}>{draft.title}</h3>
        <p className={styles.factLine}>{primaryFactLine(draft)}</p>
        <p
          className={styles.lifecycleBadge}
          data-state={draft.publicationState}
        >
          {statusLabel(draft)}
        </p>
        {expiresAt !== null ? (
          <p className={styles.expiry}>Expires {expiresAt}</p>
        ) : null}
        {consequence !== null ? (
          <p className={styles.support}>{consequence}</p>
        ) : null}
        <p className={styles.nextHint}>Next: {nextActionHint(draft)}</p>
      </div>
      <div className={styles.rowActions}>
        <Link
          className={styles.linkButton}
          href={`/employer/vacancies/${draft.id}`}
          aria-label={`Manage ${draft.title}`}
        >
          Manage
        </Link>
        {canEdit ? (
          <Link
            className={styles.quietLink}
            href={`/employer/vacancies/${draft.id}/edit`}
            aria-label={`Edit ${draft.title}`}
          >
            Edit
          </Link>
        ) : null}
        {canDelete ? (
          <Link
            className={styles.quietLink}
            href={`/employer/vacancies/${draft.id}#delete-draft`}
            aria-label={`Delete ${draft.title}`}
          >
            Delete
          </Link>
        ) : null}
      </div>
    </li>
  );
}
