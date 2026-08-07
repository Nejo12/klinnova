/**
 * Deterministic, read-only pilot-funnel measurement (D-075). Every metric
 * below is a `count(*)`/`count(*) filter (...)` read against existing
 * tables and the existing canonical `is_vacancy_effectively_public(...)`
 * predicate — never a re-implementation of that predicate, never a
 * mutation, never a third-party analytics call.
 *
 * Snapshot consistency: the caller (the CLI script) is expected to run
 * every query issued through `run` inside one Postgres `REPEATABLE READ
 * READ ONLY` transaction (`withLocalPostgresReadOnlyTransaction`), so all
 * five queries below observe the identical database snapshot rather than
 * five independently-observed states. `transaction_timestamp()` is stable
 * for the lifetime of that transaction — the candidate query captures it
 * once as `measured_at`, and the vacancy query's `is_vacancy_effectively_public`
 * call reuses `transaction_timestamp()` directly rather than `now()`, so
 * both resolve to the exact same instant without threading a parameter
 * between queries.
 *
 * Query strategy: one aggregate query per funnel domain (candidate,
 * employer, application), each returning every metric in that domain via
 * `count(*) filter (where ...)` in a single row — not one query per
 * metric, and never per-row/N+1. The vacancy domain uses two queries: the
 * per-vacancy-row aggregate, plus one join+distinct query for
 * "vacancies with at least one application" (a relationship that cannot be
 * expressed as a single-table filter). Five queries total.
 *
 * `vacancies`/`applications` join queries are scoped to
 * `vacancies.source = 'employer'` for the vacancy-side metrics — seed/demo
 * fixture vacancies are fixed platform content, not pilot growth, and
 * counting them would make "vacancies ever published" a constant offset
 * unrelated to real employer activity. Application-side metrics are NOT
 * source-filtered: every row in `applications` is a real candidate
 * submission through the one authoritative `submit_candidate_application`
 * path, regardless of which vacancy it targeted.
 */

export type SqlRowExecutor = (
  sql: string,
) => Promise<Record<string, unknown>[]>;

export type PilotFunnelMetric = {
  count: number;
  definition: string;
};

export type PilotFunnelDomain = Record<string, PilotFunnelMetric>;

export type PilotFunnelReport = {
  /** Transaction-stable database snapshot instant, not a JS-side clock read. */
  measuredAt: string;
  source: "local-supabase";
  funnels: {
    candidate: PilotFunnelDomain;
    employer: PilotFunnelDomain;
    vacancy: PilotFunnelDomain;
    application: PilotFunnelDomain;
  };
};

function toCount(value: unknown, label: string): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number(value);
  }
  throw new Error(
    `Pilot funnel: malformed count for "${label}": ${JSON.stringify(value)}`,
  );
}

/**
 * `transaction_timestamp()` comes back through node-postgres as a native
 * `Date` (its default `timestamptz` type parser) when run against a real
 * connection, but as a plain ISO string from a test double — both are
 * accepted and normalised to one ISO string.
 */
function toIsoTimestamp(value: unknown, label: string): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  throw new Error(
    `Pilot funnel: malformed timestamp for "${label}": ${JSON.stringify(value)}`,
  );
}

async function queryRow(
  run: SqlRowExecutor,
  sql: string,
  label: string,
): Promise<Record<string, unknown>> {
  const rows = await run(sql);
  const row = rows[0];
  if (row === undefined) {
    throw new Error(`Pilot funnel: "${label}" query returned no row.`);
  }
  return row;
}

const CANDIDATE_QUERY = `
  select
    transaction_timestamp() as measured_at,
    count(*) as candidates_registered,
    count(*) filter (where onboarding_completed_at is not null)
      as candidates_onboarding_completed
  from public.candidate_profiles
`;

async function buildCandidateFunnel(
  run: SqlRowExecutor,
): Promise<{ domain: PilotFunnelDomain; measuredAt: string }> {
  const row = await queryRow(run, CANDIDATE_QUERY, "candidate");
  return {
    measuredAt: toIsoTimestamp(row.measured_at, "measured_at"),
    domain: {
      candidates_registered: {
        count: toCount(row.candidates_registered, "candidates_registered"),
        definition: "candidate_profiles rows — one per registered candidate.",
      },
      candidates_onboarding_completed: {
        count: toCount(
          row.candidates_onboarding_completed,
          "candidates_onboarding_completed",
        ),
        definition: "candidate_profiles.onboarding_completed_at is not null.",
      },
    },
  };
}

const EMPLOYER_QUERY = `
  select
    count(*) as employers_registered,
    count(*) filter (where onboarding_completed_at is not null)
      as employers_onboarding_completed,
    count(*) filter (where verification_state = 'pending')
      as employers_verification_pending,
    count(*) filter (where verification_state = 'verified')
      as employers_verified
  from public.employer_profiles
`;

