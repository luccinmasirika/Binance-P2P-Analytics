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
  ReferenceLine,
} from "recharts";

interface DepthDataPoint {
  tradeType: string;
  priceLevel: string;
  totalQuantity: string;
  adCount: number;
}

interface DepthChartProps {
  data: DepthDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 border border-border p-3 rounded shadow-xl backdrop-blur-sm">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 border-b border-border/50 pb-1">Prix : {label}</p>
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

export function DepthChart({ data }: DepthChartProps) {
  const buyData = data
    .filter((d) => d.tradeType === "BUY")
    .map((d) => ({
      price: Number(d.priceLevel),
      volume: Number(d.totalQuantity),
      ads: d.adCount,
    }))
    .sort((a, b) => a.price - b.price);

  const sellData = data
    .filter((d) => d.tradeType === "SELL")
    .map((d) => ({
      price: Number(d.priceLevel),
      volume: -Number(d.totalQuantity), // negative for visual separation
      ads: d.adCount,
    }))
    .sort((a, b) => a.price - b.price);

  const chartData = [...buyData, ...sellData]
    .sort((a, b) => a.price - b.price)
    .map((d) => ({
      price: d.price.toFixed(2),
      buyVolume: d.volume > 0 ? d.volume : undefined,
      sellVolume: d.volume < 0 ? Math.abs(d.volume) : undefined,
    }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis 
          dataKey="price" 
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
        <Bar dataKey="buyVolume" name="ACHAT (USDT)" fill="#2ebd85" stackId="a" radius={[2, 2, 0, 0]} />
        <Bar dataKey="sellVolume" name="VENTE (USDT)" fill="#f6465d" stackId="b" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
