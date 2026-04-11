import { getZone, ZONE_COLORS, METRIC_LABELS } from "@/lib/clinical";

interface MetricCardProps {
  metric: string;
  value: number;
  subtitle?: string;
}

export function MetricCard({ metric, value, subtitle }: MetricCardProps) {
  const zone = getZone(metric, value);
  const info = METRIC_LABELS[metric];

  if (!info) return null;

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900 p-5`}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-400">{info.label}</p>
        <span className={`h-2 w-2 rounded-full ${ZONE_COLORS[zone].dot}`} />
      </div>
      <p className={`text-3xl font-bold ${ZONE_COLORS[zone].text}`}>
        {metric === "trajectory" ? value.toFixed(2) : value}
        <span className="ml-1 text-sm font-normal text-slate-500">{info.unit}</span>
      </p>
      <p className="mt-1 text-xs text-slate-500">{subtitle ?? info.description}</p>
    </div>
  );
}