async function buildEmployerFunnel(
  run: SqlRowExecutor,
): Promise<PilotFunnelDomain> {
  const row = await queryRow(run, EMPLOYER_QUERY, "employer");
  return {
    employers_registered: {
      count: toCount(row.employers_registered, "employers_registered"),
      definition: "employer_profiles rows — one per registered employer.",
    },
    employers_onboarding_completed: {
      count: toCount(
        row.employers_onboarding_completed,
        "employers_onboarding_completed",
      ),
      definition: "employer_profiles.onboarding_completed_at is not null.",
    },
    employers_verification_pending: {
      count: toCount(
        row.employers_verification_pending,
        "employers_verification_pending",
      ),
      definition: "employer_profiles.verification_state = 'pending'.",
    },
    employers_verified: {
      count: toCount(row.employers_verified, "employers_verified"),
      definition: "employer_profiles.verification_state = 'verified'.",
    },
  };
}

const VACANCY_QUERY = `
  select
    count(*) as vacancies_created,
    count(*) filter (where published_at is not null) as vacancies_ever_published,
    count(*) filter (
      where public.is_vacancy_effectively_public(id, transaction_timestamp())
    ) as vacancies_effective_public
  from public.vacancies
  where source = 'employer'
`;

const VACANCY_WITH_APPLICATION_QUERY = `
  select count(distinct v.id) as vacancies_with_application
  from public.vacancies v
  join public.applications a on a.vacancy_id = v.id
  where v.source = 'employer'
`;

async function buildVacancyFunnel(
  run: SqlRowExecutor,
): Promise<PilotFunnelDomain> {
  const row = await queryRow(run, VACANCY_QUERY, "vacancy");
  const withApplicationRow = await queryRow(
    run,
    VACANCY_WITH_APPLICATION_QUERY,
    "vacancy_with_application",
  );
  return {
    vacancies_created: {
      count: toCount(row.vacancies_created, "vacancies_created"),
      definition:
        "vacancies rows with source = 'employer' (excludes seed/demo fixtures).",
    },
    vacancies_ever_published: {
      count: toCount(row.vacancies_ever_published, "vacancies_ever_published"),
      definition:
        "Employer-sourced vacancies that have been published at least once (published_at IS NOT NULL), regardless of current publication state — a vacancy counted here may currently be paused, filled, expired, or withdrawn.",
    },
    vacancies_effective_public: {
      count: toCount(
        row.vacancies_effective_public,
        "vacancies_effective_public",
      ),
      definition:
        "employer-sourced vacancies where is_vacancy_effectively_public(id, transaction_timestamp()) is true — the canonical predicate, evaluated at the report's own measurement instant, honouring verification, expiry, suspension, and moderation state.",
    },
    vacancies_with_application: {
      count: toCount(
        withApplicationRow.vacancies_with_application,
        "vacancies_with_application",
      ),
      definition:
        "distinct employer-sourced vacancies with at least one row in applications.",
    },
  };
}

const APPLICATION_QUERY = `
  select
    count(*) as applications_submitted,
    count(*) filter (where status = 'submitted') as applications_status_submitted,
    count(*) filter (where status = 'reviewing') as applications_status_reviewing,
    count(*) filter (where status = 'shortlisted') as applications_status_shortlisted,
    count(*) filter (where status = 'accepted') as applications_status_accepted,
    count(*) filter (where status = 'rejected') as applications_status_rejected
  from public.applications
`;

async function buildApplicationFunnel(
  run: SqlRowExecutor,
): Promise<PilotFunnelDomain> {
  const row = await queryRow(run, APPLICATION_QUERY, "application");
  return {
    applications_submitted: {
      count: toCount(row.applications_submitted, "applications_submitted"),
      definition:
        "applications rows — one per candidate submission (any vacancy).",
    },
    applications_status_submitted: {
      count: toCount(
        row.applications_status_submitted,
        "applications_status_submitted",
      ),
      definition: "applications.status = 'submitted' (current state).",
    },
    applications_status_reviewing: {
      count: toCount(
        row.applications_status_reviewing,
        "applications_status_reviewing",
      ),
      definition: "applications.status = 'reviewing' (current state).",
    },
    applications_status_shortlisted: {
      count: toCount(
        row.applications_status_shortlisted,
        "applications_status_shortlisted",
      ),
      definition: "applications.status = 'shortlisted' (current state).",
    },
    applications_status_accepted: {
      count: toCount(
        row.applications_status_accepted,
        "applications_status_accepted",
      ),
      definition: "applications.status = 'accepted' (current state).",
    },
    applications_status_rejected: {
      count: toCount(
        row.applications_status_rejected,
        "applications_status_rejected",
      ),
      definition: "applications.status = 'rejected' (current state).",
    },
  };
}

export async function buildPilotFunnelReport(
  run: SqlRowExecutor,
): Promise<PilotFunnelReport> {
  const { domain: candidate, measuredAt } = await buildCandidateFunnel(run);
  const employer = await buildEmployerFunnel(run);
  const vacancy = await buildVacancyFunnel(run);
  const application = await buildApplicationFunnel(run);

  return {
    measuredAt,
    source: "local-supabase",
    funnels: { candidate, employer, vacancy, application },
  };
}
