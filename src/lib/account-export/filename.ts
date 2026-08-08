/**
 * Deterministic, privacy-safe export filename — date only, derived from the
 * export's own `exported_at` timestamp. Never includes email, display
 * name, company name, or the Auth UUID.
 */
export function exportFilename(
  role: "candidate" | "employer",
  exportedAtIso: string,
): string {
  const date = new Date(exportedAtIso);
  const isoDate = Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10);
  return `stint-${role}-export-${isoDate}.json`;
}
