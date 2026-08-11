import { describe, expect, it } from "vitest";
import type * as Sentry from "@sentry/nextjs";

import {
  scrubBreadcrumb,
  scrubSentryEvent,
} from "@/lib/observability/sentry-scrub";

describe("scrubSentryEvent", () => {
  it("strips event.user entirely", () => {
    const event = {
      user: {
        id: "user-1",
        email: "candidate@example.com",
        ip_address: "1.2.3.4",
      },
    } as Sentry.ErrorEvent;

    const scrubbed = scrubSentryEvent(event);

    expect(scrubbed.user).toBeUndefined();
  });

  it("strips request body, cookies, query string, and sensitive headers, but keeps the path", () => {
    const event = {
      request: {
        url: "https://stint.company/employer/applications/abc?token=secret123",
        data: { email: "candidate@example.com", password: "hunter2" },
        cookies: { session: "abc123" },
        headers: {
          Cookie: "session=abc123",
          Authorization: "Bearer secret-token",
          "User-Agent": "Mozilla/5.0",
        },
        query_string: "token=secret123",
      },
    } as unknown as Sentry.ErrorEvent;

    const scrubbed = scrubSentryEvent(event);

    expect(scrubbed.request?.data).toBeUndefined();
    expect(scrubbed.request?.cookies).toBeUndefined();
    expect(scrubbed.request?.query_string).toBeUndefined();
    expect(scrubbed.request?.url).toBe(
      "https://stint.company/employer/applications/abc",
    );
    expect(scrubbed.request?.headers).toEqual({ "User-Agent": "Mozilla/5.0" });
  });

  it("strips extra fields whose key looks sensitive, and redacts sensitive text in remaining string extras", () => {
    const event = {
      extra: {
        password: "hunter2",
        authToken: "abc",
        userSessionId: "xyz",
        apiKey: "sk-123",
        harmlessCount: 3,
        note: "connection was postgresql://postgres:hunter2@db.abc.supabase.co:5432/postgres",
      },
    } as unknown as Sentry.ErrorEvent;

    const scrubbed = scrubSentryEvent(event);

    expect(scrubbed.extra).toEqual({
      harmlessCount: 3,
      note: "connection was [redacted-connection-string]",
    });
  });

  it("drops nested object and array values in event.extra entirely, rather than passing them through", () => {
    const event = {
      extra: {
        nestedObject: { anything: "could be here" },
        nestedArray: ["could", "hide", "anything"],
        safeString: "keep me",
        safeNumber: 42,
        safeBoolean: true,
        safeNull: null,
      },
    } as unknown as Sentry.ErrorEvent;

    const scrubbed = scrubSentryEvent(event);

    expect(scrubbed.extra).toEqual({
      safeString: "keep me",
      safeNumber: 42,
      safeBoolean: true,
      safeNull: null,
    });
  });

  it("redacts DB-connection-string and service-role-secret-shaped text embedded in the exception message", () => {
    const event = {
      exception: {
        values: [
          {
            type: "Error",
            value:
              "failed using postgresql://postgres:hunter2@db.abc.supabase.co:5432/postgres and key sb_secret_abcXYZ123",
          },
        ],
      },
    } as Sentry.ErrorEvent;

    const scrubbed = scrubSentryEvent(event);

    expect(scrubbed.exception?.values?.[0]?.value).toBe(
      "failed using [redacted-connection-string] and key [redacted-secret]",
    );
  });

  it("redacts sensitive text in the top-level message field", () => {
    const event = {
      message:
        "config error: sb_secret_abcXYZ123 rejected by postgresql://user:pw@host:5432/db",
    } as Sentry.ErrorEvent;

    const scrubbed = scrubSentryEvent(event);

    expect(scrubbed.message).toBe(
      "config error: [redacted-secret] rejected by [redacted-connection-string]",
    );
  });

  it("scrubs every attached breadcrumb through the same breadcrumb policy", () => {
    const event = {
      breadcrumbs: [
        { category: "navigation", data: { from: "/a", to: "/b" } },
        { category: "xhr", data: { url: "/api?secret=1", body: "raw body" } },
        { category: "ui.hover", message: "hovered a button" },
      ],
    } as Sentry.ErrorEvent;

    const scrubbed = scrubSentryEvent(event);

    expect(scrubbed.breadcrumbs).toHaveLength(2);
    expect(scrubbed.breadcrumbs?.[1]?.data).toEqual({ url: "/api" });
  });

  it("leaves a clean event with no request/user/extra/breadcrumb data unchanged in shape", () => {
    const event = {
      exception: { values: [{ type: "Error", value: "boom" }] },
    } as Sentry.ErrorEvent;

    const scrubbed = scrubSentryEvent(event);

    expect(scrubbed.exception?.values?.[0]?.value).toBe("boom");
    expect(scrubbed.user).toBeUndefined();
  });
});

