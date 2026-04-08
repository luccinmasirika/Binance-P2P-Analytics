"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface VolumeDataPoint {
  time_bucket: string;
  trade_type: string;
  total_volume: number;
}

interface VolumeChartProps {
  data: VolumeDataPoint[];
}

export function VolumeChart({ data }: VolumeChartProps) {
  const merged = new Map<string, { time: string; buyVolume?: number; sellVolume?: number }>();

  for (const point of data) {
    const key = point.time_bucket;
    const existing = merged.get(key) || {
      time: new Date(point.time_bucket).toLocaleString("fr-RW", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    if (point.trade_type === "BUY") existing.buyVolume = Number(point.total_volume);
    if (point.trade_type === "SELL") existing.sellVolume = Number(point.total_volume);

    merged.set(key, existing);
  }

  const chartData = Array.from(merged.values());

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="time" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="buyVolume" name="BUY Volume (USDT)" fill="#22c55e" />
        <Bar dataKey="sellVolume" name="SELL Volume (USDT)" fill="#ef4444" />
      </BarChart>
    </ResponsiveContainer>
  );
}
