import { describe, expect, it } from "vitest";

import {
  buildPilotFunnelReport,
  type PilotFunnelDomain,
  type SqlRowExecutor,
} from "@/lib/proof/pilot-funnel";

function metric(domain: PilotFunnelDomain, key: string) {
  const found = domain[key];
  if (found === undefined) {
    throw new Error(`test double: missing expected metric key "${key}"`);
  }
  return found;
}

const MEASURED_AT = "2026-08-08T00:00:00.000Z";

const ZERO_ROWS: Record<string, Record<string, unknown>> = {
  candidate: {
    measured_at: MEASURED_AT,
    candidates_registered: 0,
    candidates_onboarding_completed: 0,
  },
  employer: {
    employers_registered: 0,
    employers_onboarding_completed: 0,
    employers_verification_pending: 0,
    employers_verified: 0,
  },
  vacancy: {
    vacancies_created: 0,
    vacancies_ever_published: 0,
    vacancies_effective_public: 0,
  },
  vacancy_with_application: { vacancies_with_application: 0 },
  application: {
    applications_submitted: 0,
    applications_status_submitted: 0,
    applications_status_reviewing: 0,
    applications_status_shortlisted: 0,
    applications_status_accepted: 0,
    applications_status_rejected: 0,
  },
};

function queryLabel(sql: string): keyof typeof ZERO_ROWS {
  if (sql.includes("from public.candidate_profiles")) return "candidate";
  if (sql.includes("from public.employer_profiles")) return "employer";
  if (sql.includes("join public.applications"))
    return "vacancy_with_application";
  if (sql.includes("from public.vacancies")) return "vacancy";
  if (sql.includes("from public.applications")) return "application";
  throw new Error(`unrecognised query in test double: ${sql}`);
}

function rowFor(label: keyof typeof ZERO_ROWS): Record<string, unknown> {
  const row = ZERO_ROWS[label];
  if (row === undefined) {
    throw new Error(`test double: no fixture row for "${label}"`);
  }
  return row;
}

function zeroStateExecutor(): SqlRowExecutor {
  return async (sql) => [rowFor(queryLabel(sql))];
}

function pgStyleExecutor(
  overrides: Partial<Record<keyof typeof ZERO_ROWS, Record<string, unknown>>>,
): SqlRowExecutor {
  return async (sql) => {
    const label = queryLabel(sql);
    const row = overrides[label] ?? rowFor(label);
    // node-postgres returns bigint aggregate columns as strings and
    // timestamptz columns as Date instances; measured_at is left alone so
    // individual tests can supply either shape.
    const stringified = Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        key === "measured_at" ? value : String(value),
      ]),
    );
    return [stringified];
  };
}

