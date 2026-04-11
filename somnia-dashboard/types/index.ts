/** Clinician dashboard types — mirrors the patient app metric types. */

export type ThresholdZone = "green" | "amber" | "red";

export interface DerivedMetrics {
  patient_id: string;
  date: string;
  computed_at: string;
  sleep_efficiency: number;
  tib_action: "expand_window" | "restrict_window" | "hold";
  new_tib_min: number;
  sleep_debt_index: number;
  circadian_alignment: number;
  chronotype_offset_h: number;
  social_jetlag_h: number;
  arousal_index: number;
  arousal_subtype: "frequency" | "duration" | "hrv_instability" | "mixed" | "none";
  cbti_readiness: number;
  active_module: "stimulus_control" | "sleep_restriction" | "cognitive_restructuring" | "sleep_hygiene";
  module_confidence: "high" | "medium" | "low";
  trajectory: number;
  predicted_isi_w6: number;
  on_track: boolean;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  enrolled_at: string;
  wearable: "oura" | "apple_health" | "health_connect" | "none";
  current_module: string;
  week: number;
  latest_metrics: DerivedMetrics | null;
}

export interface WeeklyProgress {
  week: number;
  sleep_efficiency: number;
  hrv_avg: number;
  isi_score: number;
  trajectory: number;
}

export interface ClinicalAlert {
  id: string;
  patient_id: string;
  patient_name: string;
  type: "isi_increase" | "spo2_low" | "off_track" | "high_arousal" | "low_efficiency";
  severity: "warning" | "critical";
  message: string;
  value: number;
  threshold: number;
  created_at: string;
  acknowledged: boolean;
}

export interface Clinician {
  id: string;
  name: string;
  email: string;
  clinic: string;
}
