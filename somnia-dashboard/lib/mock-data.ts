/** Mock data for development — replace with API calls in production. */

import type { Patient, ClinicalAlert, WeeklyProgress, DerivedMetrics } from "@/types";

function makeMetrics(overrides: Partial<DerivedMetrics> = {}): DerivedMetrics {
  return {
    patient_id: "",
    date: "2026-03-21",
    computed_at: new Date().toISOString(),
    sleep_efficiency: 88,
    tib_action: "hold",
    new_tib_min: 420,
    sleep_debt_index: 25,
    circadian_alignment: 72,
    chronotype_offset_h: 0.5,
    social_jetlag_h: 1.2,
    arousal_index: 35,
    arousal_subtype: "frequency",
    cbti_readiness: 68,
    active_module: "sleep_restriction",
    module_confidence: "medium",
    trajectory: 0.45,
    predicted_isi_w6: 9,
    on_track: true,
    ...overrides,
  };
}

export const MOCK_PATIENTS: Patient[] = [
  {
    id: "pt-001",
    name: "Sarah Chen",
    email: "sarah.c@example.com",
    enrolled_at: "2026-02-10",
    wearable: "oura",
    current_module: "Sleep Restriction",
    week: 4,
    latest_metrics: makeMetrics({ patient_id: "pt-001", sleep_efficiency: 91, trajectory: 0.62, on_track: true }),
  },
  {
    id: "pt-002",
    name: "Michael Torres",
    email: "m.torres@example.com",
    enrolled_at: "2026-02-17",
    wearable: "apple_health",
    current_module: "Stimulus Control",
    week: 3,
    latest_metrics: makeMetrics({
      patient_id: "pt-002",
      sleep_efficiency: 78,
      sleep_debt_index: 55,
      arousal_index: 65,
      trajectory: -0.15,
      on_track: false,
    }),
  },
  {
    id: "pt-003",
    name: "Priya Patel",
    email: "priya.p@example.com",
    enrolled_at: "2026-01-20",
    wearable: "oura",
    current_module: "Cognitive Restructuring",
    week: 6,
    latest_metrics: makeMetrics({
      patient_id: "pt-003",
      sleep_efficiency: 93,
      sleep_debt_index: 12,
      circadian_alignment: 85,
      arousal_index: 18,
      trajectory: 0.78,
      predicted_isi_w6: 5,
      on_track: true,
    }),
  },
  {
    id: "pt-004",
    name: "James Kim",
    email: "james.k@example.com",
    enrolled_at: "2026-03-03",
    wearable: "health_connect",
    current_module: "Sleep Hygiene",
    week: 2,
    latest_metrics: makeMetrics({
      patient_id: "pt-004",
      sleep_efficiency: 72,
      sleep_debt_index: 68,
      circadian_alignment: 45,
      arousal_index: 52,
      cbti_readiness: 40,
      trajectory: -0.4,
      predicted_isi_w6: 18,
      on_track: false,
    }),
  },
  {
    id: "pt-005",
    name: "Emma Wilson",
    email: "emma.w@example.com",
    enrolled_at: "2026-02-24",
    wearable: "oura",
    current_module: "Sleep Restriction",
    week: 3,
    latest_metrics: makeMetrics({ patient_id: "pt-005", sleep_efficiency: 86, trajectory: 0.22, on_track: true }),
  },
];

export const MOCK_ALERTS: ClinicalAlert[] = [
  {
    id: "alert-1",
    patient_id: "pt-002",
    patient_name: "Michael Torres",
    type: "high_arousal",
    severity: "warning",
    message: "Arousal index elevated for 3 consecutive nights",
    value: 65,
    threshold: 60,
    created_at: "2026-03-21T08:00:00Z",
    acknowledged: false,
  },
  {
    id: "alert-2",
    patient_id: "pt-004",
    patient_name: "James Kim",
    type: "off_track",
    severity: "critical",
    message: "Recovery trajectory negative — predicted ISI week 6: 18 (severe)",
    value: -0.4,
    threshold: -0.3,
    created_at: "2026-03-21T08:00:00Z",
    acknowledged: false,
  },
  {
    id: "alert-3",
    patient_id: "pt-004",
    patient_name: "James Kim",
    type: "low_efficiency",
    severity: "warning",
    message: "Sleep efficiency below 75% for 5 of last 7 nights",
    value: 72,
    threshold: 75,
    created_at: "2026-03-20T08:00:00Z",
    acknowledged: false,
  },
  {
    id: "alert-4",
    patient_id: "pt-002",
    patient_name: "Michael Torres",
    type: "isi_increase",
    severity: "critical",
    message: "ISI score increased by 4 points since last assessment",
    value: 16,
    threshold: 3,
    created_at: "2026-03-19T08:00:00Z",
    acknowledged: true,
  },
];

export function getMockWeeklyProgress(patientId: string): WeeklyProgress[] {
  const base = patientId === "pt-003"
    ? { se: 82, hrv: 35, isi: 18 }
    : patientId === "pt-004"
    ? { se: 68, hrv: 28, isi: 20 }
    : { se: 75, hrv: 32, isi: 15 };

  return Array.from({ length: 6 }, (_, i) => ({
    week: i + 1,
    sleep_efficiency: Math.min(100, base.se + i * (patientId === "pt-004" ? 1 : 3)),
    hrv_avg: base.hrv + i * 2,
    isi_score: Math.max(0, base.isi - i * (patientId === "pt-004" ? 0.5 : 2)),
    trajectory: -0.5 + i * 0.2,
  }));
}
