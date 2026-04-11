import Link from "next/link";
import { MOCK_PATIENTS, MOCK_ALERTS } from "@/lib/mock-data";
import { getZone, ZONE_COLORS } from "@/lib/clinical";
import { AlertCard } from "@/components/patients/AlertCard";

export default function OverviewPage() {
  const onTrack = MOCK_PATIENTS.filter((p) => p.latest_metrics?.on_track).length;
  const offTrack = MOCK_PATIENTS.length - onTrack;
  const activeAlerts = MOCK_ALERTS.filter((a) => !a.acknowledged);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-400">Patient overview and clinical alerts</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard label="Total Patients" value={MOCK_PATIENTS.length} />
        <SummaryCard label="On Track" value={onTrack} color="text-emerald-400" />
        <SummaryCard label="Off Track" value={offTrack} color="text-red-400" />
        <SummaryCard label="Active Alerts" value={activeAlerts.length} color="text-amber-400" />
      </div>

      {/* Alerts */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Clinical Alerts</h2>
          <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
            {activeAlerts.length} unacknowledged
          </span>
        </div>
        <div className="space-y-3">
          {MOCK_ALERTS.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      </section>

      {/* Quick patient table */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Patients</h2>
          <Link href="/dashboard/patients" className="text-sm text-indigo-400 hover:text-indigo-300">
            View all
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-400">Patient</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400">Module</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400">Week</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400">SE%</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400">Trajectory</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {MOCK_PATIENTS.map((p) => {
                const m = p.latest_metrics;
                const seZone = m ? getZone("sleep_efficiency", m.sleep_efficiency) : "amber";
                const trajZone = m ? getZone("trajectory", m.trajectory) : "amber";
                return (
                  <tr key={p.id} className="transition hover:bg-slate-900/50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/${p.id}`} className="font-medium hover:text-indigo-400">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{p.current_module}</td>
                    <td className="px-4 py-3 text-slate-400">{p.week}</td>
                    <td className="px-4 py-3">
                      <span className={ZONE_COLORS[seZone].text}>{m?.sleep_efficiency ?? "—"}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={ZONE_COLORS[trajZone].text}>{m?.trajectory.toFixed(2) ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {m?.on_track ? (
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-400">
                          On track
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs text-red-400">
                          Off track
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color ?? "text-white"}`}>{value}</p>
    </div>
  );
}
