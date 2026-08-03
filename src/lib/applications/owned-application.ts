import { z } from "zod";

/** Minimal owned application fields for Applied state on matches/detail. */
export type OwnedApplicationSummary = {
  applicationId: string;
  vacancyId: string;
  status: "submitted";
  submittedAt: string;
};

const ownedApplicationRowSchema = z.object({
  id: z.string().uuid(),
  vacancy_id: z.string().uuid(),
  status: z.literal("submitted"),
  submitted_at: z.string().min(1),
});

export function mapOwnedApplicationSummary(
  row: unknown,
): OwnedApplicationSummary | null {
  const parsed = ownedApplicationRowSchema.safeParse(row);
  if (!parsed.success) {
    return null;
  }
  return {
    applicationId: parsed.data.id,
    vacancyId: parsed.data.vacancy_id,
    status: parsed.data.status,
    submittedAt: parsed.data.submitted_at,
  };
}

export function mapOwnedApplicationsByVacancyId(
  rows: readonly unknown[],
): Map<string, OwnedApplicationSummary> | null {
  const map = new Map<string, OwnedApplicationSummary>();
  for (const row of rows) {
    const summary = mapOwnedApplicationSummary(row);
    if (summary === null) {
      return null;
    }
    map.set(summary.vacancyId, summary);
  }
  return map;
}
