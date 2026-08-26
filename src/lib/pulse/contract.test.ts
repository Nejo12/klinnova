import { describe, expect, it } from "vitest";

import {
  KLinnova_PULSE_STAGE_LABELS,
  KLinnova_PULSE_STAGES,
  KLinnova_PULSE_STAGE_VERBS,
  KLinnova_PULSE_VERBS,
} from "./contract";

describe("Klinnova Pulse contract", () => {
  it("locks the approved three-stage journey without a fourth deciding stage", () => {
    expect(KLinnova_PULSE_STAGES).toEqual([
      "understanding",
      "connecting",
      "progressing",
    ]);
    expect(KLinnova_PULSE_STAGES).not.toContain("deciding");
  });

  it("locks the approved six-verb motion grammar", () => {
    expect(KLinnova_PULSE_VERBS).toEqual([
      "gather",
      "resolve",
      "connect",
      "advance",
      "reveal",
      "settle",
    ]);
  });

  it("maps each stage to its approved label and verb sequence", () => {
    expect(KLinnova_PULSE_STAGE_LABELS).toEqual({
      understanding: "Understanding",
      connecting: "Connecting",
      progressing: "Progressing",
    });

    expect(KLinnova_PULSE_STAGE_VERBS).toEqual({
      understanding: ["gather", "resolve", "settle", "advance"],
      connecting: ["connect", "reveal", "settle"],
      progressing: ["advance", "resolve", "settle"],
    });
  });
});
