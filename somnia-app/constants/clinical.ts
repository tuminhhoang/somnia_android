/** Clinical thresholds for metric zone classification. */

import type { ThresholdZone } from "@/types";

interface ThresholdRule {
  green: (v: number) => boolean;
  amber: (v: number) => boolean;
}

const rules: Record<string, ThresholdRule> = {
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

/** ISI question labels for the questionnaire. */
export const ISI_QUESTIONS = [
  {
    key: "q1_severity_falling_asleep",
    label: "Difficulty falling asleep",
    options: ["None", "Mild", "Moderate", "Severe", "Very severe"],
  },
  {
    key: "q2_severity_staying_asleep",
    label: "Difficulty staying asleep",
    options: ["None", "Mild", "Moderate", "Severe", "Very severe"],
  },
  {
    key: "q3_severity_early_waking",
    label: "Problem waking up too early",
    options: ["None", "Mild", "Moderate", "Severe", "Very severe"],
  },
  {
    key: "q4_satisfaction",
    label: "How satisfied are you with your current sleep pattern?",
    options: [
      "Very satisfied",
      "Satisfied",
      "Neutral",
      "Dissatisfied",
      "Very dissatisfied",
    ],
  },
  {
    key: "q5_interference_daily",
    label:
      "How noticeable to others do you think your sleep problem is in terms of impairing the quality of your life?",
    options: ["Not at all", "A little", "Somewhat", "Much", "Very much"],
  },
  {
    key: "q6_noticeable_to_others",
    label: "How worried/distressed are you about your current sleep problem?",
    options: ["Not at all", "A little", "Somewhat", "Much", "Very much"],
  },
  {
    key: "q7_worry_distress",
    label:
      "To what extent do you consider your sleep problem to interfere with your daily functioning?",
    options: [
      "Not at all interfering",
      "A little",
      "Somewhat",
      "Much",
      "Very much interfering",
    ],
  },
] as const;

export function getISISeverity(
  score: number
): "no_insomnia" | "subthreshold" | "moderate" | "severe" {
  if (score <= 7) return "no_insomnia";
  if (score <= 14) return "subthreshold";
  if (score <= 21) return "moderate";
  return "severe";
}
