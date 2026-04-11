import Link from "next/link";
import type { ClinicalAlert } from "@/types";

export function AlertCard({ alert }: { alert: ClinicalAlert }) {
  const isCritical = alert.severity === "critical";

  return (
    <div
      className={`rounded-xl border p-4 ${
        isCritical
          ? "border-red-500/30 bg-red-500/5"
          : "border-amber-500/30 bg-amber-500/5"
      } ${alert.acknowledged ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <span
            className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
              isCritical ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
            }`}
          >
            !
          </span>
          <div>
            <Link
              href={`/dashboard/${alert.patient_id}`}
              className="font-medium hover:text-indigo-400"
            >
              {alert.patient_name}
            </Link>
            <p className="mt-0.5 text-sm text-slate-300">{alert.message}</p>
            <p className="mt-1 text-xs text-slate-500">
              {new Date(alert.created_at).toLocaleDateString()} &middot;{" "}
              {alert.type.replace(/_/g, " ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isCritical
                ? "bg-red-500/10 text-red-400"
                : "bg-amber-500/10 text-amber-400"
            }`}
          >
            {alert.severity}
          </span>
          {alert.acknowledged && (
            <span className="text-xs text-slate-500">Acknowledged</span>
          )}
        </div>
      </div>
    </div>
  );
}
