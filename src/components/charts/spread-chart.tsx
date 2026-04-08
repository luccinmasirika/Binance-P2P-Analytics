"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SpreadDataPoint {
  time_bucket: string;
  spread: number;
  best_buy: number;
  best_sell: number;
}

interface SpreadChartProps {
  data: SpreadDataPoint[];
  fiat?: string;
}

export function SpreadChart({ data, fiat = "RWF" }: SpreadChartProps) {
  const chartData = data.map((d) => ({
    time: new Date(d.time_bucket).toLocaleString("fr-RW", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    spread: Number(d.spread),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="time" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value) => [`${Number(value).toFixed(2)} ${fiat}`, "Spread"]}
        />
        <Area
          type="monotone"
          dataKey="spread"
          stroke="#f59e0b"
          fill="#f59e0b"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
