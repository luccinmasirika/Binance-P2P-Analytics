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

interface PriceDataPoint {
  time_bucket: string;
  trade_type: string;
  best_buy: number | null;
  best_sell: number | null;
  avg_price: number;
  total_volume: number;
}

interface PriceChartProps {
  data: PriceDataPoint[];
  forexRate?: number | null;
  fiat?: string;
}

export function PriceChart({ data, forexRate, fiat = "RWF" }: PriceChartProps) {
  // Merge BUY and SELL data by time bucket
  const merged = new Map<string, { time: string; bestBuy?: number; bestSell?: number; forexRate?: number }>();

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

    if (point.trade_type === "BUY" && point.best_buy) {
      existing.bestBuy = Number(point.best_buy);
    }
    if (point.trade_type === "SELL" && point.best_sell) {
      existing.bestSell = Number(point.best_sell);
    }
    if (forexRate) {
      existing.forexRate = forexRate;
    }

    merged.set(key, existing);
  }

  const chartData = Array.from(merged.values());

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="time" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="bestBuy"
          name="Best BUY"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="bestSell"
          name="Best SELL"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
        />
        {forexRate && (
          <Line
            type="monotone"
            dataKey="forexRate"
            name={`Taux officiel USD/${fiat}`}
            stroke="#8b5cf6"
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
