/** Sleep diary entry — combines wearable data + self-report. */
export interface SleepDiaryEntry {
  date: string;
  // Wearable-sourced
  total_sleep_min: number;
  time_in_bed_min: number;
  sleep_efficiency: number;
  sleep_onset_min: number;
  wake_episodes: number;
  deep_min: number;
  rem_min: number;
  light_min: number;
  resting_hr: number;
  avg_hrv: number;
  // Self-report
  sleep_quality: 1 | 2 | 3 | 4 | 5;
  morning_alertness: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

/** ISI questionnaire response (0–28 total). */
export interface ISIResponse {
  date: string;
  // 7 questions, each 0–4
  q1_severity_falling_asleep: number;
  q2_severity_staying_asleep: number;
  q3_severity_early_waking: number;
  q4_satisfaction: number;
  q5_interference_daily: number;
  q6_noticeable_to_others: number;
  q7_worry_distress: number;
  total_score: number;
}

/** ISI severity category. */
export type ISISeverity =
  | "no_insomnia" // 0–7
  | "subthreshold" // 8–14
  | "moderate" // 15–21
  | "severe"; // 22–28
