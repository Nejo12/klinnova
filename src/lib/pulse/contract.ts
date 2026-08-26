export const KLINNOVA_PULSE_STAGES = [
  "understanding",
  "connecting",
  "progressing",
] as const;

export type KlinnovaPulseStage = (typeof KLINNOVA_PULSE_STAGES)[number];

export const KLINNOVA_PULSE_VERBS = [
  "gather",
  "resolve",
  "connect",
  "advance",
  "reveal",
  "settle",
] as const;

export type KlinnovaPulseVerb = (typeof KLINNOVA_PULSE_VERBS)[number];

export const KLINNOVA_PULSE_STAGE_LABELS: Readonly<
  Record<KlinnovaPulseStage, string>
> = {
  understanding: "Understanding",
  connecting: "Connecting",
  progressing: "Progressing",
};

export const KLINNOVA_PULSE_STAGE_VERBS: Readonly<
  Record<KlinnovaPulseStage, readonly KlinnovaPulseVerb[]>
> = {
  understanding: ["gather", "resolve", "settle", "advance"],
  connecting: ["connect", "reveal", "settle"],
  progressing: ["advance", "resolve", "settle"],
};
