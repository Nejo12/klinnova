/**
 * Convert a user-entered EUR amount string to integer cents.
 * Accepts whole euros or up to two decimal places. Rejects floating junk.
 */
export type EurToCentsResult =
  { ok: true; cents: number } | { ok: false; error: string };

const EUR_AMOUNT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

export function eurStringToCents(raw: string): EurToCentsResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Enter a salary amount, or clear salary." };
  }

  if (!EUR_AMOUNT_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: "Use a positive EUR amount with up to two decimal places.",
    };
  }

  const [wholePart = "0", fractionPart = ""] = trimmed.split(".");
  const whole = Number.parseInt(wholePart, 10);
  const fraction = Number.parseInt(fractionPart.padEnd(2, "0"), 10);

  if (!Number.isFinite(whole) || !Number.isFinite(fraction)) {
    return { ok: false, error: "Enter a valid EUR amount." };
  }

  const cents = whole * 100 + fraction;
  if (cents <= 0) {
    return { ok: false, error: "Salary must be greater than zero." };
  }

  if (!Number.isSafeInteger(cents)) {
    return { ok: false, error: "Salary amount is too large." };
  }

  return { ok: true, cents };
}

/** Format integer cents as a fixed two-decimal EUR string for form defaults. */
export function centsToEurString(cents: number): string {
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const fraction = absolute % 100;
  const formatted = `${whole}.${fraction.toString().padStart(2, "0")}`;
  return negative ? `-${formatted}` : formatted;
}
