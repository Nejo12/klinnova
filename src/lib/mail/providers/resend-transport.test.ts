import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TransactionalEmailMessage } from "@/lib/mail/message";

const validMessage: TransactionalEmailMessage = Object.freeze({
  to: "candidate@example.com",
  subject: "Test subject",
  text: "Test body",
  eventId: "test-event:123",
});

const validConfig = {
  MAIL_TRANSPORT: "resend" as const,
  RESEND_API_KEY: "re_test_secret_key",
  MAIL_FROM_ADDRESS: "Klinnova <notifications@example.com>",
};

const getMailEnvMock = vi.fn();

vi.mock("@/lib/mail/env", () => ({
  getMailEnv: () => getMailEnvMock(),
}));

async function loadTransportModule() {
  return import("@/lib/mail/providers/resend-transport");
}

describe("createResendTransport", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    getMailEnvMock.mockReset();
    getMailEnvMock.mockReturnValue(validConfig);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns a config_error result without calling fetch when config is invalid", async () => {
    getMailEnvMock.mockImplementation(() => {
      throw new Error(
        "Invalid environment configuration:\n- RESEND_API_KEY: Required",
      );
    });
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const { createResendTransport } = await loadTransportModule();
    const result = await createResendTransport().send(validMessage);

    expect(result.status).toBe("config_error");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends the expected request shape, including the Idempotency-Key header from eventId", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "provider-message-id" }), {
          status: 200,
        }),
    );
    global.fetch = fetchSpy as unknown as typeof fetch;

    const { createResendTransport } = await loadTransportModule();
    const result = await createResendTransport().send(validMessage);

    expect(result).toEqual({
      status: "sent",
      providerMessageId: "provider-message-id",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${validConfig.RESEND_API_KEY}`);
    expect(headers["Idempotency-Key"]).toBe(validMessage.eventId);
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      from: validConfig.MAIL_FROM_ADDRESS,
      to: validMessage.to,
      subject: validMessage.subject,
      text: validMessage.text,
    });
    expect(body.html).toBeUndefined();
  });

  it("includes html in the request body when the message provides it", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "provider-message-id" }), {
          status: 200,
        }),
    );
    global.fetch = fetchSpy as unknown as typeof fetch;

    const { createResendTransport } = await loadTransportModule();
    await createResendTransport().send({
      ...validMessage,
      html: "<p>Test body</p>",
    });

    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.html).toBe("<p>Test body</p>");
  });

  it("maps a non-2xx provider response to provider_rejected without throwing", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: "invalid `to` field" }), {
          status: 422,
        }),
    );
    global.fetch = fetchSpy as unknown as typeof fetch;

    const { createResendTransport } = await loadTransportModule();
    const result = await createResendTransport().send(validMessage);

    expect(result).toEqual({
      status: "provider_rejected",
      httpStatus: 422,
      message: "invalid `to` field",
    });
  });

  it("maps a provider rejection with a non-JSON body to a safe generic message", async () => {
    const fetchSpy = vi.fn(
      async () => new Response("not json", { status: 500 }),
    );
    global.fetch = fetchSpy as unknown as typeof fetch;

    const { createResendTransport } = await loadTransportModule();
    const result = await createResendTransport().send(validMessage);

    expect(result.status).toBe("provider_rejected");
    if (result.status !== "provider_rejected") {
      throw new Error("expected provider_rejected");
    }
    expect(result.httpStatus).toBe(500);
    expect(result.message).not.toContain(validConfig.RESEND_API_KEY);
  });

  it("maps a network failure to transport_error without throwing", async () => {
    const fetchSpy = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const { createResendTransport } = await loadTransportModule();
    const result = await createResendTransport().send(validMessage);

    expect(result).toEqual({
      status: "transport_error",
      message: "fetch failed",
    });
  });

  it("maps a malformed success response (missing id) to transport_error", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(JSON.stringify({ unexpected: true }), { status: 200 }),
    );
    global.fetch = fetchSpy as unknown as typeof fetch;

    const { createResendTransport } = await loadTransportModule();
    const result = await createResendTransport().send(validMessage);

    expect(result.status).toBe("transport_error");
  });

  it("never includes the request Authorization header or raw config in a returned result", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: "generic provider error" }), {
          status: 500,
        }),
    );
    global.fetch = fetchSpy as unknown as typeof fetch;

    const { createResendTransport } = await loadTransportModule();
    const result = await createResendTransport().send(validMessage);

    expect(Object.keys(result)).not.toContain("headers");
    expect(Object.keys(result)).not.toContain("authorization");
    expect(JSON.stringify(result)).not.toContain(validConfig.RESEND_API_KEY);
  });
});
