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
                {Number(entry.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function PriceChart({ data, forexRate, fiat = "RWF" }: PriceChartProps) {
  // Merge BUY and SELL data by time bucket
  const merged = new Map<string, { time: string; bestBuy?: number; bestSell?: number; forexRate?: number }>();

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
          domain={["auto", "auto"]} 
          dx={-10}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          iconType="circle"
          wrapperStyle={{ paddingTop: "20px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em" }}
        />
        <Line
          type="monotone"
          dataKey="bestBuy"
          name="Meilleur ACHAT"
          stroke="#2ebd85"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Line
          type="monotone"
          dataKey="bestSell"
          name="Meilleure VENTE"
          stroke="#f6465d"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        {forexRate && (
          <Line
            type="monotone"
            dataKey="forexRate"
            name={`Taux USD/${fiat}`}
            stroke="#8b5cf6"
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
            activeDot={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