describe("buildPilotFunnelReport", () => {
  it("returns every documented metric key across all four domains for an all-zero database", async () => {
    const report = await buildPilotFunnelReport(zeroStateExecutor());

    expect(report.source).toBe("local-supabase");
    expect(report.measuredAt).toBe(MEASURED_AT);

    expect(Object.keys(report.funnels.candidate)).toEqual([
      "candidates_registered",
      "candidates_onboarding_completed",
    ]);
    expect(Object.keys(report.funnels.employer)).toEqual([
      "employers_registered",
      "employers_onboarding_completed",
      "employers_verification_pending",
      "employers_verified",
    ]);
    expect(Object.keys(report.funnels.vacancy)).toEqual([
      "vacancies_created",
      "vacancies_ever_published",
      "vacancies_effective_public",
      "vacancies_with_application",
    ]);
    expect(Object.keys(report.funnels.application)).toEqual([
      "applications_submitted",
      "applications_status_submitted",
      "applications_status_reviewing",
      "applications_status_shortlisted",
      "applications_status_accepted",
      "applications_status_rejected",
    ]);

    for (const domain of Object.values(report.funnels)) {
      for (const domainMetric of Object.values(domain)) {
        expect(domainMetric.count).toBe(0);
        expect(typeof domainMetric.definition).toBe("string");
        expect(domainMetric.definition.length).toBeGreaterThan(0);
      }
    }
  });

  it("parses node-postgres string-typed bigint aggregate columns into numbers", async () => {
    const report = await buildPilotFunnelReport(
      pgStyleExecutor({
        candidate: {
          measured_at: MEASURED_AT,
          candidates_registered: 5,
          candidates_onboarding_completed: 3,
        },
      }),
    );

    expect(metric(report.funnels.candidate, "candidates_registered")).toEqual({
      count: 5,
      definition: expect.any(String),
    });
    expect(
      metric(report.funnels.candidate, "candidates_onboarding_completed").count,
    ).toBe(3);
  });

  it("maps non-zero application status counts to their exact current-state keys", async () => {
    const report = await buildPilotFunnelReport(
      pgStyleExecutor({
        application: {
          applications_submitted: 10,
          applications_status_submitted: 4,
          applications_status_reviewing: 2,
          applications_status_shortlisted: 1,
          applications_status_accepted: 2,
          applications_status_rejected: 1,
        },
      }),
    );

    expect(
      metric(report.funnels.application, "applications_submitted").count,
    ).toBe(10);
    expect(
      metric(report.funnels.application, "applications_status_reviewing").count,
    ).toBe(2);
    expect(
      metric(report.funnels.application, "applications_status_accepted").count,
    ).toBe(2);
  });

  it("throws a descriptive error rather than returning a falsified count for a malformed row", async () => {
    const executor: SqlRowExecutor = async (sql) => {
      if (sql.includes("from public.candidate_profiles")) {
        return [
          { measured_at: MEASURED_AT, candidates_registered: "not-a-number" },
        ];
      }
      return [rowFor(queryLabel(sql))];
    };

    await expect(buildPilotFunnelReport(executor)).rejects.toThrow(
      /malformed count/i,
    );
  });

  it("throws rather than silently defaulting when a query returns no row at all", async () => {
    const executor: SqlRowExecutor = async () => [];

    await expect(buildPilotFunnelReport(executor)).rejects.toThrow(
      /returned no row/i,
    );
  });

  it("issues exactly five queries — no per-row or N+1 pattern", async () => {
    let calls = 0;
    const executor: SqlRowExecutor = async (sql) => {
      calls += 1;
      return [rowFor(queryLabel(sql))];
    };

    await buildPilotFunnelReport(executor);

    expect(calls).toBe(5);
  });

  it("scopes vacancy-side queries to source = 'employer', excluding seed/demo fixtures", async () => {
    const seenQueries: string[] = [];
    const executor: SqlRowExecutor = async (sql) => {
      seenQueries.push(sql);
      return [rowFor(queryLabel(sql))];
    };

    await buildPilotFunnelReport(executor);

    const vacancyQueries = seenQueries.filter((sql) =>
      sql.includes("public.vacancies"),
    );
    expect(vacancyQueries.length).toBeGreaterThan(0);
    for (const sql of vacancyQueries) {
      expect(sql).toMatch(/source = 'employer'/);
    }
  });

  it("never emits a PII field name in any metric definition", async () => {
    const report = await buildPilotFunnelReport(zeroStateExecutor());
    const text = JSON.stringify(report);

    expect(text).not.toMatch(
      /email|phone|display_name|company_name|candidate_snapshot|actor_user_id/i,
    );
  });

  it("reports exactly 16 metrics across all four domains", async () => {
    const report = await buildPilotFunnelReport(zeroStateExecutor());
    const total = Object.values(report.funnels).reduce(
      (sum, domain) => sum + Object.keys(domain).length,
      0,
    );

    expect(total).toBe(16);
  });

  describe("vacancies_ever_published metric semantics", () => {
    it("uses the exact key vacancies_ever_published, not vacancies_published", async () => {
      const report = await buildPilotFunnelReport(zeroStateExecutor());

      expect(report.funnels.vacancy).toHaveProperty("vacancies_ever_published");
      expect(report.funnels.vacancy).not.toHaveProperty("vacancies_published");
    });

    it("defines the metric as a historical milestone, not current publication state", async () => {
      const report = await buildPilotFunnelReport(zeroStateExecutor());
      const definition = metric(
        report.funnels.vacancy,
        "vacancies_ever_published",
      ).definition;

      expect(definition).toMatch(/published at least once/i);
      expect(definition).toMatch(/published_at IS NOT NULL/i);
      expect(definition).toMatch(/paused, filled, expired, or withdrawn/i);
    });

    it("leaves vacancies_effective_public untouched by the rename", async () => {
      const report = await buildPilotFunnelReport(zeroStateExecutor());

      expect(report.funnels.vacancy).toHaveProperty(
        "vacancies_effective_public",
      );
      expect(
        metric(report.funnels.vacancy, "vacancies_effective_public").definition,
      ).toMatch(/is_vacancy_effectively_public/);
    });
  });

  describe("measurement timestamp", () => {
    it("takes measuredAt from the database's transaction_timestamp() output, not a JS clock read", async () => {
      const report = await buildPilotFunnelReport(zeroStateExecutor());

      expect(report.measuredAt).toBe(MEASURED_AT);
    });

    it("normalises a native Date (node-postgres's default timestamptz parsing) into an ISO string", async () => {
      const asDate = new Date("2026-08-08T12:34:56.000Z");
      const report = await buildPilotFunnelReport(
        pgStyleExecutor({
          candidate: {
            measured_at: asDate,
            candidates_registered: 0,
            candidates_onboarding_completed: 0,
          },
        }),
      );

      expect(report.measuredAt).toBe("2026-08-08T12:34:56.000Z");
    });

    it("throws for a malformed measured_at value instead of falling back to Date.now()", async () => {
      const executor: SqlRowExecutor = async (sql) => {
        if (sql.includes("from public.candidate_profiles")) {
          return [
            {
              measured_at: "not-a-timestamp",
              candidates_registered: 0,
              candidates_onboarding_completed: 0,
            },
          ];
        }
        return [rowFor(queryLabel(sql))];
      };

      await expect(buildPilotFunnelReport(executor)).rejects.toThrow(
        /malformed timestamp/i,
      );
    });

    it("evaluates the effective-public predicate with transaction_timestamp(), never now() or a JS timestamp", async () => {
      const seenQueries: string[] = [];
      const executor: SqlRowExecutor = async (sql) => {
        seenQueries.push(sql);
        return [rowFor(queryLabel(sql))];
      };

      await buildPilotFunnelReport(executor);

      const vacancyQuery = seenQueries.find((sql) =>
        sql.includes("is_vacancy_effectively_public"),
      );
      expect(vacancyQuery).toBeDefined();
      expect(vacancyQuery).toMatch(
        /is_vacancy_effectively_public\(\s*id,\s*transaction_timestamp\(\)\s*\)/,
      );
      expect(vacancyQuery).not.toMatch(
        /is_vacancy_effectively_public\([^)]*now\(\)/,
      );
    });
  });
});
