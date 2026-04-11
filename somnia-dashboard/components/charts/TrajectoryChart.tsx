"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { WeeklyProgress } from "@/types";

interface Props {
  data: WeeklyProgress[];
}

export function TrajectoryChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: `Wk ${d.week}`,
    "Sleep Efficiency": d.sleep_efficiency,
    "ISI Score": d.isi_score,
    Trajectory: +(d.trajectory * 100).toFixed(0), // scale to 0-100 range for visibility
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
        <YAxis stroke="#64748b" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        <Line
          type="monotone"
          dataKey="Sleep Efficiency"
          stroke="#34d399"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="ISI Score"
          stroke="#f87171"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="Trajectory"
          stroke="#818cf8"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
