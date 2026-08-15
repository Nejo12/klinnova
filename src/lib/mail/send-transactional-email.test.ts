import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";
import type { TransactionalEmailMessage } from "@/lib/mail/message";
import type { MailSendResult, MailTransport } from "@/lib/mail/transport";

const message: TransactionalEmailMessage = Object.freeze({
  to: "candidate@example.com",
  subject: "Test subject",
  text: "Test body",
  eventId: "test-event:123",
});

function fakeTransport(result: MailSendResult): MailTransport {
  return { send: vi.fn(async () => result) };
}

describe("sendTransactionalEmail", () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("delegates to the injected transport and returns its result unchanged", async () => {
    const transport = fakeTransport({
      status: "sent",
      providerMessageId: "provider-id",
    });

    const result = await sendTransactionalEmail(message, transport);

    expect(result).toEqual({
      status: "sent",
      providerMessageId: "provider-id",
    });
    expect(transport.send).toHaveBeenCalledWith(message);
  });

  it("propagates the exact message (including eventId) to the transport unchanged", async () => {
    const transport = fakeTransport({ status: "sent", providerMessageId: "x" });

    await sendTransactionalEmail(message, transport);

    const sentMessage = (transport.send as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as TransactionalEmailMessage;
    expect(sentMessage.eventId).toBe(message.eventId);
  });

  it("logs a success outcome without the recipient address or message body", async () => {
    const transport = fakeTransport({
      status: "sent",
      providerMessageId: "provider-id",
    });

    await sendTransactionalEmail(message, transport);

    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const loggedArgs = consoleInfoSpy.mock.calls[0];
    const loggedPayload = JSON.stringify(loggedArgs);
    expect(loggedPayload).toContain(message.eventId);
    expect(loggedPayload).not.toContain(message.to);
    expect(loggedPayload).not.toContain(message.text);
  });

  it("logs a failure outcome without leaking the message body", async () => {
    const transport = fakeTransport({
      status: "transport_error",
      message: "network failure",
    });

    await sendTransactionalEmail(message, transport);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const loggedPayload = JSON.stringify(consoleErrorSpy.mock.calls[0]);
    expect(loggedPayload).toContain(message.eventId);
    expect(loggedPayload).not.toContain(message.to);
    expect(loggedPayload).not.toContain(message.text);
  });

  it("does not throw when the transport reports config_error, provider_rejected, or transport_error", async () => {
    const scenarios: MailSendResult[] = [
      { status: "config_error", message: "missing config" },
      { status: "provider_rejected", httpStatus: 422, message: "rejected" },
      { status: "transport_error", message: "network failure" },
    ];

    for (const scenario of scenarios) {
      const transport = fakeTransport(scenario);
      await expect(sendTransactionalEmail(message, transport)).resolves.toEqual(
        scenario,
      );
    }
  });
});
