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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 border border-border p-3 rounded shadow-xl backdrop-blur-sm">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 border-b border-border/50 pb-1">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[11px] font-medium text-white/80">{entry.name} :</span>
              </div>
              <span className="text-[11px] font-mono font-bold" style={{ color: entry.color }}>
                {Number(entry.value).toLocaleString()} USDT
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function VolumeChart({ data }: VolumeChartProps) {
  const merged = new Map<string, { time: string; buyVolume?: number; sellVolume?: number }>();

  for (const point of data) {
    const key = point.time_bucket;
    const existing = merged.get(key) || {
      time: new Date(point.time_bucket).toLocaleString("fr-FR", {
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
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis 
          dataKey="time" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: "rgba(150, 150, 150, 0.5)" }} 
          dy={10}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: "rgba(150, 150, 150, 0.5)" }} 
          dx={-10}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
        <Legend 
          iconType="circle"
          wrapperStyle={{ paddingTop: "20px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em" }}
        />
        <Bar dataKey="buyVolume" name="Volume ACHAT" fill="#2ebd85" radius={[2, 2, 0, 0]} />
        <Bar dataKey="sellVolume" name="Volume VENTE" fill="#f6465d" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
