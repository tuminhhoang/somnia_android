/** Derived metrics computed nightly by the Somnia metric engine. */
export interface DerivedMetrics {
  patient_id: string;
  date: string;
  computed_at: string;

  // METRIC_01 — Sleep Efficiency Index
  sleep_efficiency: number; // 0–100%
  tib_action: "expand_window" | "restrict_window" | "hold";
  new_tib_min: number;

  // METRIC_02 — Sleep Debt Index
  sleep_debt_index: number; // 0–100

  // METRIC_03 — Circadian Alignment Score
  circadian_alignment: number; // 0–100
  chronotype_offset_h: number;
  social_jetlag_h: number;

  // METRIC_04 — Arousal Index
  arousal_index: number; // 0–100
  arousal_subtype:
    | "frequency"
    | "duration"
    | "hrv_instability"
    | "mixed"
    | "none";

  // METRIC_05 — CBT-I Readiness Score
  cbti_readiness: number; // 0–100
  active_module:
    | "stimulus_control"
    | "sleep_restriction"
    | "cognitive_restructuring"
    | "sleep_hygiene";
  module_confidence: "high" | "medium" | "low";

  // METRIC_06 — Recovery Trajectory
  trajectory: number; // -1.0 to +1.0
  predicted_isi_w6: number;
  on_track: boolean;
}

/** Clinical threshold zones for dashboard display. */
export type ThresholdZone = "green" | "amber" | "red";

/** Prescribed bedtime window from the metric engine. */
export interface BedtimeWindow {
  lights_out: string; // "HH:MM"
  rise_time: string; // "HH:MM"
  tib_minutes: number;
}

/** Weekly progress snapshot for the trajectory chart. */
export interface WeeklyProgress {
  week: number;
  sleep_efficiency: number;
  hrv_avg: number;
  isi_score: number;
  trajectory: number;
}
