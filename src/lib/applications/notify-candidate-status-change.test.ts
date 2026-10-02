import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CandidateRecipientLookupResult } from "@/lib/applications/privileged-candidate-recipient-lookup";
import type { MailSendResult } from "@/lib/mail/transport";

const resolveCandidateRecipientForApplicationMock = vi.fn();
const sendTransactionalEmailMock = vi.fn();
const preferenceMock = vi.fn();
vi.mock("@/lib/notification-preferences/resolve-email-preference", () => ({
  resolveRecipientEmailPreference: (...args: unknown[]) =>
    preferenceMock(...args),
}));

vi.mock("@/lib/applications/privileged-candidate-recipient-lookup", () => ({
  resolveCandidateRecipientForApplication: (...args: unknown[]) =>
    resolveCandidateRecipientForApplicationMock(...args),
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
  return import("@/lib/applications/notify-candidate-status-change");
}

const readyRecipient: CandidateRecipientLookupResult = {
  status: "ready",
  candidateEmail: "candidate@example.com",
  recipientUserId: "22222222-2222-4222-8222-222222222222",
  vacancyTitle: "Morning kitchen support",
};

const applicationIdA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const applicationIdB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("notifyCandidateOfStatusChange", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resolveCandidateRecipientForApplicationMock.mockReset();
    sendTransactionalEmailMock.mockReset();
    preferenceMock.mockReset().mockResolvedValue(true);
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it.each(["shortlisted", "accepted", "rejected"] as const)(
    "skips %s transport after explicit Email opt-out",
    async (toStatus) => {
      resolveCandidateRecipientForApplicationMock.mockResolvedValue(
        readyRecipient,
      );
      preferenceMock.mockResolvedValue(false);
      const { notifyCandidateOfStatusChange } = await loadModule();
      expect(
        await notifyCandidateOfStatusChange({
          applicationId: applicationIdA,
          toStatus,
        }),
      ).toEqual({ status: "suppressed" });
      expect(preferenceMock).toHaveBeenCalledWith(
        readyRecipient.recipientUserId,
        "candidate_application_updates",
      );
      expect(sendTransactionalEmailMock).not.toHaveBeenCalled();
    },
  );
  it("skips transport on preference lookup failure without throwing", async () => {
    resolveCandidateRecipientForApplicationMock.mockResolvedValue(
      readyRecipient,
    );
    preferenceMock.mockResolvedValue(null);
    const { notifyCandidateOfStatusChange } = await loadModule();
    expect(
      await notifyCandidateOfStatusChange({
        applicationId: applicationIdA,
        toStatus: "shortlisted",
      }),
    ).toEqual({ status: "preference_unresolved" });
    expect(sendTransactionalEmailMock).not.toHaveBeenCalled();
  });
  it("sends via the N1 mail facade with the expected recipient, subject, and body for shortlisted", async () => {
    resolveCandidateRecipientForApplicationMock.mockResolvedValue(
      readyRecipient,
    );
    sendTransactionalEmailMock.mockResolvedValue({
      status: "sent",
      providerMessageId: "provider-id",
    } satisfies MailSendResult);

    const { notifyCandidateOfStatusChange } = await loadModule();
    const result = await notifyCandidateOfStatusChange({
      applicationId: applicationIdA,
      toStatus: "shortlisted",
    });

    expect(result).toEqual({
      status: "sent",
      providerMessageId: "provider-id",
    });
    expect(sendTransactionalEmailMock).toHaveBeenCalledTimes(1);
    const sentMessage = sendTransactionalEmailMock.mock.calls[0]?.[0];
    expect(sentMessage.to).toBe("candidate@example.com");
    expect(sentMessage.subject).toBe(
      "Your application for Morning kitchen support was shortlisted",
    );
    expect(sentMessage.text).toContain(
      `https://klinnova.com/candidate/applications/${applicationIdA}`,
    );
    expect(sentMessage.html).toContain("View application</a>");
    expect(sentMessage.html).toContain(
      `https://klinnova.com/candidate/applications/${applicationIdA}`,
    );
  });

  it.each(["shortlisted", "accepted", "rejected"] as const)(
    "derives eventId deterministically as application-status:<id>:%s",
    async (toStatus) => {
      resolveCandidateRecipientForApplicationMock.mockResolvedValue(
        readyRecipient,
      );
      sendTransactionalEmailMock.mockResolvedValue({
        status: "sent",
        providerMessageId: "x",
      } satisfies MailSendResult);

      const { notifyCandidateOfStatusChange } = await loadModule();
      await notifyCandidateOfStatusChange({
        applicationId: applicationIdA,
        toStatus,
      });

      const sentMessage = sendTransactionalEmailMock.mock.calls[0]?.[0];
      expect(sentMessage.eventId).toBe(
        `application-status:${applicationIdA}:${toStatus}`,
      );
    },
  );

  it("produces a different eventId for a different target status on the same application", async () => {
    resolveCandidateRecipientForApplicationMock.mockResolvedValue(
      readyRecipient,
    );
    sendTransactionalEmailMock.mockResolvedValue({
      status: "sent",
      providerMessageId: "x",
    } satisfies MailSendResult);

    const { notifyCandidateOfStatusChange } = await loadModule();
    await notifyCandidateOfStatusChange({
      applicationId: applicationIdA,
      toStatus: "shortlisted",
    });
    await notifyCandidateOfStatusChange({
      applicationId: applicationIdA,
      toStatus: "accepted",
    });

    const firstEventId = sendTransactionalEmailMock.mock.calls[0]?.[0].eventId;
    const secondEventId = sendTransactionalEmailMock.mock.calls[1]?.[0].eventId;
    expect(firstEventId).not.toBe(secondEventId);
  });

  it("produces a different eventId for a different application at the same target status", async () => {
    resolveCandidateRecipientForApplicationMock.mockResolvedValue(
      readyRecipient,
    );
    sendTransactionalEmailMock.mockResolvedValue({
      status: "sent",
      providerMessageId: "x",
    } satisfies MailSendResult);

    const { notifyCandidateOfStatusChange } = await loadModule();
    await notifyCandidateOfStatusChange({
      applicationId: applicationIdA,
      toStatus: "rejected",
    });
    await notifyCandidateOfStatusChange({
      applicationId: applicationIdB,
      toStatus: "rejected",
    });

    const firstEventId = sendTransactionalEmailMock.mock.calls[0]?.[0].eventId;
    const secondEventId = sendTransactionalEmailMock.mock.calls[1]?.[0].eventId;
    expect(firstEventId).not.toBe(secondEventId);
  });

  it("produces the same eventId for the same application/status across repeated calls (retry-stable)", async () => {
    resolveCandidateRecipientForApplicationMock.mockResolvedValue(
      readyRecipient,
    );
    sendTransactionalEmailMock.mockResolvedValue({
      status: "sent",
      providerMessageId: "x",
    } satisfies MailSendResult);

    const { notifyCandidateOfStatusChange } = await loadModule();
    await notifyCandidateOfStatusChange({
      applicationId: applicationIdA,
      toStatus: "accepted",
    });
    await notifyCandidateOfStatusChange({
      applicationId: applicationIdA,
      toStatus: "accepted",
    });

    const firstEventId = sendTransactionalEmailMock.mock.calls[0]?.[0].eventId;
    const secondEventId = sendTransactionalEmailMock.mock.calls[1]?.[0].eventId;
    expect(firstEventId).toBe(secondEventId);
  });

  it.each([
    "application_not_found",
    "candidate_not_found",
    "lookup_failed",
  ] as const)(
    "returns recipient_unresolved without calling sendTransactionalEmail when lookup reports %s",
    async (status) => {
      resolveCandidateRecipientForApplicationMock.mockResolvedValue(
        status === "lookup_failed" ? { status, message: "boom" } : { status },
      );

      const { notifyCandidateOfStatusChange } = await loadModule();
      const result = await notifyCandidateOfStatusChange({
        applicationId: applicationIdA,
        toStatus: "shortlisted",
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
      resolveCandidateRecipientForApplicationMock.mockResolvedValue(
        readyRecipient,
      );
      sendTransactionalEmailMock.mockResolvedValue(mailResult);

      const { notifyCandidateOfStatusChange } = await loadModule();
      const result = await notifyCandidateOfStatusChange({
        applicationId: applicationIdA,
        toStatus: "rejected",
      });

      expect(result).toEqual({
        status: "send_failed",
        mailStatus: mailResult.status,
      });
    },
  );

  it("never logs the candidate recipient email address", async () => {
    resolveCandidateRecipientForApplicationMock.mockResolvedValue(
      readyRecipient,
    );
    sendTransactionalEmailMock.mockResolvedValue({
      status: "transport_error",
      message: "network failure",
    } satisfies MailSendResult);

    const { notifyCandidateOfStatusChange } = await loadModule();
    await notifyCandidateOfStatusChange({
      applicationId: applicationIdA,
      toStatus: "accepted",
    });

    for (const call of consoleErrorSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain(readyRecipient.candidateEmail);
    }
  });
});
