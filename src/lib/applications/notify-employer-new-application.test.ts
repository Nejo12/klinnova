import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EmployerRecipientLookupResult } from "@/lib/applications/privileged-employer-recipient-lookup";
import type { MailSendResult } from "@/lib/mail/transport";

const resolveEmployerRecipientForVacancyMock = vi.fn();
const sendTransactionalEmailMock = vi.fn();

vi.mock("@/lib/applications/privileged-employer-recipient-lookup", () => ({
  resolveEmployerRecipientForVacancy: (...args: unknown[]) =>
    resolveEmployerRecipientForVacancyMock(...args),
}));

vi.mock("@/lib/mail/send-transactional-email", () => ({
  sendTransactionalEmail: (...args: unknown[]) =>
    sendTransactionalEmailMock(...args),
}));

vi.mock("@/lib/env/public", () => ({
  getPublicEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
    NEXT_PUBLIC_SITE_URL: "https://klinnova.com",
  }),
}));

async function loadModule() {
  return import("@/lib/applications/notify-employer-new-application");
}

const readyRecipient: EmployerRecipientLookupResult = {
  status: "ready",
  employerEmail: "employer@example.com",
  vacancyTitle: "Morning kitchen support",
};

const applicationIdA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const applicationIdB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const vacancyId = "cccccccc-cccc-cccc-cccc-cccccccccccc";

describe("notifyEmployerOfNewApplication", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resolveEmployerRecipientForVacancyMock.mockReset();
    sendTransactionalEmailMock.mockReset();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("sends via the N1 mail facade with the expected recipient, subject, and body", async () => {
    resolveEmployerRecipientForVacancyMock.mockResolvedValue(readyRecipient);
    sendTransactionalEmailMock.mockResolvedValue({
      status: "sent",
      providerMessageId: "provider-id",
    } satisfies MailSendResult);

    const { notifyEmployerOfNewApplication } = await loadModule();
    const result = await notifyEmployerOfNewApplication({
      applicationId: applicationIdA,
      vacancyId,
    });

    expect(result).toEqual({
      status: "sent",
      providerMessageId: "provider-id",
    });
    expect(sendTransactionalEmailMock).toHaveBeenCalledTimes(1);
    const sentMessage = sendTransactionalEmailMock.mock.calls[0]?.[0];
    expect(sentMessage.to).toBe("employer@example.com");
    expect(sentMessage.subject).toBe(
      "New application for Morning kitchen support",
    );
    expect(sentMessage.text).toContain("Morning kitchen support");
    expect(sentMessage.text).toContain(
      `https://klinnova.com/employer/applications/${applicationIdA}`,
    );
    expect(sentMessage.html).toContain("Review application</a>");
    expect(sentMessage.html).toContain(
      `https://klinnova.com/employer/applications/${applicationIdA}`,
    );
  });

  it("derives eventId deterministically from the application id: application-submitted:<id>", async () => {
    resolveEmployerRecipientForVacancyMock.mockResolvedValue(readyRecipient);
    sendTransactionalEmailMock.mockResolvedValue({
      status: "sent",
      providerMessageId: "x",
    } satisfies MailSendResult);

    const { notifyEmployerOfNewApplication } = await loadModule();
    await notifyEmployerOfNewApplication({
      applicationId: applicationIdA,
      vacancyId,
    });

    const sentMessage = sendTransactionalEmailMock.mock.calls[0]?.[0];
    expect(sentMessage.eventId).toBe(`application-submitted:${applicationIdA}`);
  });

  it("produces a different eventId for a different application id", async () => {
    resolveEmployerRecipientForVacancyMock.mockResolvedValue(readyRecipient);
    sendTransactionalEmailMock.mockResolvedValue({
      status: "sent",
      providerMessageId: "x",
    } satisfies MailSendResult);

    const { notifyEmployerOfNewApplication } = await loadModule();
    await notifyEmployerOfNewApplication({
      applicationId: applicationIdA,
      vacancyId,
    });
    await notifyEmployerOfNewApplication({
      applicationId: applicationIdB,
      vacancyId,
    });

    const firstEventId = sendTransactionalEmailMock.mock.calls[0]?.[0].eventId;
    const secondEventId = sendTransactionalEmailMock.mock.calls[1]?.[0].eventId;
    expect(firstEventId).not.toBe(secondEventId);
  });

  it("produces the same eventId for the same application id across repeated calls", async () => {
    resolveEmployerRecipientForVacancyMock.mockResolvedValue(readyRecipient);
    sendTransactionalEmailMock.mockResolvedValue({
      status: "sent",
      providerMessageId: "x",
    } satisfies MailSendResult);

    const { notifyEmployerOfNewApplication } = await loadModule();
    await notifyEmployerOfNewApplication({
      applicationId: applicationIdA,
      vacancyId,
    });
    await notifyEmployerOfNewApplication({
      applicationId: applicationIdA,
      vacancyId,
    });

    const firstEventId = sendTransactionalEmailMock.mock.calls[0]?.[0].eventId;
    const secondEventId = sendTransactionalEmailMock.mock.calls[1]?.[0].eventId;
    expect(firstEventId).toBe(secondEventId);
  });

  it.each([
    "vacancy_not_found",
    "employer_not_found",
    "lookup_failed",
  ] as const)(
    "returns recipient_unresolved without calling sendTransactionalEmail when lookup reports %s",
    async (status) => {
      resolveEmployerRecipientForVacancyMock.mockResolvedValue(
        status === "lookup_failed" ? { status, message: "boom" } : { status },
      );

      const { notifyEmployerOfNewApplication } = await loadModule();
      const result = await notifyEmployerOfNewApplication({
        applicationId: applicationIdA,
        vacancyId,
      });

      expect(result).toEqual({
        status: "recipient_unresolved",
        reason: status,
      });
      expect(sendTransactionalEmailMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    { status: "config_error", message: "missing config" },
    { status: "provider_rejected", httpStatus: 422, message: "rejected" },
    { status: "transport_error", message: "network failure" },
  ] as MailSendResult[])(
    "returns send_failed without throwing when the mail facade reports %o",
    async (mailResult) => {
      resolveEmployerRecipientForVacancyMock.mockResolvedValue(readyRecipient);
      sendTransactionalEmailMock.mockResolvedValue(mailResult);

      const { notifyEmployerOfNewApplication } = await loadModule();
      const result = await notifyEmployerOfNewApplication({
        applicationId: applicationIdA,
        vacancyId,
      });

      expect(result).toEqual({
        status: "send_failed",
        mailStatus: mailResult.status,
      });
    },
  );

  it("never logs the employer recipient email address", async () => {
    resolveEmployerRecipientForVacancyMock.mockResolvedValue(readyRecipient);
    sendTransactionalEmailMock.mockResolvedValue({
      status: "transport_error",
      message: "network failure",
    } satisfies MailSendResult);

    const { notifyEmployerOfNewApplication } = await loadModule();
    await notifyEmployerOfNewApplication({
      applicationId: applicationIdA,
      vacancyId,
    });

    for (const call of consoleErrorSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain(readyRecipient.employerEmail);
    }
  });
});
