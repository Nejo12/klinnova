/** Employer draft vacancy allow-lists (PR 4.3 / D-051). */

export const WORKPLACE_TYPE_OPTIONS = [
  { code: "private_home", label: "Private home" },
  { code: "apartment", label: "Apartment" },
  { code: "shop", label: "Shop" },
  { code: "office", label: "Office" },
  { code: "warehouse", label: "Warehouse" },
  { code: "outdoor", label: "Outdoor" },
  { code: "other", label: "Other" },
] as const;

export type WorkplaceTypeCode = (typeof WORKPLACE_TYPE_OPTIONS)[number]["code"];

export const WORKPLACE_TYPE_CODES = WORKPLACE_TYPE_OPTIONS.map(
  (option) => option.code,
) as unknown as readonly [WorkplaceTypeCode, ...WorkplaceTypeCode[]];

export const WORK_FREQUENCY_OPTIONS = [
  { code: "one_off", label: "One-off" },
  { code: "recurring", label: "Recurring" },
] as const;

export type WorkFrequencyCode = (typeof WORK_FREQUENCY_OPTIONS)[number]["code"];

export const WORK_FREQUENCY_CODES = WORK_FREQUENCY_OPTIONS.map(
  (option) => option.code,
) as unknown as readonly [WorkFrequencyCode, ...WorkFrequencyCode[]];

export const SALARY_PERIOD_OPTIONS = [
  { code: "hourly", label: "Hourly" },
  { code: "monthly", label: "Monthly" },
  { code: "fixed_job", label: "Fixed for the job" },
] as const;

export type SalaryPeriodCode = (typeof SALARY_PERIOD_OPTIONS)[number]["code"];

export const SALARY_PERIOD_CODES = SALARY_PERIOD_OPTIONS.map(
  (option) => option.code,
) as unknown as readonly [SalaryPeriodCode, ...SalaryPeriodCode[]];
