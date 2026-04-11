/** Clinical threshold rules — shared between dashboard and alert engine. */

import type { ThresholdZone } from "@/types";

const rules: Record<string, { green: (v: number) => boolean; amber: (v: number) => boolean }> = {
  sleep_efficiency: {
    green: (v) => v > 90,
    amber: (v) => v >= 85 && v <= 90,
  },
  sleep_debt_index: {
    green: (v) => v < 20,
    amber: (v) => v >= 20 && v <= 50,
  },
  circadian_alignment: {
    green: (v) => v > 75,
    amber: (v) => v >= 50 && v <= 75,
  },
  arousal_index: {
    green: (v) => v < 30,
    amber: (v) => v >= 30 && v <= 60,
  },
  trajectory: {
    green: (v) => v > 0.3,
    amber: (v) => v >= -0.3 && v <= 0.3,
  },
  isi_score: {
    green: (v) => v < 8,
    amber: (v) => v >= 8 && v <= 14,
  },
};

export function getZone(metric: string, value: number): ThresholdZone {
  const rule = rules[metric];
  if (!rule) return "amber";
  if (rule.green(value)) return "green";
  if (rule.amber(value)) return "amber";
  return "red";
}

export const ZONE_COLORS = {
  green: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
  red: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
} as const;

export const METRIC_LABELS: Record<string, { label: string; unit: string; description: string }> = {
  sleep_efficiency: { label: "Sleep Efficiency", unit: "%", description: "TST / TIB ratio" },
  sleep_debt_index: { label: "Sleep Debt", unit: "/100", description: "14-day cumulative deficit" },
  circadian_alignment: { label: "Circadian Alignment", unit: "/100", description: "Onset/wake consistency" },
  arousal_index: { label: "Arousal Index", unit: "/100", description: "Nighttime fragmentation" },
  cbti_readiness: { label: "CBT-I Readiness", unit: "/100", description: "Module progression score" },
  trajectory: { label: "Recovery Trajectory", unit: "", description: "Treatment trend -1 to +1" },
};

export function getISISeverity(score: number): string {
  if (score <= 7) return "No insomnia";
  if (score <= 14) return "Subthreshold";
  if (score <= 21) return "Moderate";
  return "Severe";
}
