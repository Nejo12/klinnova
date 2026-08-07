import {
  applicationListFilterSchema,
  type ApplicationListFilter,
} from "@/lib/employer/applications/schemas";

/**
 * Normalize `?vacancy=&status=` query params for `/employer/applications`.
 * Malformed input (bad UUID, unknown status) normalizes to "no filter" —
 * never a crash, never passed through uninterpreted. `list_current_employer_applications`
 * would already treat an unrecognised status as zero rows, but normalizing
 * here keeps the loader from calling the RPC with a value it cannot use.
 */
export function parseApplicationListFilters(searchParams: {
  vacancy?: string | string[] | undefined;
  status?: string | string[] | undefined;
}): ApplicationListFilter {
  const rawVacancy = Array.isArray(searchParams.vacancy)
    ? searchParams.vacancy[0]
    : searchParams.vacancy;
  const rawStatus = Array.isArray(searchParams.status)
    ? searchParams.status[0]
    : searchParams.status;

  const vacancyParsed = applicationListFilterSchema.shape.vacancyId.safeParse(
    rawVacancy ?? null,
  );
  const statusParsed = applicationListFilterSchema.shape.status.safeParse(
    rawStatus ?? null,
  );

  return {
    vacancyId: vacancyParsed.success ? vacancyParsed.data : null,
    status: statusParsed.success ? statusParsed.data : null,
  };
}
