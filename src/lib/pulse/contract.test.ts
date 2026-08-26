import { describe, expect, it } from "vitest";

import {
  KLINNOVA_PULSE_STAGE_LABELS,
  KLINNOVA_PULSE_STAGES,
  KLINNOVA_PULSE_STAGE_VERBS,
  KLINNOVA_PULSE_VERBS,
} from "./contract";

describe("Klinnova Pulse contract", () => {
  it("locks the approved three-stage journey without a fourth deciding stage", () => {
    expect(KLINNOVA_PULSE_STAGES).toEqual([
      "understanding",
      "connecting",
      "progressing",
    ]);
    expect(KLINNOVA_PULSE_STAGES).not.toContain("deciding");
  });

  it("locks the approved six-verb motion grammar", () => {
    expect(KLINNOVA_PULSE_VERBS).toEqual([
      "gather",
      "resolve",
      "connect",
      "advance",
      "reveal",
      "settle",
    ]);
  });

  it("maps each stage to its approved label and verb sequence", () => {
    expect(KLINNOVA_PULSE_STAGE_LABELS).toEqual({
      understanding: "Understanding",
      connecting: "Connecting",
      progressing: "Progressing",
    });

    expect(KLINNOVA_PULSE_STAGE_VERBS).toEqual({
      understanding: ["gather", "resolve", "settle", "advance"],
      connecting: ["connect", "reveal", "settle"],
      progressing: ["advance", "resolve", "settle"],
    });
  });
});
