import Link from "next/link";
import { MOCK_PATIENTS } from "@/lib/mock-data";
import { getZone, ZONE_COLORS, METRIC_LABELS } from "@/lib/clinical";

export default function PatientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Patients</h1>
        <p className="text-sm text-slate-400">{MOCK_PATIENTS.length} enrolled in CBT-I program</p>
      </div>

      <div className="grid gap-4">
        {MOCK_PATIENTS.map((p) => {
          const m = p.latest_metrics;
          return (
            <Link
              key={p.id}
              href={`/dashboard/${p.id}`}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-sm text-slate-400">
                    Week {p.week} &middot; {p.current_module} &middot;{" "}
                    {p.wearable === "oura" ? "Oura Ring" : p.wearable === "apple_health" ? "Apple Health" : "Health Connect"}
                  </p>
                </div>
                {m?.on_track ? (
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                    On track
                  </span>
                ) : (
                  <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
                    Off track
                  </span>
                )}
              </div>

              {m && (
                <div className="grid grid-cols-6 gap-3">
                  {(["sleep_efficiency", "sleep_debt_index", "circadian_alignment", "arousal_index", "cbti_readiness", "trajectory"] as const).map(
                    (key) => {
                      const value = m[key as keyof typeof m] as number;
                      const zone = getZone(key, value);
                      const info = METRIC_LABELS[key];
                      return (
                        <div key={key} className={`rounded-lg p-3 ${ZONE_COLORS[zone].bg}`}>
                          <p className="text-xs text-slate-400">{info.label}</p>
                          <p className={`text-lg font-bold ${ZONE_COLORS[zone].text}`}>
                            {key === "trajectory" ? value.toFixed(2) : value}
                            <span className="text-xs font-normal">{info.unit}</span>
                          </p>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
