import Link from "next/link";
import { redirect } from "next/navigation";

import { statusLabel } from "@/components/employer-vacancies/vacancy-list";
import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import {
  EMPLOYER_EXPORT_BUTTON_LABEL,
  EMPLOYER_EXPORT_LEAD,
} from "@/lib/account-export/messages";
import { DELETE_ACCOUNT_HEADING } from "@/lib/account-deletion/messages";
import { loadUnseenApplicationsCount } from "@/lib/employer/applications/load-unseen-applications-count";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadEmployerProfile } from "@/lib/employer/load-employer";
import {
  EMPLOYER_ATTENTION_VACANCIES_HEADING,
  EMPLOYER_HOME_LEAD,
  EMPLOYER_VACANCIES_MINI_LIST_HEADING,
  EMPLOYER_VERIFICATION_NOTICE,
  unseenApplicationsHeading,
} from "@/lib/employer/messages";
import { resolveEmployerHomeView } from "@/lib/employer/resolve-employer-home";
import type { EmployerDraftListItem } from "@/lib/employer/vacancies/load-employer-drafts";
import { loadEmployerDrafts } from "@/lib/employer/vacancies/load-employer-drafts";
import { VACANCY_EMPTY_LIST } from "@/lib/employer/vacancies/messages";
import { selectAttentionVacancies } from "@/lib/employer/vacancies/select-attention-vacancies";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Plain-words reason for a draft_incomplete attention-card row, built only
 * from real readiness-checklist data (Founder Ruling #7 — no fabricated
 * missing-field names, no application counts).
 */
function draftIncompleteReason(
  draft: EmployerDraftListItem | undefined,
): string {
  const missingLabels =
    draft?.checklist
      .filter((item) => !item.complete)
      .map((item) => item.label) ?? [];
  return missingLabels.length > 0
    ? `missing ${missingLabels.join(", ")}`
    : "not yet ready to publish";
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
  const attentionVacancies = selectAttentionVacancies(drafts);

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={capabilities?.hasCandidateProfile === true}
        showEmployer={capabilities?.hasEmployerProfile === true}
        currentPath="home"
        unseenApplicationsCount={unseenApplicationsCount}
      />

      <h1 className={styles.heading}>Welcome, {view.displayName}</h1>
      <p className={styles.lead}>{EMPLOYER_HOME_LEAD}</p>

      <ul className={styles.meta}>
        <li>Employer type: {view.employerTypeLabel}</li>
        {view.companyName !== null ? (
          <li>Organisation company: {view.companyName}</li>
        ) : null}
        <li>Onboarding: complete</li>
        <li>Verification: {view.verificationState}</li>
      </ul>

      <p className={styles.actions}>
        <Link
          className={styles.button}
          href="/employer/vacancies"
          aria-label="View vacancies"
        >
          Vacancies
        </Link>
        <Link className={styles.linkButton} href="/employer/vacancies/new">
          Create draft
        </Link>
        <Link className={styles.linkButton} href="/employer/verification">
          Verification
        </Link>
      </p>

      {/* One attention slot: unseen applications beat readiness/verification
          when both are somehow true; nothing renders when neither applies
          (no fallback "all caught up" copy — none is specified). */}
      {unseenApplicationsCount > 0 ? (
        <p className={styles.warning} role="status">
          <Link href="/employer/applications">
            {unseenApplicationsHeading(unseenApplicationsCount)}
          </Link>
        </p>
      ) : view.verificationState !== "verified" ? (
        <p className={styles.warning}>{EMPLOYER_VERIFICATION_NOTICE}</p>
      ) : null}

      {attentionVacancies.length > 0 ? (
        <section
          className={styles.section}
          aria-labelledby="attention-vacancies-heading"
        >
          <h2
            id="attention-vacancies-heading"
            className={styles.sectionHeading}
          >
            {EMPLOYER_ATTENTION_VACANCIES_HEADING}
          </h2>
          <ul className={styles.list}>
            {attentionVacancies.map((item) => {
              const draft = drafts.find((d) => d.id === item.vacancyId);
              return (
                <li key={item.vacancyId} className={styles.listItem}>
                  <p className={styles.note}>
                    <Link href={`/employer/vacancies/${item.vacancyId}`}>
                      {item.title}
                    </Link>{" "}
                    is a draft, {draftIncompleteReason(draft)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className={styles.section} aria-labelledby="vacancies-heading">
        <h2 id="vacancies-heading" className={styles.sectionHeading}>
          {EMPLOYER_VACANCIES_MINI_LIST_HEADING}
        </h2>
        {drafts.length === 0 ? (
          <p className={styles.support} role="status">
            {VACANCY_EMPTY_LIST}
          </p>
        ) : (
          <ul className={styles.list}>
            {drafts.map((draft) => (
              <li key={draft.id} className={styles.listItem}>
                <h3 className={styles.listTitle}>{draft.title}</h3>
                <ul className={styles.meta}>
                  <li>Locality: {draft.publicLocality ?? "Not set"}</li>
                  <li>Status: {statusLabel(draft)}</li>
                </ul>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.actions}>
          <Link className={styles.linkButton} href="/employer/vacancies">
            All vacancies
          </Link>
        </p>
      </section>

      <h2 className={styles.heading}>Account data</h2>
      <p className={styles.note}>{EMPLOYER_EXPORT_LEAD}</p>
      <p className={styles.actions}>
        {/* Plain anchor, not next/link: this is a real file download from a
            Route Handler, not a client-side page transition. The server's
            Content-Disposition header is the authoritative download
            mechanism, not this element. */}
        <a className={styles.linkButton} href="/employer/account/export">
          {EMPLOYER_EXPORT_BUTTON_LABEL}
        </a>
        <Link className={styles.linkButton} href="/employer/account/delete">
          {DELETE_ACCOUNT_HEADING}
        </Link>
      </p>
    </main>
  );
}
