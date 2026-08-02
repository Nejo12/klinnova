import type { ConcreteShift } from "@/lib/matching/types";

/** Vacancy shifts — never includes `flexible`. */
export const CONCRETE_SHIFT_CODES = [
  "morning",
  "daytime",
  "evening",
  "night",
  "weekend",
] as const satisfies readonly ConcreteShift[];
