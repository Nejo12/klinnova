import { describe, expect, it } from "vitest";

import {
  centsToEurString,
  eurStringToCents,
} from "@/lib/employer/vacancies/salary";

describe("eurStringToCents", () => {
  it("converts whole euros and two-decimal amounts", () => {
    expect(eurStringToCents("15")).toEqual({ ok: true, cents: 1500 });
    expect(eurStringToCents("15.5")).toEqual({ ok: true, cents: 1550 });
    expect(eurStringToCents("15.50")).toEqual({ ok: true, cents: 1550 });
    expect(eurStringToCents("0.01")).toEqual({ ok: true, cents: 1 });
  });

  it("rejects zero, negative, and invalid decimals", () => {
    expect(eurStringToCents("0").ok).toBe(false);
    expect(eurStringToCents("-1").ok).toBe(false);
    expect(eurStringToCents("12.555").ok).toBe(false);
    expect(eurStringToCents("abc").ok).toBe(false);
    expect(eurStringToCents("").ok).toBe(false);
  });
});

describe("centsToEurString", () => {
  it("formats cents with two decimals", () => {
    expect(centsToEurString(1500)).toBe("15.00");
    expect(centsToEurString(1550)).toBe("15.50");
    expect(centsToEurString(1)).toBe("0.01");
  });
});
