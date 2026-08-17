import { describe, expect, it } from "vitest";

import { candidateStatusDisplayLabel } from "@/lib/applications/candidate-status-labels";
import { applicationStatusLabel } from "@/lib/applications/status";

describe("candidateStatusDisplayLabel", () => {
  it("matches the canonical label for every status except rejected", () => {
    expect(candidateStatusDisplayLabel("submitted")).toBe(
      applicationStatusLabel("submitted"),
    );
    expect(candidateStatusDisplayLabel("reviewing")).toBe(
      applicationStatusLabel("reviewing"),
    );
    expect(candidateStatusDisplayLabel("shortlisted")).toBe(
      applicationStatusLabel("shortlisted"),
    );
    expect(candidateStatusDisplayLabel("accepted")).toBe(
      applicationStatusLabel("accepted"),
    );
  });

  it("renders rejected as Not selected, candidate-surface only", () => {
    expect(candidateStatusDisplayLabel("rejected")).toBe("Not selected");
    expect(applicationStatusLabel("rejected")).toBe("Rejected");
  });
});
