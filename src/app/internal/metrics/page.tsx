import { redirect } from "next/navigation";

import { InternalUnavailable } from "@/components/internal-verification/internal-unavailable";
import styles from "@/components/internal-verification/internal-verification.module.scss";
import { loadM5FounderMetrics } from "@/lib/internal/metrics/load-metrics";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "M5 metrics · Klinnova",
};

const TARGETS = {
  participating_employers: 20,
  verified_vacancies: 100,
  completed_candidates: 200,
  completed_interview_conversions: 10,
  confirmed_hires: 3,
} as const;

function formatPercent(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

export default async function InternalMetricsPage() {
  const supabase = await createServerSupabaseClient();
  const loaded = await loadM5FounderMetrics(supabase);

  if (!loaded.ok) {
    if (loaded.reason === "unauthenticated") {
      redirect("/login?next=/internal/metrics");
    }
    return <InternalUnavailable />;
  }

  const { metrics } = loaded;
  const coreMetrics = [
    [
      "Participating employers",
      metrics.core.participating_employers,
      TARGETS.participating_employers,
    ],
    [
      "Verified vacancies",
      metrics.core.verified_vacancies,
      TARGETS.verified_vacancies,
    ],
    [
      "Candidates",
      metrics.core.completed_candidates,
      TARGETS.completed_candidates,
    ],
    ["Submitted applications", metrics.core.submitted_applications, null],
    [
      "Completed interviews",
      metrics.core.completed_interview_conversions,
      TARGETS.completed_interview_conversions,
    ],
    ["Confirmed hires", metrics.core.confirmed_hires, TARGETS.confirmed_hires],
  ] as const;

  return (
    <main className={styles.page}>
      <div>
        <h1 className={styles.heading}>M5 — Berlin private beta</h1>
        <p className={styles.lead}>
          Aggregate operating metrics from the authoritative product database.
        </p>
      </div>

      <section aria-labelledby="m5-core-heading">
        <h2 className={styles.sectionHeading} id="m5-core-heading">
          Cumulative M5 metrics
        </h2>
        <div className={styles.metricsGrid}>
          {coreMetrics.map(([label, value, target]) => (
            <article className={styles.metricCard} key={label}>
              <p className={styles.metricLabel}>{label}</p>
              <p className={styles.metricValue}>
                {value}
                {target === null ? "" : ` / ${target}`}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="m5-supply-heading">
        <h2 className={styles.sectionHeading} id="m5-supply-heading">
          Current supply
        </h2>
        <dl className={styles.metricList}>
          <div>
            <dt>Active/safe participating employers</dt>
            <dd>
              {metrics.current_supply.active_safe_participating_employers}
            </dd>
          </div>
          <div>
            <dt>Effective-public vacancies</dt>
            <dd>{metrics.current_supply.effective_public_vacancies}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="m5-diagnostic-heading">
        <h2 className={styles.sectionHeading} id="m5-diagnostic-heading">
          Diagnostic
        </h2>
        <dl className={styles.metricList}>
          <div>
            <dt>Raw Candidate registrations</dt>
            <dd>{metrics.diagnostic.raw_candidate_registrations}</dd>
          </div>
          <div>
            <dt>Applications under review</dt>
            <dd>{metrics.diagnostic.applications_reviewing}</dd>
          </div>
          <div>
            <dt>Shortlisted applications</dt>
            <dd>{metrics.diagnostic.applications_shortlisted}</dd>
          </div>
          <div>
            <dt>Completed interview rounds</dt>
            <dd>{metrics.diagnostic.completed_interview_rounds}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="m5-conversions-heading">
        <h2 className={styles.sectionHeading} id="m5-conversions-heading">
          Conversions
        </h2>
        <dl className={styles.metricList}>
          <div>
            <dt>Completed Candidates → application</dt>
            <dd>
              {formatPercent(
                metrics.conversions.candidate_to_application_percent,
              )}
            </dd>
          </div>
          <div>
            <dt>Applications → completed interview</dt>
            <dd>
              {formatPercent(
                metrics.conversions.application_to_interview_percent,
              )}
            </dd>
          </div>
          <div>
            <dt>Completed interviews → hire</dt>
            <dd>
              {formatPercent(metrics.conversions.interview_to_hire_percent)}
            </dd>
          </div>
        </dl>
      </section>

      <p className={styles.metricsTimestamp}>
        M5 began{" "}
        <time dateTime={metrics.m5_started_at}>8 August 2026, 23:35 UTC</time>.
        Measured{" "}
        <time dateTime={metrics.measured_at}>
          {new Date(metrics.measured_at).toISOString()}
        </time>
        .
      </p>
    </main>
  );
}
