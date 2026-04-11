"use client";

import { use } from "react";
import Link from "next/link";
import { MOCK_PATIENTS, getMockWeeklyProgress } from "@/lib/mock-data";
import { getZone, ZONE_COLORS, METRIC_LABELS, getISISeverity } from "@/lib/clinical";
import { TrajectoryChart } from "@/components/charts/TrajectoryChart";
import { MetricCard } from "@/components/patients/MetricCard";

export default function PatientDetailPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const patient = MOCK_PATIENTS.find((p) => p.id === patientId);

  if (!patient) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-slate-400">Patient not found</p>
      </div>
    );
  }

  const m = patient.latest_metrics;
  const weekly = getMockWeeklyProgress(patientId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/patients" className="text-sm text-slate-400 hover:text-slate-300">
            &larr; Patients
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{patient.name}</h1>
          <p className="text-sm text-slate-400">
            Week {patient.week} &middot; {patient.current_module} &middot; Enrolled{" "}
            {new Date(patient.enrolled_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              m?.on_track
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {m?.on_track ? "On Track" : "Off Track"}
          </span>
          <span className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-400">
            {patient.wearable === "oura"
              ? "Oura Ring"
              : patient.wearable === "apple_health"
              ? "Apple Health"
              : patient.wearable === "health_connect"
              ? "Health Connect"
              : "No wearable"}
          </span>
        </div>
      </div>

      {/* Metric cards */}
      {m && (
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            metric="sleep_efficiency"
            value={m.sleep_efficiency}
            subtitle={`TIB action: ${m.tib_action.replace("_", " ")} (${m.new_tib_min}min)`}
          />
          <MetricCard
            metric="sleep_debt_index"
            value={m.sleep_debt_index}
          />
          <MetricCard
            metric="circadian_alignment"
            value={m.circadian_alignment}
            subtitle={`Jetlag: ${m.social_jetlag_h}h / Offset: ${m.chronotype_offset_h}h`}
          />
          <MetricCard
            metric="arousal_index"
            value={m.arousal_index}
            subtitle={`Subtype: ${m.arousal_subtype}`}
          />
          <MetricCard
            metric="cbti_readiness"
            value={m.cbti_readiness}
            subtitle={`Module: ${m.active_module.replace(/_/g, " ")} (${m.module_confidence})`}
          />
          <MetricCard
            metric="trajectory"
            value={m.trajectory}
            subtitle={`Predicted ISI wk6: ${m.predicted_isi_w6} (${getISISeverity(m.predicted_isi_w6)})`}
          />
        </div>
      )}

      {/* Trajectory chart */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">Recovery Trajectory</h2>
        <TrajectoryChart data={weekly} />
      </section>

      {/* Weekly history table */}
      <section className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-400">Week</th>
              <th className="px-4 py-3 text-left font-medium text-slate-400">Sleep Efficiency</th>
              <th className="px-4 py-3 text-left font-medium text-slate-400">HRV Avg</th>
              <th className="px-4 py-3 text-left font-medium text-slate-400">ISI Score</th>
              <th className="px-4 py-3 text-left font-medium text-slate-400">Trajectory</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {weekly.map((w) => (
              <tr key={w.week}>
                <td className="px-4 py-3 font-medium">Week {w.week}</td>
                <td className="px-4 py-3">
                  <span className={ZONE_COLORS[getZone("sleep_efficiency", w.sleep_efficiency)].text}>
                    {w.sleep_efficiency.toFixed(0)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">{w.hrv_avg.toFixed(0)} ms</td>
                <td className="px-4 py-3">
                  <span className={ZONE_COLORS[getZone("isi_score", w.isi_score)].text}>
                    {w.isi_score.toFixed(0)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={ZONE_COLORS[getZone("trajectory", w.trajectory)].text}>
                    {w.trajectory.toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
