import { applicationStatusLabel, type ApplicationStatus } from "@/lib/applications/status";

export function candidateStatusDisplayLabel(status: ApplicationStatus): string {
  if (status === "rejected") {
    return "Not selected";
  }
  return applicationStatusLabel(status);
}
