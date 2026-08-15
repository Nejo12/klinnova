import { describe, expect, it } from "vitest";

import { createTransactionalEmailMessage } from "@/lib/mail/message";

const validInput = {
  to: "candidate@example.com",
  subject: "Test subject",
  text: "Test body",
  eventId: "test-event:123",
};

describe("createTransactionalEmailMessage", () => {
  it("returns a success result with the validated fields", () => {
    const result = createTransactionalEmailMessage(validInput);

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error("expected success");
    }
    expect(result.message.to).toBe(validInput.to);
    expect(result.message.subject).toBe(validInput.subject);
    expect(result.message.text).toBe(validInput.text);
    expect(result.message.eventId).toBe(validInput.eventId);
    expect(result.message.html).toBeUndefined();
  });

  it("is deterministic: identical input produces an identical (deep-equal) output", () => {
    const first = createTransactionalEmailMessage(validInput);
    const second = createTransactionalEmailMessage({ ...validInput });

    expect(first).toEqual(second);
  });

  it("does not mutate the input object", () => {
    const input = { ...validInput };
    const snapshot = { ...input };

    createTransactionalEmailMessage(input);

    expect(input).toEqual(snapshot);
  });

  it("returns a frozen message object", () => {
    const result = createTransactionalEmailMessage(validInput);
    if (result.status !== "success") {
      throw new Error("expected success");
    }
    expect(Object.isFrozen(result.message)).toBe(true);
  });

  it("accepts optional html and metadata", () => {
    const result = createTransactionalEmailMessage({
      ...validInput,
      html: "<p>Test body</p>",
      metadata: { applicationId: "app-1" },
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error("expected success");
    }
    expect(result.message.html).toBe("<p>Test body</p>");
    expect(result.message.metadata).toEqual({ applicationId: "app-1" });
  });

  it("rejects an invalid recipient email", () => {
    const result = createTransactionalEmailMessage({
      ...validInput,
      to: "not-an-email",
    });

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") {
      throw new Error("expected invalid");
    }
    expect(result.issues.some((issue) => issue.startsWith("to:"))).toBe(true);
  });

  it("rejects an empty subject", () => {
    const result = createTransactionalEmailMessage({
      ...validInput,
      subject: "",
    });

    expect(result.status).toBe("invalid");
  });

  it("rejects an empty text body", () => {
    const result = createTransactionalEmailMessage({
      ...validInput,
      text: "",
    });

    expect(result.status).toBe("invalid");
  });

  it("rejects a missing eventId", () => {
    const result = createTransactionalEmailMessage({
      ...validInput,
      eventId: "",
    });

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") {
      throw new Error("expected invalid");
    }
    expect(result.issues.some((issue) => issue.startsWith("eventId:"))).toBe(
      true,
    );
  });

  it("does not throw on invalid input", () => {
    expect(() =>
      createTransactionalEmailMessage({
        to: "",
        subject: "",
        text: "",
        eventId: "",
      }),
    ).not.toThrow();
  });
});
