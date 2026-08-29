import Link from "next/link";
import { redirect } from "next/navigation";

import {
  draftConsequence,
  statusLabel,
} from "@/components/employer-vacancies/vacancy-list";
import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import styles from "@/app/employer/employer-home.module.scss";
import {
  EMPLOYER_EXPORT_BUTTON_LABEL,
  EMPLOYER_EXPORT_LEAD,
} from "@/lib/account-export/messages";
import { DELETE_ACCOUNT_HEADING } from "@/lib/account-deletion/messages";
import { loadUnseenApplicationsCount } from "@/lib/employer/applications/load-unseen-applications-count";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadEmployerProfile } from "@/lib/employer/load-employer";
import {
  EMPLOYER_HOME_LEAD,
  EMPLOYER_VACANCIES_MINI_LIST_HEADING,
  EMPLOYER_VERIFICATION_NOTICE,
  unseenApplicationsHeading,
} from "@/lib/employer/messages";
import { resolveEmployerHomeView } from "@/lib/employer/resolve-employer-home";
import type { EmployerDraftListItem } from "@/lib/employer/vacancies/load-employer-drafts";
import { loadEmployerDrafts } from "@/lib/employer/vacancies/load-employer-drafts";
import { VACANCY_EMPTY_LIST } from "@/lib/employer/vacancies/messages";
import { jobCategoryLabel } from "@/lib/matching/labels";
import type { JobCategoryCode } from "@/lib/onboarding/allow-lists";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function formatDate(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(date);
}

function vacancyHomeConsequence(draft: EmployerDraftListItem): string | null {
  switch (draft.publicationState) {
    case "draft":
      return draftConsequence(draft);
    case "paused":
      return "Not visible to candidates. Existing applications stay open.";
    case "filled": {
      const date = formatDate(draft.filledAt);
      return date === null
        ? "Marked filled. No further action is available."
        : `Marked filled on ${date}.`;
    }
    case "expired": {
      const date = formatDate(draft.expiredAt ?? draft.expiresAt);
      return date === null
        ? "Ran out without being filled."
        : `Ran out on ${date}.`;
    }
    case "withdrawn":
      return "Not visible to candidates. Existing applications are preserved.";
    case "published":
      return null;
  }
}

function EmployerHomeVacancyRow({ draft }: { draft: EmployerDraftListItem }) {
  const expiry =
    draft.publicationState === "published" &&
    draft.isEffectivelyExpired === false
      ? formatDate(draft.expiresAt)
      : null;
  const consequence = vacancyHomeConsequence(draft);
  const actionHref =
    draft.publicationState === "draft"
      ? `/employer/vacancies/${draft.id}/edit`
      : `/employer/vacancies/${draft.id}`;
  const actionLabel =
    draft.publicationState === "draft" ? "Continue draft" : "Manage";

  return (
    <li className={styles.vacancyRow}>
      <div className={styles.vacancySummary}>
        <h3 className={styles.vacancyTitle}>{draft.title}</h3>
        <p className={styles.vacancyMeta}>
          {draft.publicLocality ?? "Locality not set"} ·{" "}
          {jobCategoryLabel(draft.jobCategory as JobCategoryCode)}
        </p>
        {consequence !== null ? (
          <p className={styles.vacancyConsequence}>{consequence}</p>
        ) : null}
      </div>
      <div className={styles.vacancyState}>
        <span
          className={styles.lifecycleBadge}
          data-state={draft.publicationState}
        >
          {statusLabel(draft)}
        </span>
        {expiry !== null ? (
          <p className={styles.expiry}>Expires {expiry}</p>
        ) : null}
        <Link className={styles.secondaryButton} href={actionHref}>
          {actionLabel}
        </Link>
      </div>
    </li>
  );
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Employer · Klinnova",
};

