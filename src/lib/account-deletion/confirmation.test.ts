import { describe, expect, it } from "vitest";

import {
  ACCOUNT_DELETION_CONFIRMATION_FIELD,
  ACCOUNT_DELETION_CONFIRMATION_VALUE,
  hasValidAccountDeletionConfirmation,
} from "@/lib/account-deletion/confirmation";

describe("hasValidAccountDeletionConfirmation", () => {
  it("returns false when the field is absent", () => {
    expect(hasValidAccountDeletionConfirmation(new FormData())).toBe(false);
  });

  it("returns false when the field has any value other than the exact expected constant", () => {
    const formData = new FormData();
    formData.set(ACCOUNT_DELETION_CONFIRMATION_FIELD, "true");
    expect(hasValidAccountDeletionConfirmation(formData)).toBe(false);
  });

  it("returns false for an empty string value", () => {
    const formData = new FormData();
    formData.set(ACCOUNT_DELETION_CONFIRMATION_FIELD, "");
    expect(hasValidAccountDeletionConfirmation(formData)).toBe(false);
  });

  it("returns true only for the exact expected field name and value", () => {
    const formData = new FormData();
    formData.set(
      ACCOUNT_DELETION_CONFIRMATION_FIELD,
      ACCOUNT_DELETION_CONFIRMATION_VALUE,
    );
    expect(hasValidAccountDeletionConfirmation(formData)).toBe(true);
  });
});
