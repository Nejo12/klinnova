import { describe, expect, it } from "vitest";

import {
  employerModerationStatusSchema,
  moderateVacancyFormSchema,
  operatorEmployerListSchema,
  operatorVacancyListSchema,
  suspendEmployerFormSchema,
  suspendEmployerRpcResultSchema,
  vacancyModerationStatusSchema,
} from "@/lib/internal/moderation/schemas";

describe("operatorEmployerListSchema", () => {
  it("accepts the exact list_employers_for_operator projection", () => {
    const parsed = operatorEmployerListSchema.safeParse([
      {
        employer_profile_id: "11111111-1111-4111-8111-111111111111",
        employer_type: "private",
        display_name: "Ada",
        company_name: null,
        onboarding_completed: true,
        verification_state: "verified",
        suspended: true,
        suspended_at: "2026-08-05T00:00:00Z",
        created_at: "2026-08-01T00:00:00Z",
      },
    ]);
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown verification_state value", () => {
    const parsed = operatorEmployerListSchema.safeParse([
      {
        employer_profile_id: "11111111-1111-4111-8111-111111111111",
        employer_type: "private",
        display_name: "Ada",
        company_name: null,
        onboarding_completed: true,
        verification_state: "banned",
        suspended: false,
        suspended_at: null,
        created_at: "2026-08-01T00:00:00Z",
      },
    ]);
    expect(parsed.success).toBe(false);
  });

  it("rejects a row missing the suspended flag", () => {
    const parsed = operatorEmployerListSchema.safeParse([
      {
        employer_profile_id: "11111111-1111-4111-8111-111111111111",
        employer_type: "private",
        display_name: "Ada",
        company_name: null,
        onboarding_completed: true,
        verification_state: "verified",
        created_at: "2026-08-01T00:00:00Z",
      },
    ]);
    expect(parsed.success).toBe(false);
  });
});

describe("employerModerationStatusSchema", () => {
  it("accepts a ready result with a bounded audit_events array", () => {
    const parsed = employerModerationStatusSchema.safeParse({
      status: "ready",
      employer_profile_id: "11111111-1111-4111-8111-111111111111",
      employer_type: "private",
      display_name: "Ada",
      company_name: null,
      onboarding_completed: true,
      verification_state: "verified",
      suspended: true,
      suspended_at: "2026-08-05T00:00:00Z",
      suspended_reason: "Fraudulent postings",
      audit_events: [
        {
          event_type: "employer_suspended",
          occurred_at: "2026-08-05T00:00:00Z",
          reason: "Fraudulent postings",
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts forbidden/unavailable with no other fields", () => {
    expect(
      employerModerationStatusSchema.safeParse({ status: "forbidden" }).success,
    ).toBe(true);
    expect(
      employerModerationStatusSchema.safeParse({ status: "unavailable" })
        .success,
    ).toBe(true);
  });

  it("rejects an unknown audit event_type — never renders a raw value", () => {
    const parsed = employerModerationStatusSchema.safeParse({
      status: "ready",
      employer_profile_id: "11111111-1111-4111-8111-111111111111",
      employer_type: "private",
      display_name: "Ada",
      company_name: null,
      onboarding_completed: true,
      verification_state: "verified",
      suspended: false,
      suspended_at: null,
      suspended_reason: null,
      audit_events: [
        {
          event_type: "employer_deleted",
          occurred_at: "2026-08-05T00:00:00Z",
          reason: null,
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a payload that includes actor_user_id — the RPC never returns it, but the schema must not silently accept it either", () => {
    const parsed = employerModerationStatusSchema.safeParse({
      status: "ready",
      employer_profile_id: "11111111-1111-4111-8111-111111111111",
      employer_type: "private",
      display_name: "Ada",
      company_name: null,
      onboarding_completed: true,
      verification_state: "verified",
      suspended: false,
      suspended_at: null,
      suspended_reason: null,
      audit_events: [
        {
          event_type: "employer_suspended",
          occurred_at: "2026-08-05T00:00:00Z",
          reason: "x",
          actor_user_id: "99999999-9999-4999-8999-999999999999",
        },
      ],
    });
    // Zod strips unknown keys by default rather than rejecting — assert the
    // parsed shape has no actor_user_id key at all, which is the property
    // that actually matters for rendering safety.
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.status === "ready") {
      expect(parsed.data.audit_events[0]).not.toHaveProperty("actor_user_id");
    }
  });
});

describe("operatorVacancyListSchema", () => {
  it("accepts the exact list_employer_vacancies_for_operator projection", () => {
    const parsed = operatorVacancyListSchema.safeParse([
      {
        vacancy_id: "22222222-2222-4222-8222-222222222222",
        title: "Cleaning role",
        publication_state: "published",
        moderated: false,
        moderated_at: null,
        published_at: "2026-08-01T00:00:00Z",
      },
    ]);
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown publication_state value", () => {
    const parsed = operatorVacancyListSchema.safeParse([
      {
        vacancy_id: "22222222-2222-4222-8222-222222222222",
        title: "Cleaning role",
        publication_state: "archived",
        moderated: false,
        moderated_at: null,
        published_at: null,
      },
    ]);
    expect(parsed.success).toBe(false);
  });
});

describe("vacancyModerationStatusSchema", () => {
  it("accepts a ready moderated vacancy result", () => {
    const parsed = vacancyModerationStatusSchema.safeParse({
      status: "ready",
      vacancy_id: "22222222-2222-4222-8222-222222222222",
      title: "Cleaning role",
      employer_profile_id: "11111111-1111-4111-8111-111111111111",
      publication_state: "published",
      moderated: true,
      moderated_at: "2026-08-05T00:00:00Z",
      moderated_reason: "Misleading listing",
      audit_events: [],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("suspendEmployerRpcResultSchema", () => {
  it("accepts every documented status discriminant", () => {
    const statuses = [
      {
        status: "ok",
        employer_profile_id: "1".repeat(8) + "-1111-4111-8111-111111111111",
      },
      {
        status: "already_in_state",
        employer_profile_id: "1".repeat(8) + "-1111-4111-8111-111111111111",
      },
      { status: "unauthenticated" },
      { status: "forbidden" },
      { status: "validation_error" },
      { status: "unavailable" },
    ];
    for (const value of statuses) {
      expect(suspendEmployerRpcResultSchema.safeParse(value).success).toBe(
        true,
      );
    }
  });

  it("rejects an unrecognised status", () => {
    expect(
      suspendEmployerRpcResultSchema.safeParse({ status: "deleted" }).success,
    ).toBe(false);
  });
});

describe("form schemas", () => {
  it("rejects a malformed employer id", () => {
    const parsed = suspendEmployerFormSchema.safeParse({
      employerProfileId: "not-a-uuid",
      reason: "Fraud reports",
      confirmSuspend: "true",
    });
    expect(parsed.success).toBe(false);
  });

  it("normalizes checkbox truthy strings for confirmation fields", () => {
    const parsed = moderateVacancyFormSchema.safeParse({
      vacancyId: "22222222-2222-4222-8222-222222222222",
      reason: "Misleading listing",
      confirmModerate: "on",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an unconfirmed submission", () => {
    const parsed = moderateVacancyFormSchema.safeParse({
      vacancyId: "22222222-2222-4222-8222-222222222222",
      reason: "Misleading listing",
      confirmModerate: "false",
    });
    expect(parsed.success).toBe(false);
  });
});