describe("scrubBreadcrumb", () => {
  it("drops any breadcrumb category not on the conservative allow-list", () => {
    expect(
      scrubBreadcrumb({ category: "ui.hover" } as Sentry.Breadcrumb),
    ).toBeNull();
    expect(scrubBreadcrumb({} as Sentry.Breadcrumb)).toBeNull();
  });

  it("retains allow-listed categories with no data untouched", () => {
    const breadcrumb = {
      category: "console",
      message: "hello",
    } as Sentry.Breadcrumb;
    expect(scrubBreadcrumb(breadcrumb)).toEqual(breadcrumb);
  });

  it("strips body/response/headers from fetch breadcrumbs and sanitizes the URL", () => {
    const breadcrumb = {
      category: "fetch",
      data: {
        method: "POST",
        url: "https://api.example.com/x?apiKey=secret",
        body: "raw request body",
        response: { data: "raw response body" },
        headers: { Authorization: "Bearer x" },
        status_code: 500,
      },
    } as unknown as Sentry.Breadcrumb;

    const scrubbed = scrubBreadcrumb(breadcrumb);

    expect(scrubbed?.data).toEqual({
      method: "POST",
      url: "https://api.example.com/x",
      status_code: 500,
    });
  });

  it("strips the query string from a navigation breadcrumb's data.from", () => {
    const breadcrumb = {
      category: "navigation",
      data: {
        from: "/reset-password?token=abc123",
        to: "/login",
      },
    } as unknown as Sentry.Breadcrumb;

    const scrubbed = scrubBreadcrumb(breadcrumb);

    expect(scrubbed?.data?.from).toBe("/reset-password");
  });

  it("strips the query string from a navigation breadcrumb's data.to", () => {
    const breadcrumb = {
      category: "navigation",
      data: {
        from: "/login",
        to: "/reset-password?token=abc123",
      },
    } as unknown as Sentry.Breadcrumb;

    const scrubbed = scrubBreadcrumb(breadcrumb);

    expect(scrubbed?.data?.to).toBe("/reset-password");
  });

  it("redacts a Postgres connection string embedded in a console breadcrumb's message", () => {
    const breadcrumb = {
      category: "console",
      message:
        "connecting to postgresql://postgres:hunter2@db.abc.supabase.co:5432/postgres",
    } as Sentry.Breadcrumb;

    const scrubbed = scrubBreadcrumb(breadcrumb);

    expect(scrubbed?.message).toBe(
      "connecting to [redacted-connection-string]",
    );
  });

  it("redacts an sb_secret_* token embedded in a console breadcrumb's message", () => {
    const breadcrumb = {
      category: "console",
      message: "using key sb_secret_abcXYZ123 for this request",
    } as Sentry.Breadcrumb;

    const scrubbed = scrubBreadcrumb(breadcrumb);

    expect(scrubbed?.message).toBe(
      "using key [redacted-secret] for this request",
    );
  });

  it("never passes arbitrary or nested breadcrumb data through unchanged, for any allowed category", () => {
    const arbitraryData = {
      password: "hunter2",
      nested: { anything: "could be here" },
      list: [1, 2, 3],
    };

    for (const category of ["console", "ui.click"] as const) {
      const scrubbed = scrubBreadcrumb({
        category,
        data: arbitraryData,
      } as unknown as Sentry.Breadcrumb);
      expect(scrubbed?.data).toBeUndefined();
    }

    const fetchScrubbed = scrubBreadcrumb({
      category: "fetch",
      data: arbitraryData,
    } as unknown as Sentry.Breadcrumb);
    expect(fetchScrubbed?.data).toBeUndefined();

    const navigationScrubbed = scrubBreadcrumb({
      category: "navigation",
      data: arbitraryData,
    } as unknown as Sentry.Breadcrumb);
    expect(navigationScrubbed?.data).toBeUndefined();
  });
});