export default async function EmployerHomePage() {
  const supabase = await createServerSupabaseClient();
  const loaded = await loadEmployerProfile(supabase);

  if (!loaded.ok) {
    if (loaded.reason === "unauthenticated") {
      redirect("/login?next=/employer");
    }
    redirect("/auth/error?reason=profile");
  }

  const view = resolveEmployerHomeView({
    hasProfile: loaded.data !== null,
    onboardingCompleted: loaded.data?.onboardingCompletedAt !== null,
    displayName: loaded.data?.displayName ?? null,
    employerType: loaded.data?.employerType ?? null,
    companyName: loaded.data?.company?.name ?? null,
    verificationState: loaded.data?.verificationState ?? null,
  });

  if (view.kind === "redirect") {
    redirect(view.href);
  }

  const capabilities = await loadAccountCapabilities(supabase);
  const unseenApplicationsCount = await loadUnseenApplicationsCount(supabase);

  // Founder Ruling #7: loadEmployerDrafts already exists and already runs
  // on /employer/vacancies with zero modification — calling it from this
  // page is not the new aggregate-COUNT query the ruling restricts. Falls
  // back to an empty list rather than failing the page if the load errors;
  // this page's own auth/completion gates already ran above.
  const draftsResult = await loadEmployerDrafts(supabase);
  const drafts = draftsResult.ok ? draftsResult.drafts : [];

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={capabilities?.hasCandidateProfile === true}
        showEmployer={capabilities?.hasEmployerProfile === true}
        currentPath="home"
        unseenApplicationsCount={unseenApplicationsCount}
      />

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1 className={styles.heading}>Welcome, {view.displayName}</h1>
          <p className={styles.lead}>{EMPLOYER_HOME_LEAD}</p>
        </div>
        {view.verificationState === "verified" ? (
          <span className={styles.verifiedBadge}>Verified</span>
        ) : null}
      </header>

      {/* One attention slot: unseen applications beat readiness/verification
          when both are somehow true; nothing renders when neither applies
          (no fallback "all caught up" copy — none is specified). */}
      {unseenApplicationsCount > 0 ? (
        <section
          className={styles.attentionCard}
          aria-labelledby="employer-attention-heading"
          role="status"
        >
          <div>
            <h2 id="employer-attention-heading" className={styles.cardHeading}>
              Needs your attention
            </h2>
            <p className={styles.cardCopy}>
              {unseenApplicationsHeading(unseenApplicationsCount)}
            </p>
          </div>
          <Link className={styles.primaryButton} href="/employer/applications">
            Review applications
          </Link>
        </section>
      ) : view.verificationState !== "verified" ? (
        <section
          className={styles.attentionCard}
          aria-labelledby="employer-verification-heading"
        >
          <div>
            <h2
              id="employer-verification-heading"
              className={styles.cardHeading}
            >
              Verification needed
            </h2>
            <p className={styles.cardCopy}>{EMPLOYER_VERIFICATION_NOTICE}</p>
          </div>
          <Link
            className={styles.secondaryButton}
            href="/employer/verification"
          >
            Verification
          </Link>
        </section>
      ) : null}

      <section className={styles.section} aria-labelledby="vacancies-heading">
        <div className={styles.sectionHeader}>
          <h2 id="vacancies-heading" className={styles.sectionHeading}>
            {EMPLOYER_VACANCIES_MINI_LIST_HEADING}
          </h2>
          <div className={styles.sectionActions}>
            <Link
              className={styles.primaryButton}
              href="/employer/vacancies/new"
            >
              Create draft
            </Link>
          </div>
        </div>
        {drafts.length === 0 ? (
          <p className={styles.emptyState} role="status">
            {VACANCY_EMPTY_LIST}
          </p>
        ) : (
          <ul className={styles.vacancyList}>
            {drafts.map((draft) => (
              <EmployerHomeVacancyRow key={draft.id} draft={draft} />
            ))}
          </ul>
        )}
        <p className={styles.inlineActions}>
          <Link className={styles.textLink} href="/employer/vacancies">
            All vacancies
          </Link>
        </p>
      </section>

      <section
        className={styles.accountSection}
        aria-labelledby="account-data-heading"
      >
        <div>
          <h2 id="account-data-heading" className={styles.sectionHeading}>
            Account data
          </h2>
          <p className={styles.note}>{EMPLOYER_EXPORT_LEAD}</p>
        </div>
        <div className={styles.accountActions}>
          {/* Plain anchor, not next/link: this is a real file download from a
              Route Handler, not a client-side page transition. The server's
              Content-Disposition header is the authoritative download
              mechanism, not this element. */}
          <a className={styles.textLink} href="/employer/account/export">
            {EMPLOYER_EXPORT_BUTTON_LABEL}
          </a>
          <Link className={styles.textLink} href="/employer/account/delete">
            {DELETE_ACCOUNT_HEADING}
          </Link>
        </div>
      </section>
    </main>
  );
}
